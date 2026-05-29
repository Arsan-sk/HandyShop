import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: any
) {
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

    const params = await context?.params;
    const displayId = params?.displayId;

    if (!displayId) {
      return NextResponse.json({ message: "Display ID is required" }, { status: 400 });
    }

    // Verify the current user owns this display
    const { data: display, error: displayErr } = await supabase
      .from("displays")
      .select("user_id")
      .eq("id", displayId)
      .single();

    if (displayErr || !display) {
      return NextResponse.json({ message: "Display not found" }, { status: 404 });
    }

    if (display.user_id !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Fetch display views with user profiles
    const { data: views, error: viewsErr } = await supabase
      .from("display_views")
      .select(`
        viewed_at,
        user:users (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("display_id", displayId)
      .order("viewed_at", { ascending: false });

    if (viewsErr) {
      console.error("[Display Viewers] Error:", viewsErr);
      return NextResponse.json({ message: "Failed to fetch viewers" }, { status: 500 });
    }

    // Transform and return list of users
    const viewers = (views || [])
      .map((v: any) => ({
        viewed_at: v.viewed_at,
        user: Array.isArray(v.user) ? v.user[0] : v.user,
      }))
      .filter((v) => v.user !== null);

    return NextResponse.json({ viewers });
  } catch (err) {
    console.error("[Display Viewers] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
