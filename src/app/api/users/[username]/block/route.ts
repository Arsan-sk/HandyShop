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
        { message: "You cannot block yourself" },
        { status: 400 }
      );
    }

    // Check if block already exists
    const { data: existingBlock, error: checkError } = await supabase
      .from("blocked_users")
      .select("id")
      .eq("blocker_id", currentUser.id)
      .eq("blocked_id", targetUser.id)
      .maybeSingle();

    if (checkError) {
      console.error("[Block User] Check error:", checkError);
      return NextResponse.json(
        { message: "Database query failed" },
        { status: 500 }
      );
    }

    if (existingBlock) {
      // Unblock user
      const { error: deleteError } = await supabase
        .from("blocked_users")
        .delete()
        .eq("id", existingBlock.id);

      if (deleteError) {
        console.error("[Block User] Unblock error:", deleteError);
        return NextResponse.json(
          { message: "Failed to unblock user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ is_blocked: false }, { status: 200 });
    } else {
      // Block user
      const { error: insertError } = await supabase
        .from("blocked_users")
        .insert({
          blocker_id: currentUser.id,
          blocked_id: targetUser.id,
        });

      if (insertError) {
        console.error("[Block User] Block error:", insertError);
        return NextResponse.json(
          { message: "Failed to block user" },
          { status: 500 }
        );
      }

      // Cleanup follows: delete any follow relations between blocker and blocked
      await supabase
        .from("follows")
        .delete()
        .or(
          `and(follower_id.eq.${currentUser.id},following_id.eq.${targetUser.id}),and(follower_id.eq.${targetUser.id},following_id.eq.${currentUser.id})`
        );

      return NextResponse.json({ is_blocked: true }, { status: 201 });
    }
  } catch (err) {
    console.error("[Block User] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
