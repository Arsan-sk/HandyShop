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

    // Retrieve saved posts joining details
    const { data: picks, error } = await supabase
      .from("picks")
      .select(`
        id,
        created_at,
        post:posts(
          id,
          user_id,
          caption,
          status,
          is_quicklook,
          city,
          area,
          latitude,
          longitude,
          appreciate_count,
          pick_count,
          comment_count,
          share_count,
          view_count,
          created_at,
          updated_at,
          user:users(
            id,
            username,
            display_name,
            avatar_url
          ),
          media:post_media(
            id,
            media_url,
            media_type,
            aspect_ratio,
            display_order
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Profile Picks GET] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch saved posts" },
        { status: 500 }
      );
    }

    // Helper to safely extract single post object from join (handling array/object cases)
    const getPostObject = (postVal: any) => {
      if (!postVal) return null;
      if (Array.isArray(postVal)) return postVal[0] || null;
      return postVal;
    };

    // Transform to return a flat list of PostWithDetails
    const postIds = (picks || [])
      .map((p: any) => getPostObject(p.post)?.id)
      .filter(Boolean);
    let appreciates: any[] = [];

    if (postIds.length > 0) {
      const { data: appreciatesData } = await supabase
        .from("appreciates")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      appreciates = appreciatesData || [];
    }

    const appreciatedPostIds = new Set(appreciates.map((a) => a.post_id));

    const formattedPosts = (picks || [])
      .map((pick: any) => {
        const postObj = getPostObject(pick.post);
        if (!postObj) return null;
        return {
          ...postObj,
          is_appreciated: appreciatedPostIds.has(postObj.id),
          is_picked: true, // it's in the saves list
          media: postObj.media || [],
          products: [], // picks are simple posts display, can fallback products
        };
      })
      .filter(Boolean);

    return NextResponse.json(
      { posts: formattedPosts },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Profile Picks GET] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
