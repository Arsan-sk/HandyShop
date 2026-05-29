import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getNotificationPreferences, updateNotificationPreferences } from "@/lib/notifications-db";

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

    const prefs = await getNotificationPreferences(user.id);

    return NextResponse.json({
      preferences: prefs,
    }, { status: 200 });
  } catch (err) {
    console.error("[GET /api/notifications/preferences] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { follow_notifications, appreciate_notifications, comment_notifications } = body;

    const updated = await updateNotificationPreferences(user.id, {
      follow_notifications: typeof follow_notifications === "boolean" ? follow_notifications : undefined,
      appreciate_notifications: typeof appreciate_notifications === "boolean" ? appreciate_notifications : undefined,
      comment_notifications: typeof comment_notifications === "boolean" ? comment_notifications : undefined,
    });

    return NextResponse.json({
      preferences: updated,
    }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/notifications/preferences] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
