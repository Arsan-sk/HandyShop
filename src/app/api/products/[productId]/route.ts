import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT to edit product details
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;
    const body = await request.json();
    const {
      title,
      description,
      price,
      stock,
      category_id,
      delivery_info,
      variants,
      sizes,
      status,
      is_archived,
    } = body;

    // Verify ownership
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("seller_id")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    if (product.seller_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) {
      updates.stock = stock;
      // Auto adjust status based on stock count
      updates.status = stock > 0 ? "active" : "out_of_stock";
    }
    if (category_id !== undefined) updates.category_id = category_id;
    if (delivery_info !== undefined) updates.delivery_info = delivery_info ? delivery_info.trim() : null;
    if (variants !== undefined) updates.variants = variants;
    if (sizes !== undefined) updates.sizes = sizes;
    if (status !== undefined) updates.status = status;
    if (is_archived !== undefined) updates.is_archived = is_archived;

    const { data: updatedProduct, error: updateError } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .select()
      .single();

    if (updateError) {
      console.error("[Product Update] Error:", updateError);
      return NextResponse.json(
        { message: "Failed to update product" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { product: updatedProduct },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Product Update] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE to remove product and images from storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
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

    const { productId } = await params;

    // Verify ownership
    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("seller_id")
      .eq("id", productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    if (product.seller_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // 1. Fetch images to delete from storage
    const { data: images } = await supabase
      .from("product_images")
      .select("image_url")
      .eq("product_id", productId);

    if (images && images.length > 0) {
      const paths = images
        .map((img) => {
          const parts = img.image_url.split("product-images/");
          return parts[1] || null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("product-images")
          .remove(paths);
        if (storageError) {
          console.warn("[Product Delete] Storage cleanup warning:", storageError);
        }
      }
    }

    // 2. Delete product from database (cascade deletes product_images, post_products link rows)
    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (deleteError) {
      console.error("[Product Delete] DB Error:", deleteError);
      return NextResponse.json(
        { message: "Failed to delete product" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Product Delete] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
