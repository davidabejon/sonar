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
        artistName: {
          not: null,
        },
      },
      select: {
        artistName: true,
      },
      orderBy: {
        artistName: "asc",
      },
    });

    const seen = new Set<string>();
    const artists: string[] = [];

    for (const row of rows) {
      const name = row.artistName?.trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      artists.push(name);
    }

    return NextResponse.json({ items: artists });
  } catch (error) {
    console.error("Error fetching unique artist names:", error);
    return NextResponse.json({ error: "Failed to fetch artist names" }, { status: 500 });
  }
}
