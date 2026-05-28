import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const supabase = await createClient();

    const { postId } = await params;

    // Get all users who appreciated this post with their details and timestamps
    const { data: appreciates, error: appreciatesError } = await supabase
      .from("appreciates")
      .select(
        `
        id,
        created_at,
        user:users(
          id,
          username,
          avatar_url
        )
      `
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (appreciatesError) {
      console.error("[Get Appreciates] Error:", appreciatesError);
      return NextResponse.json(
        { message: "Failed to fetch appreciates" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        appreciates: appreciates || [],
        count: appreciates?.length || 0,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Get Appreciates] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
