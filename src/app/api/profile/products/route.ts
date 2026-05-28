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

    // Retrieve all products created by this seller
    const { data: products, error } = await supabase
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
        is_archived,
        created_at,
        updated_at,
        images:product_images(
          id,
          image_url,
          display_order
        )
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Profile Products GET] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch products" },
        { status: 500 }
      );
    }

    const formattedProducts = (products || []).map((product) => ({
      ...product,
      images: product.images || [],
    }));

    return NextResponse.json(
      { products: formattedProducts },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Profile Products GET] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
