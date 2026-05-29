import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const now = new Date().toISOString();

    // Fetch expired displays for this user
    const { data: displays, error: displayErr } = await supabase
      .from("displays")
      .select(`
        id,
        user_id,
        source_post_id,
        expires_at,
        view_count,
        created_at,
        user:users (
          id,
          username,
          avatar_url,
          display_name
        ),
        media:display_media (
          id,
          display_id,
          media_url,
          media_type,
          duration_seconds,
          display_order,
          created_at
        )
      `)
      .eq("user_id", user.id)
      .lte("expires_at", now)
      .order("created_at", { ascending: false });

    if (displayErr) {
      console.error("[Display Archive] Error:", displayErr);
      return NextResponse.json({ message: "Failed to fetch archive" }, { status: 500 });
    }

    const transformedDisplays = (displays || []).map((d: any) => ({
      ...d,
      is_viewed: true, // archives are always "viewed" by default
      user: Array.isArray(d.user) ? d.user[0] : d.user,
      media: d.media || [],
    }));

    return NextResponse.json({ displays: transformedDisplays });
  } catch (err) {
    console.error("[Display Archive] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
