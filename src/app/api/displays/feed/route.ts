import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DisplayWithDetails } from "@/types";

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

    // Get non-expired displays from followed users, sorted by recency
    const { data: displays, error: displayError } = await supabase
      .from("displays")
      .select(
        `
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
      `
      )
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(20);

    if (displayError) {
      console.error("[Display Get] Error:", displayError);
      return NextResponse.json(
        { message: "Failed to fetch displays" },
        { status: 500 }
      );
    }

    // Check which displays the user has viewed
    const { data: viewedDisplays } = await supabase
      .from("display_views")
      .select("display_id")
      .eq("viewer_id", user.id);

    const viewedIds = new Set(viewedDisplays?.map((v) => v.display_id) || []);

    // Transform data
    const transformedDisplays: DisplayWithDetails[] = (displays || [])
      .map(
        (d: any) => ({
          ...d,
          is_viewed: viewedIds.has(d.id),
          user: Array.isArray(d.user) ? d.user[0] : d.user,
          media: d.media || [],
        })
      )
      .filter((d) => d.user && d.user.username); // Only include displays with valid user data

    return NextResponse.json({
      displays: transformedDisplays,
    });
  } catch (err) {
    console.error("[Display Get] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
