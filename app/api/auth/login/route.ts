import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyPassword, createSession } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { emailOrUsername, password } = await request.json();

    if (!emailOrUsername || !password) {
      return NextResponse.json(
        { error: "Correo electrónico/usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: emailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user || !verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: "Correo electrónico, usuario o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const session = await createSession(user.id);

    const response = NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    response.cookies.set("session", session.token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
