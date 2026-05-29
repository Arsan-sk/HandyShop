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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 });
    }

    // Validate size (max 10MB for chat media)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: "File too large (max 10MB)" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { message: "Invalid file type. Only JPEG, PNG and WEBP images are allowed." },
        { status: 400 }
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/chats/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to posts-media bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("posts-media")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError || !uploadData?.path) {
      console.error("[Chat Media Upload] Storage error:", uploadError);
      return NextResponse.json({ message: "Failed to upload file to storage" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("posts-media")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({ url: urlData.publicUrl }, { status: 201 });
  } catch (err) {
    console.error("[Chat Media Upload] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
