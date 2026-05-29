import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const { username } = await params;

    // 1. Fetch target user
    const { data: targetUser } = await supabase
      .from("users")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // 2. Fetch logged in user (optional)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // 3. Query following
    const { data: following, error } = await supabase
      .from("follows")
      .select(`
        created_at,
        following:users!follows_following_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          city,
          area
        )
      `)
      .eq("follower_id", targetUser.id);

    if (error) {
      console.error("[Get Following] DB error:", error);
      return NextResponse.json({ message: "DB error" }, { status: 500 });
    }

    const followingList = following?.map((f: any) => f.following).filter(Boolean) || [];

    // 4. Check if current user follows each user in the list
    let formattedFollowing = followingList;
    if (currentUser) {
      const followingIds = followingList.map((f: any) => f.id);
      const { data: activeFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .in("following_id", followingIds.length > 0 ? followingIds : ["00000000-0000-0000-0000-000000000000"]);
      
      const activeFollowsSet = new Set(activeFollows?.map((af) => af.following_id) || []);

      formattedFollowing = followingList.map((f: any) => ({
        ...f,
        is_following: activeFollowsSet.has(f.id),
        is_self: f.id === currentUser.id,
      }));
    }

    return NextResponse.json({ following: formattedFollowing }, { status: 200 });
  } catch (err) {
    console.error("[Get Following] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
