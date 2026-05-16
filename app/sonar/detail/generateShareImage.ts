export async function generateShareImage({
  title,
  subtitle,
  note,
  added,
  score,
  image,
  isDarkMode,
  randomColor,
}: {
  title: string;
  subtitle: string;
  note: string;
  added: boolean;
  score: number;
  image?: string | null;
  isDarkMode: boolean;
  randomColor: string;
}): Promise<string> {
  const hasNote = added && note?.trim().length > 0;
  const logicalW = 360;
  const logicalH = hasNote ? 680 : added ? 600 : 520;
  const exportWidth = 1080;
  const exportScale = exportWidth / logicalW;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(logicalW * exportScale * dpr);
  canvas.height = Math.round(logicalH * exportScale * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas context");

  ctx.scale(exportScale * dpr, exportScale * dpr);

  const W = logicalW;
  const H = logicalH;

  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  const truncate = (text: string, maxW: number) => {
    if (ctx.measureText(text).width <= maxW) return text;

    let t = text;
    while (ctx.measureText(t + "\u2026").width > maxW && t.length > 0) {
      t = t.slice(0, -1);
    }
    return t + "\u2026";
  };

  const wrapText = (
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines = 3
  ) => {
    const words = text.split(" ");
    let line = "";
    let lines = 0;

    for (const word of words) {
      const testLine = line + word + " ";
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines++;
        if (lines === maxLines) {
          let finalLine = line.trim();
          while (ctx.measureText(finalLine + "\u2026").width > maxWidth && finalLine.length > 0) {
            finalLine = finalLine.slice(0, -1);
          }
          ctx.fillText(finalLine + "\u2026", x, y);
          return;
        }
        ctx.fillText(line.trim(), x, y);
        line = word + " ";
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line.trim()) ctx.fillText(line.trim(), x, y);
  };

  // Score color helper (duplicated from DetailClient)
  const scoreToColor = (s: number) => {
    const t = Math.min(Math.max(s, 0), 10) / 10;
    if (t <= 0.5) {
      const ss = t * 2;
      const r = Math.round(220 + (255 - 220) * (1 - ss));
      const g = Math.round(70 + (185 - 70) * ss);
      const b = Math.round(50 + (30 - 50) * ss);
      return `rgb(${r},${g},${b})`;
    } else {
      const ss = (t - 0.5) * 2;
      const r = Math.round(255 - (255 - 80) * ss);
      const g = Math.round(185 + (210 - 185) * ss);
      const b = Math.round(30 + (80 - 30) * ss);
      return `rgb(${r},${g},${b})`;
    }
  };

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, isDarkMode ? "#7C3AED" : "#A78BFA");
  bg.addColorStop(0.42, isDarkMode ? "#171717" : "#F4F0FF");
  bg.addColorStop(1, isDarkMode ? "#050505" : "#EDE9FE");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative blobs
  const blob1 = ctx.createRadialGradient(40, 40, 0, 40, 40, 180);
  blob1.addColorStop(0, `${randomColor}66`);
  blob1.addColorStop(1, "transparent");
  ctx.fillStyle = blob1;
  ctx.fillRect(0, 0, W, 260);

  const blob2 = ctx.createRadialGradient(W - 40, H - 80, 0, W - 40, H - 80, 220);
  blob2.addColorStop(0, `${randomColor}44`);
  blob2.addColorStop(1, "transparent");
  ctx.fillStyle = blob2;
  ctx.fillRect(0, H - 260, W, 260);

  // Main card
  const cardX = 18;
  const cardY = 36;
  const cardW = W - 36;
  const footerGap = 56;
  const cardH = Math.max(220, Math.round(H - cardY - footerGap));

  ctx.fillStyle = isDarkMode ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.96)";
  rr(cardX, cardY, cardW, cardH, 28);
  ctx.fill();

  // Soft stroke
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  rr(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1, 28);
  ctx.stroke();

  // Album art
  const artSize = added ? 222 : 230;
  const artX = Math.round((W - artSize) / 2);
  const artY = cardY + 28;

  if (image) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
        img.src = image as string;
      });
      ctx.save();
      rr(artX, artY, artSize, artSize, 24);
      ctx.clip();
      ctx.drawImage(img, artX, artY, artSize, artSize);
      ctx.restore();
    } catch {
      ctx.fillStyle = `${randomColor}44`;
      rr(artX, artY, artSize, artSize, 24);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = `${randomColor}44`;
    rr(artX, artY, artSize, artSize, 24);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  rr(artX, artY, artSize, artSize, 24);
  ctx.stroke();

  // Song info
  const titleY = artY + artSize + 36;
  const subtitleY = titleY + 24;

  ctx.fillStyle = "#111";
  ctx.textAlign = "center";
  ctx.font = `900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(truncate(title, W - 72), W / 2, titleY);

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = `700 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText(truncate(subtitle, W - 82), W / 2, subtitleY);

  // Score
  if (added) {
    const scoreColor = scoreToColor(score);
    const scoreBoxX = 52;
    const scoreBoxY = subtitleY + 30;
    const scoreBoxW = W - 104;
    const scoreBoxH = 72;

    const scoreBg = isDarkMode ? 'rgba(255,255,255,0.06)' : `${randomColor}22`;
    ctx.fillStyle = scoreBg;
    rr(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 22);
    ctx.fill();
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.8;
    rr(scoreBoxX, scoreBoxY, scoreBoxW, scoreBoxH, 22);
    ctx.stroke();

    ctx.fillStyle = scoreColor;
    ctx.textAlign = "center";
    ctx.font = `900 36px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const displayScore = Number.isInteger(score) ? score.toFixed(0) : score.toFixed(1);
    ctx.fillText(displayScore, W / 2, scoreBoxY + 42);

    ctx.fillStyle = "#111";
    ctx.font = `800 10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText("MI PUNTUACIÓN", W / 2, scoreBoxY + 59);

    if (hasNote) {
      const noteX = 38;
      const noteY = scoreBoxY + scoreBoxH + 22;
      const noteW = W - 76;
      const noteH = 100;

      ctx.fillStyle = "rgba(0,0,0,0.06)";
      rr(noteX, noteY, noteW, noteH, 20);
      ctx.fill();

      ctx.fillStyle = "#111";
      ctx.textAlign = "left";
      ctx.font = `italic 400 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

      wrapText(`“${note.trim()}”`, noteX + 18, noteY + 34, noteW - 36, 18, 3);
    }
  }

  // Footer
  ctx.fillStyle = isDarkMode ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.42)";
  ctx.textAlign = "center";
  ctx.font = `800 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  ctx.fillText("shared with sonar", W / 2, H - 24);

  return canvas.toDataURL("image/png");
}
