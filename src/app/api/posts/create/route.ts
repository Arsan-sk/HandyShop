import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error("[API] Auth error:", authError.code, authError.message);
      return NextResponse.json(
        { message: "Authentication failed" },
        { status: 401 }
      );
    }

    if (!user) {
      console.error("[API] No user found in session");
      return NextResponse.json(
        { message: "User not authenticated" },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const caption = formData.get("caption") as string;
    const category = formData.get("category") as string;

    // Validation
    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "No files provided" },
        { status: 400 }
      );
    }

    if (!caption || caption.trim().length === 0) {
      return NextResponse.json(
        { message: "Caption is required" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { message: "Category is required" },
        { status: 400 }
      );
    }

    // Get user profile to get location info
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("city, area, latitude, longitude")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[API] Profile fetch error:", profileError.code, profileError.message);
      return NextResponse.json(
        { message: "Failed to fetch user profile" },
        { status: 500 }
      );
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        caption: caption.trim(),
        status: "active",
        is_quicklook: false,
        city: userProfile?.city || null,
        area: userProfile?.area || null,
        latitude: userProfile?.latitude || null,
        longitude: userProfile?.longitude || null,
        appreciate_count: 0,
        pick_count: 0,
        comment_count: 0,
        share_count: 0,
        view_count: 0,
      })
      .select()
      .single();

    if (postError) {
      console.error("[API] Post creation error:", postError.code, postError.message);
      return NextResponse.json(
        { message: "Failed to create post" },
        { status: 500 }
      );
    }

    // Upload media files and create post_media records
    const mediaRecords = [];
    const uploadErrors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (!isImage && !isVideo) {
        console.warn(`[API] Skipping invalid file type: ${file.type}`);
        continue;
      }

      // Validate file size (50MB max per file)
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 50) {
        console.error(`[API] File too large: ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
        uploadErrors.push(`File ${file.name} is too large (max 50MB)`);
        continue;
      }

      const mediaType = isImage ? "image" : "video";
      const extension = file.name.split(".").pop() || "bin";
      const timestamp = Date.now();
      
      // Path format: {user_id}/posts/{post_id}/{timestamp}_{index}.{ext}
      // This follows RLS policy conventions
      const fileName = `${user.id}/posts/${post.id}/${timestamp}_${i}.${extension}`;

      console.log(`[API] Uploading file ${i + 1}/${files.length}: ${file.name} (${fileSizeMB.toFixed(2)}MB) to posts-media/${fileName}`);

      try {
        // Step 1: Upload file to Supabase Storage (bucket: posts-media)
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("posts-media")
          .upload(fileName, file, {
            contentType: file.type,
            cacheControl: "3600",
            upsert: false, // Prevent overwriting existing files
          });

        if (uploadError) {
          console.error(`[API] Storage upload failed for ${file.name}:`, uploadError.message);
          uploadErrors.push(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        if (!uploadData || !uploadData.path) {
          console.error(`[API] Upload succeeded but no path returned for ${file.name}`);
          uploadErrors.push(`Upload returned invalid response for ${file.name}`);
          continue;
        }

        console.log(`[API] File uploaded successfully: ${uploadData.path}`);

        // Step 2: Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from("posts-media")
          .getPublicUrl(fileName);

        if (!urlData || !urlData.publicUrl) {
          console.error(`[API] Failed to get public URL for ${file.name}`);
          uploadErrors.push(`Failed to generate URL for ${file.name}`);
          continue;
        }

        const mediaUrl = urlData.publicUrl;
        console.log(`[API] Public URL generated: ${mediaUrl.substring(0, 50)}...`);

        // Step 3: Create post_media database record
        const { data: mediaRecord, error: mediaError } = await supabase
          .from("post_media")
          .insert({
            post_id: post.id,
            media_url: mediaUrl,
            media_type: mediaType,
            aspect_ratio: "1:1", // Default, can be updated with image analysis
            display_order: i,
            duration_seconds: isVideo ? 0 : null,
            file_size_bytes: file.size,
          })
          .select()
          .single();

        if (mediaError) {
          console.error(`[API] Failed to create media record for ${file.name}:`, mediaError.code, mediaError.message);
          uploadErrors.push(`Failed to save ${file.name} metadata: ${mediaError.message}`);
          
          // TODO: Cleanup - delete the file from storage if DB insert fails
          // await supabase.storage.from("posts-media").remove([fileName]);
          continue;
        }

        console.log(`[API] Media record created: ${mediaRecord.id}`);
        mediaRecords.push(mediaRecord);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[API] Unexpected error uploading ${file.name}:`, errorMsg);
        uploadErrors.push(`Unexpected error uploading ${file.name}`);
        continue;
      }
    }

    // Validation: Must have at least one successfully uploaded media
    if (mediaRecords.length === 0) {
      console.error(`[API] No media files were successfully uploaded. Errors: ${uploadErrors.join("; ")}`);
      
      // Cleanup: Delete the post since no media was uploaded
      const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (deleteError) {
        console.error(`[API] Failed to cleanup post after upload failure:`, deleteError.code);
      }

      return NextResponse.json(
        {
          message: "Failed to upload any media files",
          errors: uploadErrors,
          details: "Post was not created due to upload failures",
        },
        { status: 400 }
      );
    }

    // Log summary
    console.log(`[API] Post created successfully with ${mediaRecords.length}/${files.length} files uploaded`);
    if (uploadErrors.length > 0) {
      console.warn(`[API] Some files failed to upload:`, uploadErrors);
    }

    return NextResponse.json(
      {
        message: "Post created successfully",
        post: { ...post, media: mediaRecords },
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[API] POST /api/posts/create error:", errorMsg);
    return NextResponse.json(
      { message: "Internal server error", error: errorMsg },
      { status: 500 }
    );
  }
}
