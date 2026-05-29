import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  context: any
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

    // Simplified params extraction
    const displayId = context?.params?.displayId;

    // Check if already viewed
    const { data: existingView } = await supabase
      .from("display_views")
      .select("id")
      .eq("display_id", displayId)
      .eq("user_id", user.id)
      .single();

    // Only insert if not already viewed
    if (!existingView) {

      const { error: insertError } = await supabase
        .from("display_views")
        .insert({
          display_id: displayId,
          user_id: user.id,
        });

      if (insertError) {
        console.error("[Display View] Error:", insertError);

        return NextResponse.json(
          { message: "Failed to record view" },
          { status: 500 }
        );
      }

      // Direct update to increment view_count
      const { data: display } = await supabase
        .from("displays")
        .select("view_count")
        .eq("id", displayId)
        .single();
      if (display) {
        await supabase
          .from("displays")
          .update({ view_count: (display.view_count || 0) + 1 })
          .eq("id", displayId);
      }
    }

    return NextResponse.json({
      message: "View recorded"
    });

  } catch (err) {

    console.error("[Display View] Error:", err);

    return NextResponse.json(
      {
        message: "Internal server error"
      },
      {
        status: 500
      }
    );
  }
}