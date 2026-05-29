import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = await createClient();
    const { postId } = await params;

    // Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!postId || !uuidRegex.test(postId)) {
      return NextResponse.json(
        { message: "Invalid post ID format" },
        { status: 400 }
      );
    }

    // Get post owner ID
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("user_id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    const { reason, description } = await request.json();

    // Validate reason enum
    const validReasons = [
      "spam",
      "fake_products",
      "inappropriate_media",
      "shop_not_exist",
      "harassment",
      "scam",
      "other",
    ];

    if (!reason || !validReasons.includes(reason)) {
      return NextResponse.json(
        { message: "Invalid or missing report reason" },
        { status: 400 }
      );
    }

    // Insert report into DB
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        reporter_id: currentUser.id,
        reported_user_id: post.user_id,
        reported_post_id: postId,
        reason,
        description: description || null,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      console.error("[Report Post] DB error:", reportError);
      return NextResponse.json(
        { message: "Failed to submit report" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Report submitted successfully", report },
      { status: 201 }
    );
  } catch (err) {
    console.error("[Report Post] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
