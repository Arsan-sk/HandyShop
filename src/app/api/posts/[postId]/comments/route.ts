import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET all comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = await createClient();
    const { postId } = await params;

    // Validate UUID format to prevent Supabase query crashes
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!postId || !uuidRegex.test(postId)) {
      return NextResponse.json(
        { message: "Invalid post ID format", comments: [] },
        { status: 400 }
      );
    }

    const { data: comments, error } = await supabase
      .from("comments")
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
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Get Comments] Error:", error);
      return NextResponse.json(
        { message: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comments: comments || [],
    }, { status: 200 });
  } catch (err) {
    console.error("[Get Comments] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST a new comment
export async function POST(
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

    // Validate UUID format to prevent Supabase query crashes
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!postId || !uuidRegex.test(postId)) {
      return NextResponse.json(
        { message: "Invalid post ID format" },
        { status: 400 }
      );
    }

    const { body, parent_comment_id } = await request.json();

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

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: user.id,
        body: body.trim(),
        parent_comment_id: parent_comment_id || null,
      })
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

    if (insertError) {
      console.error("[Create Comment] Error:", insertError);
      return NextResponse.json(
        { message: "Failed to post comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      comment,
    }, { status: 201 });
  } catch (err) {
    console.error("[Create Comment] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
