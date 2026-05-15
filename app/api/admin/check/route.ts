import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/app/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("session")?.value;
    if (!token) {
      return NextResponse.json({ isAdmin: false });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ isAdmin: false });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const isAdmin = session.user.username === adminUsername;

    return NextResponse.json({ isAdmin, username: session.user.username });
  } catch (error) {
    console.error("Error checking admin:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
