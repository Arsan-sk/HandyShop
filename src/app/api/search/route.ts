import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q") || "";
    const filter = searchParams.get("filter") || ""; // nearby, trending, following, foryou
    const category = searchParams.get("category") || ""; // slug or ID
    const type = searchParams.get("type") || "all"; // posts, products, users, all
    const page = parseInt(searchParams.get("page") || "0");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = page * limit;

    // Fetch user profile details for location/interest filtering
    const { data: userProfile } = await supabase
      .from("users")
      .select("city, area, latitude, longitude, interests")
      .eq("id", authUser.id)
      .single();

    // Resolve category ID if category is a slug
    let categoryId: string | null = null;
    if (category) {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .or(`slug.eq."${category}",id.eq."${category}"`)
        .single();
      categoryId = catData?.id || null;
    }

    // 1. Resolve followed users if needed
    let followedIds: string[] = [];
    if (filter === "following") {
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", authUser.id);
      followedIds = follows?.map((f) => f.following_id) || [];
    }

    // 2. Fetch Posts
    let postsData: any[] = [];
    if (type === "posts" || type === "all") {
      let postsQuery = supabase
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
        .eq("status", "active");

      // Apply Text Search
      if (q) {
        postsQuery = postsQuery.ilike("caption", `%${q}%`);
      }

      // Apply Category Filter (posts linked to products in this category)
      if (categoryId) {
        const { data: prodIds } = await supabase
          .from("products")
          .select("id")
          .eq("category_id", categoryId);
        const pIds = prodIds?.map((p) => p.id) || [];

        const { data: postProds } = await supabase
          .from("post_products")
          .select("post_id")
          .in("product_id", pIds.length > 0 ? pIds : ["00000000-0000-0000-0000-000000000000"]);
        const matchedPostIds = postProds?.map((pp) => pp.post_id) || [];

        postsQuery = postsQuery.in("id", matchedPostIds.length > 0 ? matchedPostIds : ["00000000-0000-0000-0000-000000000000"]);
      }

      // Apply Filters
      if (filter === "following") {
        postsQuery = postsQuery.in("user_id", followedIds.length > 0 ? followedIds : ["00000000-0000-0000-0000-000000000000"]);
      } else if (filter === "foryou") {
        const interests = userProfile?.interests || [];
        // Only filter by interests if user has set them; otherwise show all posts
        if (interests.length > 0) {
          const { data: prodIds } = await supabase
            .from("products")
            .select("id")
            .in("category_id", interests);
          const pIds = prodIds?.map((p) => p.id) || [];

          if (pIds.length > 0) {
            const { data: postProds } = await supabase
              .from("post_products")
              .select("post_id")
              .in("product_id", pIds);
            const matchedPostIds = postProds?.map((pp) => pp.post_id) || [];
            // Only restrict if we found matches, otherwise show all
            if (matchedPostIds.length > 0) {
              postsQuery = postsQuery.in("id", matchedPostIds);
            }
          }
        }
      }

      // Sorting
      if (filter === "trending") {
        postsQuery = postsQuery.order("appreciate_count", { ascending: false });
      } else {
        postsQuery = postsQuery.order("created_at", { ascending: false });
      }

      const { data: posts, error: postsError } = await postsQuery;
      if (postsError) {
        console.error("Posts search error:", postsError);
      } else {
        postsData = posts || [];
      }

      // Nearby proximity sorting in Javascript
      if (filter === "nearby" && userProfile) {
        const userLat = userProfile.latitude;
        const userLng = userProfile.longitude;
        if (userLat !== null && userLng !== null) {
          postsData.sort((a, b) => {
            if (a.latitude === null || a.longitude === null) return 1;
            if (b.latitude === null || b.longitude === null) return -1;
            const distA = Math.sqrt((a.latitude - userLat) ** 2 + (a.longitude - userLng) ** 2);
            const distB = Math.sqrt((b.latitude - userLat) ** 2 + (b.longitude - userLng) ** 2);
            return distA - distB;
          });
        } else if (userProfile.city) {
          // fallback to matching city
          postsData.sort((a, b) => {
            const matchA = a.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            const matchB = b.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            return matchA - matchB;
          });
        }
      }

      // Check likes/picks
      if (postsData.length > 0) {
        const postIds = postsData.map((p) => p.id);
        const { data: appreciates } = await supabase
          .from("appreciates")
          .select("post_id")
          .eq("user_id", authUser.id)
          .in("post_id", postIds);

        const { data: picks } = await supabase
          .from("picks")
          .select("post_id")
          .eq("user_id", authUser.id)
          .in("post_id", postIds);

        const appreciatedSet = new Set(appreciates?.map((a) => a.post_id) || []);
        const pickedSet = new Set(picks?.map((p) => p.post_id) || []);

        postsData = postsData.map((post) => ({
          ...post,
          is_appreciated: appreciatedSet.has(post.id),
          is_picked: pickedSet.has(post.id),
          media: post.media || [],
          products: post.products || [],
        }));
      }
    }

    // 3. Fetch Products
    let productsData: any[] = [];
    if (type === "products" || type === "all") {
      let productsQuery = supabase
        .from("products")
        .select(`
          id,
          seller_id,
          title,
          description,
          price,
          stock,
          category_id,
          status,
          seller:users(
            id,
            username,
            display_name,
            avatar_url,
            city,
            area,
            latitude,
            longitude
          ),
          images:product_images(
            id,
            image_url,
            display_order
          )
        `)
        .eq("status", "active");

      // Apply Text Search
      if (q) {
        productsQuery = productsQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      // Apply Category Filter
      if (categoryId) {
        productsQuery = productsQuery.eq("category_id", categoryId);
      }

      // Apply Filters
      if (filter === "following") {
        productsQuery = productsQuery.in("seller_id", followedIds.length > 0 ? followedIds : ["00000000-0000-0000-0000-000000000000"]);
      } else if (filter === "foryou") {
        const interests = userProfile?.interests || [];
        if (interests.length > 0) {
          productsQuery = productsQuery.in("category_id", interests);
        }
      }

      productsQuery = productsQuery.order("created_at", { ascending: false });

      const { data: products, error: productsError } = await productsQuery;
      if (productsError) {
        console.error("Products search error:", productsError);
      } else {
        productsData = products || [];
      }

      // Nearby proximity sorting in Javascript
      if (filter === "nearby" && userProfile) {
        const userLat = userProfile.latitude;
        const userLng = userProfile.longitude;
        if (userLat !== null && userLng !== null) {
          productsData.sort((a, b) => {
            const sellerA = a.seller;
            const sellerB = b.seller;
            if (!sellerA || sellerA.latitude === null || sellerA.longitude === null) return 1;
            if (!sellerB || sellerB.latitude === null || sellerB.longitude === null) return -1;
            const distA = Math.sqrt((sellerA.latitude - userLat) ** 2 + (sellerA.longitude - userLng) ** 2);
            const distB = Math.sqrt((sellerB.latitude - userLat) ** 2 + (sellerB.longitude - userLng) ** 2);
            return distA - distB;
          });
        } else if (userProfile.city) {
          productsData.sort((a, b) => {
            const matchA = a.seller?.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            const matchB = b.seller?.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            return matchA - matchB;
          });
        }
      }
    }

    // 4. Fetch Users (All users for usernames search OR Sellers for shops/users search)
    let usersData: any[] = [];
    if (type === "users" || type === "usernames" || type === "shops" || type === "all") {
      let usersQuery = supabase
        .from("users")
        .select(`
          id,
          username,
          display_name,
          avatar_url,
          role,
          city,
          area,
          latitude,
          longitude,
          post_count,
          follower_count,
          following_count
        `);

      if (type === "users" || type === "shops") {
        usersQuery = usersQuery.eq("role", "seller");
      }

      // Apply Text Search
      if (q) {
        usersQuery = usersQuery.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      // Apply Category Filter (sellers linked to this category in their seller profile)
      if (categoryId) {
        const { data: sellers } = await supabase
          .from("seller_profiles")
          .select("user_id")
          .eq("category_id", categoryId);
        const sellerUserIds = sellers?.map((s) => s.user_id) || [];
        usersQuery = usersQuery.in("id", sellerUserIds.length > 0 ? sellerUserIds : ["00000000-0000-0000-0000-000000000000"]);
      }

      // Apply Filters
      if (filter === "following") {
        usersQuery = usersQuery.in("id", followedIds.length > 0 ? followedIds : ["00000000-0000-0000-0000-000000000000"]);
      }

      usersQuery = usersQuery.order("follower_count", { ascending: false });

      const { data: sellers, error: sellersError } = await usersQuery;
      if (sellersError) {
        console.error("Sellers search error:", sellersError);
      } else {
        usersData = sellers || [];
      }

      // Nearby proximity sorting in Javascript
      if (filter === "nearby" && userProfile) {
        const userLat = userProfile.latitude;
        const userLng = userProfile.longitude;
        if (userLat !== null && userLng !== null) {
          usersData.sort((a, b) => {
            if (a.latitude === null || a.longitude === null) return 1;
            if (b.latitude === null || b.longitude === null) return -1;
            const distA = Math.sqrt((a.latitude - userLat) ** 2 + (a.longitude - userLng) ** 2);
            const distB = Math.sqrt((b.latitude - userLat) ** 2 + (b.longitude - userLng) ** 2);
            return distA - distB;
          });
        } else if (userProfile.city) {
          usersData.sort((a, b) => {
            const matchA = a.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            const matchB = b.city?.toLowerCase() === userProfile.city?.toLowerCase() ? 0 : 1;
            return matchA - matchB;
          });
        }
      }
    }

    // Paginate results if specific type requested
    if (type === "posts") {
      postsData = postsData.slice(offset, offset + limit);
    } else if (type === "products") {
      productsData = productsData.slice(offset, offset + limit);
    } else if (type === "users" || type === "usernames" || type === "shops") {
      usersData = usersData.slice(offset, offset + limit);
    } else {
      // type === 'all'
      postsData = postsData.slice(0, 10);
      productsData = productsData.slice(0, 10);
      usersData = usersData.slice(0, 10);
    }

    return NextResponse.json(
      {
        posts: postsData,
        products: productsData,
        users: usersData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
