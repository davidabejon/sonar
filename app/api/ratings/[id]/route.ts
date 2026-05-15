import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdmin } from "@/app/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json(
        { error: "No autorizado. Solo administradores pueden editar ratings." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { score, notes } = body;

    // Check if rating exists
    const rating = await prisma.rating.findUnique({ where: { id } });
    if (!rating) {
      return NextResponse.json(
        { error: "Rating no encontrado" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (score !== undefined) {
      const parsedScore = typeof score === "string" ? Number(score) : score;
      if (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100) {
        return NextResponse.json(
          { error: "La puntuación debe ser un entero entre 0 y 100" },
          { status: 400 }
        );
      }
      updateData.score = parsedScore;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    const updatedRating = await prisma.rating.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...updatedRating,
      message: "Rating actualizado correctamente",
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json(
        { error: "No autorizado. Solo administradores pueden eliminar ratings." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if rating exists
    const rating = await prisma.rating.findUnique({ where: { id } });
    if (!rating) {
      return NextResponse.json(
        { error: "Rating no encontrado" },
        { status: 404 }
      );
    }

    // Delete rating
    await prisma.rating.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `Rating del usuario eliminado correctamente`,
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
