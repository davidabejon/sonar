import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }

    const rows = await prisma.rating.findMany({
      where: {
        userId: session.userId,
        entryType: "track",
        albumName: {
          not: null,
        },
      },
      select: {
        albumName: true,
      },
      orderBy: {
        albumName: "asc",
      },
    });

    const seen = new Set<string>();
    const albums: string[] = [];

    for (const row of rows) {
      const name = row.albumName?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      albums.push(name);
    }

    return NextResponse.json({ items: albums });
  } catch (error) {
    console.error("Error fetching unique album names:", error);
    return NextResponse.json({ error: "Failed to fetch album names" }, { status: 500 });
  }
}
