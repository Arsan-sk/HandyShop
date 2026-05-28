import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

    // Verify user role is seller
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "seller") {
      return NextResponse.json(
        { message: "Only sellers can create products" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;
    const price = parseFloat(formData.get("price") as string || "0");
    const stock = parseInt(formData.get("stock") as string || "0");
    const categoryId = formData.get("category_id") as string | null;
    const deliveryInfo = formData.get("delivery_info") as string | null;
    const variantsRaw = formData.get("variants") as string | null;
    const sizesRaw = formData.get("sizes") as string | null;

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { message: "Product title is required" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "At least one product photo is required" },
        { status: 400 }
      );
    }

    // Parse JSON arrays
    let variants = [];
    let sizes = [];
    try {
      if (variantsRaw) variants = JSON.parse(variantsRaw);
      if (sizesRaw) sizes = JSON.parse(sizesRaw);
    } catch (e) {
      console.warn("JSON parse warning on variants or sizes:", e);
    }

    // Create product
    const { data: product, error: productError } = await supabase
      .from("products")
      .insert({
        seller_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        price,
        stock,
        category_id: categoryId || null,
        variants,
        sizes,
        delivery_info: deliveryInfo?.trim() || null,
        status: stock > 0 ? "active" : "out_of_stock",
      })
      .select()
      .single();

    if (productError || !product) {
      console.error("[Product Create] Error:", productError);
      return NextResponse.json(
        { message: "Failed to create product" },
        { status: 500 }
      );
    }

    // Upload files to storage and link in product_images
    const imageInserts: Array<{
      product_id: string;
      image_url: string;
      display_order: number;
    }> = [];

    const uploadErrors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isPng = file.type === "image/png";
      const isWebp = file.type === "image/webp";
      const ext = isPng ? "png" : isWebp ? "webp" : "jpg";

      const path = `${user.id}/products/${product.id}/${Date.now()}_${i}.${ext}`;

      try {
        let buffer: Buffer;

        if (file instanceof Blob) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else if (Buffer.isBuffer(file)) {
          buffer = file;
        } else {
          throw new Error("Unsupported file object type");
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError || !uploadData?.path) {
          throw new Error(uploadError?.message || "Upload failed");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(uploadData.path);

        imageInserts.push({
          product_id: product.id,
          image_url: urlData.publicUrl,
          display_order: i,
        });
      } catch (err) {
        uploadErrors.push({
          file: file.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (imageInserts.length === 0) {
      // rollback product record creation
      await supabase.from("products").delete().eq("id", product.id);
      return NextResponse.json(
        { message: "Failed to upload any images", errors: uploadErrors },
        { status: 500 }
      );
    }

    // Save product images
    const { error: imagesError } = await supabase
      .from("product_images")
      .insert(imageInserts);

    if (imagesError) {
      console.error("[Product Images Create] Error:", imagesError);
      return NextResponse.json(
        { message: "Failed to record product images metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Product created successfully",
        product,
        uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Product Create] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
