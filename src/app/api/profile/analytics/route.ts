import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 1. Fetch user follower count
    const { data: userStats, error: statsError } = await supabase
      .from("users")
      .select("follower_count, role")
      .eq("id", user.id)
      .single();

    if (statsError || !userStats) {
      console.error("[Analytics] Profile fetch error:", statsError);
      return NextResponse.json(
        { message: "Failed to fetch profile statistics" },
        { status: 500 }
      );
    }

    // 2. Fetch sum of appreciate_count and pick_count across all own posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("appreciate_count, pick_count, view_count")
      .eq("user_id", user.id);

    let totalAppreciates = 0;
    let totalPicks = 0;
    let totalPostViewsDb = 0;

    if (!postsError && postsData) {
      postsData.forEach((post) => {
        totalAppreciates += post.appreciate_count || 0;
        totalPicks += post.pick_count || 0;
        totalPostViewsDb += post.view_count || 0;
      });
    }

    // 3. Query analytics events matching target_user_id
    const { data: events, error: eventsError } = await supabase
      .from("analytics_events")
      .select("event_type")
      .eq("target_user_id", user.id);

    let profileViews = 0;
    let postViews = 0;
    let productClicks = 0;
    let mapOpens = 0;

    if (!eventsError && events) {
      events.forEach((evt) => {
        if (evt.event_type === "profile_view") profileViews++;
        else if (evt.event_type === "post_view") postViews++;
        else if (evt.event_type === "product_click") productClicks++;
        else if (evt.event_type === "map_open") mapOpens++;
      });
    }

    // Fallback views: if DB analytics events are sparse, use the sum of post views
    if (postViews === 0 && totalPostViewsDb > 0) {
      postViews = totalPostViewsDb;
    }

    return NextResponse.json(
      {
        analytics: {
          profile_views: profileViews,
          post_views: postViews,
          appreciates: totalAppreciates,
          picks: totalPicks,
          product_clicks: productClicks,
          map_opens: mapOpens,
          follower_count: userStats.follower_count,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Profile Analytics GET] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
