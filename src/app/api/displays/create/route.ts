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
    const files = formData.getAll("files") as File[];
    const sourcePostId = formData.get("source_post_id") as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 }
      );
    }

    // Validate files
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json(
          { message: "File too large (max 50MB)" },
          { status: 400 }
        );
      }
      const validTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/quicktime",
      ];
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { message: "Invalid file type" },
          { status: 400 }
        );
      }
    }

    // Create display
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const {
      data: displayData,
      error: displayError,
    } = await supabase
      .from("displays")
      .insert({
        user_id: user.id,
        source_post_id: sourcePostId || null,
        expires_at: expiresAt.toISOString(),
        view_count: 0,
      })
      .select()
      .single();

    if (displayError || !displayData) {
      console.error("[Display Create] DB error:", displayError);
      return NextResponse.json(
        { message: "Failed to create display" },
        { status: 500 }
      );
    }

    // Upload files to storage
    const mediaInserts: typeof files extends (infer T)[]
      ? Array<{
          display_id: string;
          media_url: string;
          media_type: "image" | "video";
          duration_seconds: number;
          display_order: number;
        }>
      : never = [];

    const uploadErrors: Array<{ file: string; error: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isVideo = file.type.startsWith("video/");
      const ext = isVideo
        ? "mp4"
        : file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      const path = `${user.id}/displays/${displayData.id}/${Date.now()}_${i}.${ext}`;

      try {
        // Convert file to buffer - handle both File objects and Blobs
        let buffer: Buffer;
        
        if (file instanceof Blob) {
          // For Blob objects (including File)
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else if (Buffer.isBuffer(file)) {
          // Already a buffer
          buffer = file;
        } else if (file && typeof file === "object" && "stream" in file) {
          // Stream-like object
          const chunks: Uint8Array[] = [];
          const stream = (file as any).stream();
          const reader = stream.getReader();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
          } finally {
            reader.releaseLock();
          }
          
          const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.length;
          }
          buffer = Buffer.from(merged);
        } else {
          throw new Error("Unable to process file: unsupported type");
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("displays-media")
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError || !uploadData?.path) {
          throw new Error(uploadError?.message || "Upload failed");
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("displays-media")
          .getPublicUrl(uploadData.path);

        mediaInserts.push({
          display_id: displayData.id,
          media_url: urlData.publicUrl,
          media_type: isVideo ? "video" : "image",
          duration_seconds: isVideo ? 10 : 5, // Default durations
          display_order: i,
        });
      } catch (err) {
        uploadErrors.push({
          file: file.name,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    if (uploadErrors.length > 0) {
      console.error("[Display Create] Upload errors:", uploadErrors);
    }

    if (mediaInserts.length === 0) {
      // Delete display if no files uploaded
      await supabase.from("displays").delete().eq("id", displayData.id);
      return NextResponse.json(
        { message: "Failed to upload media files", errors: uploadErrors },
        { status: 500 }
      );
    }

    // Insert display media records
    const { error: mediaError } = await supabase
      .from("display_media")
      .insert(mediaInserts);

    if (mediaError) {
      console.error("[Display Create] Media insert error:", mediaError);
      return NextResponse.json(
        { message: "Failed to save media metadata" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Display created successfully",
        display: displayData,
        uploadErrors: uploadErrors.length > 0 ? uploadErrors : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Display Create] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
