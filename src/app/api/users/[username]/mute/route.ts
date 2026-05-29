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
        { message: "You cannot mute yourself" },
        { status: 400 }
      );
    }

    // Check if mute already exists
    const { data: existingMute, error: checkError } = await supabase
      .from("muted_users")
      .select("id")
      .eq("muter_id", currentUser.id)
      .eq("muted_id", targetUser.id)
      .maybeSingle();

    if (checkError) {
      console.error("[Mute User] Check error:", checkError);
      return NextResponse.json(
        { message: "Database query failed" },
        { status: 500 }
      );
    }

    if (existingMute) {
      // Unmute user
      const { error: deleteError } = await supabase
        .from("muted_users")
        .delete()
        .eq("id", existingMute.id);

      if (deleteError) {
        console.error("[Mute User] Unmute error:", deleteError);
        return NextResponse.json(
          { message: "Failed to unmute user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ is_muted: false }, { status: 200 });
    } else {
      // Mute user
      const { error: insertError } = await supabase
        .from("muted_users")
        .insert({
          muter_id: currentUser.id,
          muted_id: targetUser.id,
        });

      if (insertError) {
        console.error("[Mute User] Mute error:", insertError);
        return NextResponse.json(
          { message: "Failed to mute user" },
          { status: 500 }
        );
      }

      return NextResponse.json({ is_muted: true }, { status: 201 });
    }
  } catch (err) {
    console.error("[Mute User] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
