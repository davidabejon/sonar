import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("session", "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
