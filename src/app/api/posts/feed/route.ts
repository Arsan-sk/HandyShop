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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = page * limit;

    // Fetch user profile details for location/interest filtering
    const { data: userProfile } = await supabase
      .from("users")
      .select("city, latitude, longitude, interests")
      .eq("id", user.id)
      .single();

    // Fetch followed sellers
    const { data: follows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    const followedIds = follows?.map((f) => f.following_id) || [];

    // Fetch top 100 active posts for ranking
    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select(
        `
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
          avatar_url,
          bio,
          city,
          area,
          post_count,
          follower_count,
          following_count
        ),
        media:post_media(
          id,
          media_url,
          media_type,
          aspect_ratio,
          display_order,
          duration_seconds
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
      `
      )
      .eq("status", "active")
      .eq("is_quicklook", false)
      .order("created_at", { ascending: false })
      .limit(100);

    if (postsError) {
      console.error("Failed to fetch posts:", postsError);
      return NextResponse.json(
        { message: "Failed to fetch posts" },
        { status: 500 }
      );
    }

    // Check which posts current user has appreciated/picked
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

    // Transform data
    const appreciatedPostIds = new Set(appreciates.map((a) => a.post_id));
    const pickedPostIds = new Set(picks.map((p) => p.post_id));

    const transformedPosts = (posts || []).map((post) => ({
      ...post,
      is_appreciated: appreciatedPostIds.has(post.id),
      is_picked: pickedPostIds.has(post.id),
      media: post.media || [],
      products: post.products || [],
    }));

    // Feed Scoring Algorithm
    const rankedPosts = transformedPosts.map((post) => {
      let score = 0;

      // 1. Recency Decay (newer is better)
      const postAgeMs = Date.now() - new Date(post.created_at).getTime();
      const postAgeHours = postAgeMs / (1000 * 60 * 60);
      const recencyScore = 1000 / (1 + postAgeHours * 0.1); 
      score += recencyScore;

      // 2. Follow Prioritization (+500 points)
      const isFollowed = followedIds.includes(post.user_id);
      if (isFollowed) {
        score += 500;
      }

      // 3. Interest Boost (+300 points)
      const userInterests = userProfile?.interests || [];
      if (userInterests.length > 0) {
        const matchesInterest = post.products?.some((pp: any) =>
          pp.product && userInterests.includes(pp.product.category_id)
        );
        if (matchesInterest) {
          score += 300;
        }
      }

      if (
        userProfile &&
        userProfile.latitude !== null &&
        userProfile.longitude !== null &&
        post.latitude !== null &&
        post.longitude !== null
      ) {
        const dist = Math.sqrt(
          Math.pow(post.latitude - userProfile.latitude, 2) +
          Math.pow(post.longitude - userProfile.longitude, 2)
        );
        const maxDistBoost = 200;
        const distanceBoost = Math.max(0, maxDistBoost - dist * 1000);
        score += distanceBoost;
      } else if (
        userProfile?.city &&
        post.city &&
        userProfile.city.toLowerCase() === post.city.toLowerCase()
      ) {
        score += 150;
      }

      // 5. Engagement Boost
      const engagement = (post.appreciate_count || 0) * 10 + (post.comment_count || 0) * 20;
      score += engagement;

      return { post, score };
    });

    // Sort by score descending
    rankedPosts.sort((a, b) => b.score - a.score);

    // Paginate from the ranked list
    const paginatedPosts = rankedPosts.slice(offset, offset + limit).map((item) => item.post);

    return NextResponse.json(
      {
        posts: paginatedPosts,
        pagination: {
          page,
          limit,
          total: rankedPosts.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/posts/feed error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
