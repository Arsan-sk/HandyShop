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

    // 3. Query followers
    const { data: followers, error } = await supabase
      .from("follows")
      .select(`
        created_at,
        follower:users!follows_follower_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          role,
          city,
          area
        )
      `)
      .eq("following_id", targetUser.id);

    if (error) {
      console.error("[Get Followers] DB error:", error);
      return NextResponse.json({ message: "DB error" }, { status: 500 });
    }

    const followersList = followers?.map((f: any) => f.follower).filter(Boolean) || [];

    // 4. Check if current user follows each follower in the list
    let formattedFollowers = followersList;
    if (currentUser) {
      const followerIds = followersList.map((f: any) => f.id);
      const { data: activeFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUser.id)
        .in("following_id", followerIds.length > 0 ? followerIds : ["00000000-0000-0000-0000-000000000000"]);
      
      const activeFollowsSet = new Set(activeFollows?.map((af) => af.following_id) || []);

      formattedFollowers = followersList.map((f: any) => ({
        ...f,
        is_following: activeFollowsSet.has(f.id),
        is_self: f.id === currentUser.id,
      }));
    }

    return NextResponse.json({ followers: formattedFollowers }, { status: 200 });
  } catch (err) {
    console.error("[Get Followers] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
