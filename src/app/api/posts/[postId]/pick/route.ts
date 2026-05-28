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
      .select("id, pick_count")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { message: "Post not found" },
        { status: 404 }
      );
    }

    // Check if user already picked this post
    const { data: existingPick } = await supabase
      .from("picks")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .single();

    if (existingPick) {
      // Remove pick
      const { error: deleteError } = await supabase
        .from("picks")
        .delete()
        .eq("id", existingPick.id);

      if (deleteError) {
        return NextResponse.json(
          { message: "Failed to remove pick" },
          { status: 500 }
        );
      }

      // Update post pick count
      await supabase
        .from("posts")
        .update({ pick_count: Math.max(0, post.pick_count - 1) })
        .eq("id", postId);

      return NextResponse.json(
        { message: "Pick removed", picked: false },
        { status: 200 }
      );
    } else {
      // Add pick
      const { error: insertError } = await supabase
        .from("picks")
        .insert({ post_id: postId, user_id: user.id });

      if (insertError) {
        return NextResponse.json(
          { message: "Failed to add pick" },
          { status: 500 }
        );
      }

      // Update post pick count
      await supabase
        .from("posts")
        .update({ pick_count: post.pick_count + 1 })
        .eq("id", postId);

      return NextResponse.json(
        { message: "Post picked", picked: true },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("POST /api/posts/[postId]/pick error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
