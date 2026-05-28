import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT to edit post caption or status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
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

    const { postId } = await params;
    const body = await request.json();
    const { caption, status } = body;

    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (caption !== undefined) updates.caption = caption;
    if (status !== undefined) updates.status = status; // active, archived, deleted

    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update(updates)
      .eq("id", postId)
      .select()
      .single();

    if (updateError) {
      console.error("[Post Update] Error:", updateError);
      return NextResponse.json(
        { message: "Failed to update post" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { post: updatedPost },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Post Update] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE to remove post and its storage media files
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
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

    const { postId } = await params;

    // Verify ownership
    const { data: post, error: fetchError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (fetchError || !post) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // 1. Fetch all media file urls associated with the post to delete from storage
    const { data: mediaFiles } = await supabase
      .from("post_media")
      .select("media_url")
      .eq("post_id", postId);

    if (mediaFiles && mediaFiles.length > 0) {
      const paths = mediaFiles
        .map((m) => {
          const parts = m.media_url.split("posts-media/");
          return parts[1] || null;
        })
        .filter(Boolean) as string[];

      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from("posts-media")
          .remove(paths);
        if (storageError) {
          console.warn("[Post Delete] Storage files cleanup warning:", storageError);
        }
      }
    }

    // 2. Delete post (database cascade will automatically delete post_media, post_products, appreciates, picks, and comments)
    const { error: deleteError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("[Post Delete] DB Error:", deleteError);
      return NextResponse.json(
        { message: "Failed to delete post" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Post deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Post Delete] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
