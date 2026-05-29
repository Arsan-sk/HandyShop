import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUnreadNotificationsCount } from "@/lib/notifications-db";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadNotificationsCount(user.id);

    return NextResponse.json({
      count: count || 0,
    }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/notifications/unread] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
