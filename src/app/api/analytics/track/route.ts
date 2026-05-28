import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user (optional — views can be from unauthenticated users/guests)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { event_type, target_user_id, target_post_id, target_product_id, metadata } = body;

    if (!event_type) {
      return NextResponse.json(
        { message: "event_type is required" },
        { status: 400 }
      );
    }

    // Insert analytics event
    const { error } = await supabase.from("analytics_events").insert({
      actor_id: user?.id || null,
      target_user_id: target_user_id || null,
      target_post_id: target_post_id || null,
      target_product_id: target_product_id || null,
      event_type,
      metadata: metadata || {},
    });

    if (error) {
      console.error("[Analytics Track] Error:", error);
      return NextResponse.json(
        { message: "Failed to record event" },
        { status: 500 }
      );
    }

    // Incremental counts update (optional: e.g. views count on posts table)
    if (event_type === "post_view" && target_post_id) {
      // Fetch post view count
      const { data: post } = await supabase
        .from("posts")
        .select("view_count")
        .eq("id", target_post_id)
        .single();
      if (post) {
        await supabase
          .from("posts")
          .update({ view_count: (post.view_count || 0) + 1 })
          .eq("id", target_post_id);
      }
    }

    return NextResponse.json({ message: "Event tracked successfully" }, { status: 200 });
  } catch (err) {
    console.error("[Analytics Track] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
