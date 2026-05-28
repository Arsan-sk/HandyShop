import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Check if post exists
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, appreciate_count")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user already appreciated this post
    const { data: existingAppreciate } = await supabase
      .from("appreciates")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (existingAppreciate) {
      // Remove appreciation
      const { error: deleteError } = await supabase
        .from("appreciates")
        .delete()
        .eq("id", existingAppreciate.id);

      if (deleteError) {
        return NextResponse.json(
          { message: "Failed to remove appreciation" },
          { status: 500 }
        );
      }

      // Update post appreciate count
      await supabase
        .from("posts")
        .update({ appreciate_count: Math.max(0, post.appreciate_count - 1) })
        .eq("id", postId);

      return NextResponse.json(
        { message: "Appreciation removed", appreciated: false },
        { status: 200 }
      );
    } else {
      // Add appreciation
      const { error: insertError } = await supabase
        .from("appreciates")
        .insert({ post_id: postId, user_id: user.id });

      if (insertError) {
        return NextResponse.json(
          { message: "Failed to add appreciation" },
          { status: 500 }
        );
      }

      // Update post appreciate count
      await supabase
        .from("posts")
        .update({ appreciate_count: post.appreciate_count + 1 })
        .eq("id", postId);

      return NextResponse.json(
        { message: "Post appreciated", appreciated: true },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("POST /api/posts/[postId]/appreciate error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
