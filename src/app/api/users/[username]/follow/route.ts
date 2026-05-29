import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const { username } = await params;

    // 1. Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Query target user details
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 3. User cannot follow themselves
    if (currentUser.id === targetUser.id) {
      return NextResponse.json(
        { message: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    // 4. Check if follow relation already exists
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUser.id)
      .eq("following_id", targetUser.id)
      .maybeSingle();

    let isFollowingNow = false;

    if (existingFollow) {
      // Unfollow: delete follow record
      const { error: deleteError } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUser.id);

      if (deleteError) {
        console.error("[Follow Toggle] Unfollow error:", deleteError);
        return NextResponse.json(
          { message: "Failed to unfollow user" },
          { status: 500 }
        );
      }
      isFollowingNow = false;
    } else {
      // Follow: insert follow record
      const { error: insertError } = await supabase
        .from("follows")
        .insert({
          follower_id: currentUser.id,
          following_id: targetUser.id,
        });

      if (insertError) {
        console.error("[Follow Toggle] Follow error:", insertError);
        return NextResponse.json(
          { message: "Failed to follow user" },
          { status: 500 }
        );
      }
      isFollowingNow = true;

      // Log notification/activity event in analytics_events
      await supabase.from("analytics_events").insert({
        actor_id: currentUser.id,
        target_user_id: targetUser.id,
        event_type: "follow",
        metadata: {},
      });
    }

    // Fetch updated follower count directly from database to avoid client-side race conditions or stale counters
    const { data: updatedTarget } = await supabase
      .from("users")
      .select("follower_count")
      .eq("id", targetUser.id)
      .single();

    return NextResponse.json(
      {
        message: isFollowingNow ? "Followed successfully" : "Unfollowed successfully",
        is_following: isFollowingNow,
        follower_count: updatedTarget?.follower_count ?? 0,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Follow Toggle] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
