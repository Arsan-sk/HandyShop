import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/chats-db";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const unreadCount = await getUnreadCount(user.id);
    return NextResponse.json({ count: unreadCount });
  } catch (err) {
    console.error("[Unread Count GET] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
