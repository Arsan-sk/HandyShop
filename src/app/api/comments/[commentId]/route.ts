import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PUT to edit a comment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
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

    const { commentId } = await params;
    const { body } = await request.json();

    if (!body || typeof body !== "string" || body.trim() === "") {
      return NextResponse.json(
        { message: "Comment body is required" },
        { status: 400 }
      );
    }

    if (body.length > 500) {
      return NextResponse.json(
        { message: "Comment cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    // Verify comment ownership
    const { data: existingComment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 }
      );
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("comments")
      .update({
        body: body.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select(`
        id,
        post_id,
        user_id,
        parent_comment_id,
        body,
        is_deleted,
        created_at,
        updated_at,
        user:users(
          id,
          username,
          avatar_url
        )
      `)
      .single();

    if (updateError) {
      console.error("[Edit Comment] Error:", updateError);
      return NextResponse.json(
        { message: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comment: updatedComment,
    }, { status: 200 });
  } catch (err) {
    console.error("[Edit Comment] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE to remove a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
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

    const { commentId } = await params;

    // Verify comment ownership
    const { data: existingComment, error: fetchError } = await supabase
      .from("comments")
      .select("user_id")
      .eq("id", commentId)
      .single();

    if (fetchError || !existingComment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 }
      );
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    // Perform actual delete so database trigger is fired (which decrements comment count)
    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("[Delete Comment] Error:", deleteError);
      return NextResponse.json(
        { message: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Comment deleted successfully",
    }, { status: 200 });
  } catch (err) {
    console.error("[Delete Comment] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
