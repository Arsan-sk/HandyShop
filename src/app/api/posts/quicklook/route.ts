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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = page * limit;

    // Fetch user profile for location/interest boosts
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

    // Fetch blocked and muted users
    const { data: blockedRelationships } = await supabase
      .from("blocked_users")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    const blockedUserIds = new Set<string>();
    blockedRelationships?.forEach((r) => {
      blockedUserIds.add(r.blocker_id);
      blockedUserIds.add(r.blocked_id);
    });

    const { data: mutes } = await supabase
      .from("muted_users")
      .select("muted_id")
      .eq("muter_id", user.id);
    const mutedUserIds = mutes?.map((m) => m.muted_id) || [];

    const excludedUserIds = new Set([...Array.from(blockedUserIds), ...mutedUserIds]);

    // Query active QuickLook vertical videos
    let quicklookQuery = supabase
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
          avatar_url,
          follower_count
        ),
        media:post_media(
          id,
          media_url,
          media_type,
          aspect_ratio,
          duration_seconds,
          file_size_bytes
        ),
        products:post_products(
          id,
          product_id,
          product:products(
            id,
            title,
            price,
            stock,
            category_id,
            status,
            images:product_images(id, image_url)
          )
        )
      `)
      .eq("status", "active")
      .eq("is_quicklook", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (excludedUserIds.size > 0) {
      quicklookQuery = quicklookQuery.not("user_id", "in", `(${Array.from(excludedUserIds).join(",")})`);
    }

    const { data: videos, error: queryError } = await quicklookQuery;

    if (queryError) {
      console.error("[QuickLook GET] Query error:", queryError);
      return NextResponse.json({ message: "Failed to fetch QuickLook feed" }, { status: 500 });
    }

    const videoIds = (videos || []).map((v) => v.id);
    let appreciates: any[] = [];
    let picks: any[] = [];

    if (videoIds.length > 0) {
      const { data: appreciatesData } = await supabase
        .from("appreciates")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", videoIds);
      appreciates = appreciatesData || [];

      const { data: picksData } = await supabase
        .from("picks")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", videoIds);
      picks = picksData || [];
    }

    const appreciatedSet = new Set(appreciates.map((a) => a.post_id));
    const pickedSet = new Set(picks.map((p) => p.post_id));

    // Map and score posts dynamically using QuickLook algorithm
    const scoredVideos = (videos || []).map((video) => {
      let score = 0;

      // 1. Recency Decay (weight: up to 1000 points)
      const ageHours = (Date.now() - new Date(video.created_at).getTime()) / (1000 * 60 * 60);
      const recencyScore = 1000 / (1 + ageHours * 0.05); // slightly slower decay for videos
      score += recencyScore;

      // 2. Follower Boost (+400 points)
      if (followedIds.includes(video.user_id)) {
        score += 400;
      }

      // 3. Category/Interest Boost (+300 points)
      const userInterests = userProfile?.interests || [];
      if (userInterests.length > 0) {
        const matchesInterest = video.products?.some((pp: any) =>
          pp.product && userInterests.includes(pp.product.category_id)
        );
        if (matchesInterest) {
          score += 300;
        }
      }

      // 4. Location Proximity (+250 points)
      if (
        userProfile?.latitude &&
        userProfile?.longitude &&
        video.latitude &&
        video.longitude
      ) {
        // Approximate distance
        const latDiff = Math.abs(userProfile.latitude - video.latitude);
        const lngDiff = Math.abs(userProfile.longitude - video.longitude);
        const approxDist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        if (approxDist < 0.1) {
          // Within ~10-15 km
          score += 250;
        }
      } else if (userProfile?.city && video.city && userProfile.city === video.city) {
        score += 150;
      }

      // 5. Engagement Velocity (weight: up to 1500 points)
      // Velocity = (Appreciates + Comments * 2 + Shares * 3) / Views
      const views = video.view_count || 0;
      const engagementVolume =
        (video.appreciate_count || 0) +
        (video.comment_count || 0) * 2 +
        (video.share_count || 0) * 3;

      if (views > 0) {
        const engagementVelocity = engagementVolume / views;
        score += Math.min(engagementVelocity * 1000, 1500); // capped at 1500
      } else {
        // Cold-start boost: give new videos with 0 views a boost (+500 points)
        // to help them get indexed and shown in feeds
        score += 500;
      }

      return {
        ...video,
        is_appreciated: appreciatedSet.has(video.id),
        is_picked: pickedSet.has(video.id),
        media: video.media || [],
        products: video.products || [],
        algorithm_score: score,
      };
    });

    // Sort by final score descending
    const rankedVideos = scoredVideos.sort((a, b) => b.algorithm_score - a.algorithm_score);

    // Apply pagination
    const paginatedVideos = rankedVideos.slice(offset, offset + limit);

    return NextResponse.json(
      {
        videos: paginatedVideos,
        page,
        limit,
        total: rankedVideos.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[QuickLook GET] Exception:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
