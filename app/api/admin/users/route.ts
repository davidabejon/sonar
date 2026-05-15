import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdmin } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json(
        { error: "No autorizado. Solo administradores pueden acceder." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");
    const q = searchParams.get("q") || undefined;

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20;
    const page = pageParam ? Math.max(parseInt(pageParam, 10), 1) : 1;
    const skip = (page - 1) * limit;

    const where: any = q
      ? {
          OR: [
            { username: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        select: { id: true, email: true, username: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
