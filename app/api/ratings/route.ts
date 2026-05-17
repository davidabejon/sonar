import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSession } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }

    const userId = session.userId;
    const body = await request.json();
    const { entryId, entryType, notes, title } = body;
    const score = typeof body.score === "string" ? Number(body.score) : body.score;

    // Validate input
    if (!entryId || !entryType || score === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: entryId, entryType, score" },
        { status: 400 }
      );
    }

    if (!["track", "album", "artist"].includes(entryType)) {
      return NextResponse.json(
        { error: "Invalid entryType. Must be one of: track, album, artist" },
        { status: 400 }
      );
    }

    const parsedScore = Number.isFinite(score) ? score : Number(score);
    if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return NextResponse.json(
        { error: "La puntuación debe ser un entero entre 0 y 100" },
        { status: 400 }
      );
    }
    // use integer score 0-100
    const finalScore = parsedScore;

    // Upsert rating (create or update)
    const rating = await prisma.rating.upsert({
      where: {
        userId_entryId_entryType: {
          userId,
          entryId,
          entryType,
        },
      },
      update: {
        score: finalScore,
        notes: notes || null,
        title: title || undefined,
      },
      create: {
        userId,
        entryId,
        entryType,
        score: finalScore,
        notes: notes || null,
        title: title || null,
      },
    });

    return NextResponse.json(rating, { status: 201 });
  } catch (error) {
    console.error("Error saving rating:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

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

    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    const entryType = searchParams.get("entryType");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");
    const sort = searchParams.get("sort"); // e.g. 'score' or 'createdAt'
    const filterType = searchParams.get("filterType"); // filter by type: track, album, artist
    const minScore = searchParams.get("minScore"); // min score 0-100
    const maxScore = searchParams.get("maxScore"); // max score 0-100
    const q = searchParams.get("q"); // search query

    if (!entryId || !entryType) {
      // List ratings with optional pagination, sorting, and filters
      const take = limitParam ? parseInt(limitParam, 10) : undefined;
      const skip = offsetParam ? parseInt(offsetParam, 10) : undefined;

      const orderBy: any = {};
      if (sort === "score") orderBy.score = "desc";
      else if (sort === "createdAt") orderBy.createdAt = "desc";
      else orderBy.createdAt = "desc";

      // Build filter conditions
      const where: any = { userId };
      if (filterType && ["track", "album", "artist"].includes(filterType)) {
        where.entryType = filterType;
      }
      if (minScore !== null) {
        const min = parseInt(minScore!, 10);
        if (!isNaN(min)) where.score = { ...where.score, gte: min };
      }
      if (maxScore !== null) {
        const max = parseInt(maxScore!, 10);
        if (!isNaN(max)) where.score = { ...where.score, lte: max };
      }
      
      // Search in title or notes
      if (q) {
        where.OR = [
          { title: { contains: q } },
          { notes: { contains: q } },
          { entryId: { contains: q } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.rating.findMany({
          where,
          orderBy,
          take,
          skip,
        }),
        prisma.rating.count({ where }),
      ]);

      return NextResponse.json({ total, items });
    }

    // Return specific rating
    if (!["track", "album", "artist"].includes(entryType)) {
      return NextResponse.json(
        { error: "Invalid entryType" },
        { status: 400 }
      );
    }

    const rating = await prisma.rating.findUnique({
      where: {
        userId_entryId_entryType: {
          userId,
          entryId,
          entryType,
        },
      },
    });

    if (!rating) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    return NextResponse.json(rating);
  } catch (error) {
    console.error("Error fetching rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 401 });
    }

    const userId = session.userId;
    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entryId");
    const entryType = searchParams.get("entryType");

    if (!entryId || !entryType) {
      return NextResponse.json(
        { error: "Missing required parameters: entryId, entryType" },
        { status: 400 }
      );
    }

    if (!["track", "album", "artist"].includes(entryType)) {
      return NextResponse.json(
        { error: "Invalid entryType" },
        { status: 400 }
      );
    }

    await prisma.rating.delete({
      where: {
        userId_entryId_entryType: {
          userId,
          entryId,
          entryType,
        },
      },
    });

    return NextResponse.json(
      { message: "Rating deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Rating not found" },
        { status: 404 }
      );
    }
    console.error("Error deleting rating:", error);
    return NextResponse.json(
      { error: "Failed to delete rating" },
      { status: 500 }
    );
  }
}
