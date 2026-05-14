import { NextRequest, NextResponse } from "next/server";
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

    const { user } = session;
    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
