import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotifications, markNotificationsAsRead } from "@/lib/notifications-db";

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

    const notifications = await getNotifications(user.id);

    return NextResponse.json({
      notifications: notifications || [],
    }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/notifications] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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

    const { notificationId } = await request.json().catch(() => ({}));

    // If a specific notificationId is passed, we could mark just that one.
    // Otherwise, mark all notifications as read.
    await markNotificationsAsRead(user.id);

    return NextResponse.json({
      message: "Notifications marked as read",
    }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/notifications] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
