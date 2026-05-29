import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const { username } = await params;

    if (!username) {
      return NextResponse.json(
        { message: "Username parameter is required" },
        { status: 400 }
      );
    }

    // 1. Get authenticated user (optional, needed to check is_following status)
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // 2. Query target user details
    const { data: targetUser, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        username,
        display_name,
        email,
        avatar_url,
        bio,
        role,
        city,
        area,
        latitude,
        longitude,
        interests,
        post_count,
        follower_count,
        following_count,
        created_at,
        updated_at
      `)
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (userError || !targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // 3. Query seller profile (if target is a seller)
    let sellerProfile = null;
    if (targetUser.role === "seller") {
      const { data: sellerData } = await supabase
        .from("seller_profiles")
        .select(`
          id,
          shop_name,
          shop_description,
          category_id,
          shop_city,
          shop_area,
          shop_latitude,
          shop_longitude,
          is_verified,
          category:categories(name)
        `)
        .eq("user_id", targetUser.id)
        .maybeSingle();
      sellerProfile = sellerData;
    }

    // 4. Check if current user is following target user
    let isFollowing = false;
    if (currentUser && currentUser.id !== targetUser.id) {
      const { data: followRecord } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetUser.id)
        .maybeSingle();
      isFollowing = !!followRecord;
    }

    // 5. Query active public posts of the target user
    const { data: posts, error: postsError } = await supabase
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
        media:post_media(
          id,
          media_url,
          media_type,
          aspect_ratio,
          display_order
        )
      `)
      .eq("user_id", targetUser.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    // Format posts media
    const formattedPosts = (posts || []).map((post) => ({
      ...post,
      media: post.media || [],
    }));

    // 6. Query target user's active products (if seller)
    let products: any[] = [];
    if (targetUser.role === "seller") {
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          id,
          seller_id,
          title,
          description,
          price,
          stock,
          category_id,
          variants,
          sizes,
          delivery_info,
          status,
          images:product_images(
            id,
            image_url,
            display_order
          )
        `)
        .eq("seller_id", targetUser.id)
        .eq("status", "active")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      
      products = (productsData || []).map((prod) => ({
        ...prod,
        images: prod.images || [],
      }));
    }

    return NextResponse.json(
      {
        profile: {
          ...targetUser,
          seller_profile: sellerProfile,
        },
        is_following: isFollowing,
        posts: formattedPosts,
        products: products,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Get User Profile] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
