import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const supabase = await createClient();
    const { username } = await params;

    // Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get target user details
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (currentUser.id === targetUser.id) {
      return NextResponse.json(
        { message: "You cannot report yourself" },
        { status: 400 }
      );
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
        reported_user_id: targetUser.id,
        reported_post_id: null,
        reason,
        description: description || null,
        status: "pending",
      })
      .select()
      .single();

    if (reportError) {
      console.error("[Report User] DB error:", reportError);
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
    console.error("[Report User] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
