import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const { provider } = await request.json();

  const cookieStore = await cookies();

  if (provider === "supabase") {
    cookieStore.delete("supabase_access_token");
    cookieStore.delete("supabase_refresh_token");
  } else if (provider === "github") {
    cookieStore.delete("github_access_token");
  }

  return NextResponse.json({ success: true });
}
