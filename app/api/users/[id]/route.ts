import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { isAdmin, hashPassword } from "@/app/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token || !(await isAdmin(token))) {
      return NextResponse.json(
        { error: "No autorizado. Solo administradores pueden editar usuarios." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { email, username, password } = body;

    // Validate that at least one field is being updated
    if (!email && !username && !password) {
      return NextResponse.json(
        { error: "Debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const updateData: any = {};

    if (email) {
      // Check if email is already taken
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail && existingEmail.id !== id) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso" },
          { status: 400 }
        );
      }
      updateData.email = email;
    }

    if (username) {
      // Check if username is already taken
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      if (existingUsername && existingUsername.id !== id) {
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso" },
          { status: 400 }
        );
      }
      updateData.username = username;
    }

    if (password) {
      updateData.password = hashPassword(password);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      message: "Usuario actualizado correctamente",
    });
  } catch (error) {
    console.error("Error updating user:", error);
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
        { error: "No autorizado. Solo administradores pueden eliminar usuarios." },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Delete user (cascades to sessions and ratings)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: `Usuario ${user.username} eliminado correctamente`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
