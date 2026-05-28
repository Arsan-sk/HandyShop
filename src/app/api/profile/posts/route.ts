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

    // Retrieve all user posts (active, archived, etc.)
    const { data: posts, error } = await supabase
      .from("posts")
      .select(`
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
        ),
        products:post_products(
          id,
          product_id,
          display_order,
          product:products(
            id,
            title,
            price,
            stock,
            category_id,
            status
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Profile Posts GET] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch profile posts" },
        { status: 500 }
      );
    }

    // Check appreciated/picked state for own posts
    const postIds = (posts || []).map((p) => p.id);
    let appreciates: any[] = [];
    let picks: any[] = [];

    if (postIds.length > 0) {
      const { data: appreciatesData } = await supabase
        .from("appreciates")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      appreciates = appreciatesData || [];

      const { data: picksData } = await supabase
        .from("picks")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      picks = picksData || [];
    }

    const appreciatedPostIds = new Set(appreciates.map((a) => a.post_id));
    const pickedPostIds = new Set(picks.map((p) => p.post_id));

    const formattedPosts = (posts || []).map((post) => ({
      ...post,
      is_appreciated: appreciatedPostIds.has(post.id),
      is_picked: pickedPostIds.has(post.id),
      media: post.media || [],
      products: post.products || [],
    }));

    return NextResponse.json(
      { posts: formattedPosts },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Profile Posts GET] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
