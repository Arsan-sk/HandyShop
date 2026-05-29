import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get muted users list with details
    const { data: mutedList, error: queryError } = await supabase
      .from("muted_users")
      .select(`
        id,
        created_at,
        muted:users!muted_users_muted_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          city,
          area
        )
      `)
      .eq("muter_id", currentUser.id);

    if (queryError) {
      console.error("[Get Mutes] Query error:", queryError);
      return NextResponse.json(
        { message: "Failed to retrieve muted users" },
        { status: 500 }
      );
    }

    const mutedUsers = (mutedList || [])
      .map((m: any) => ({
        mute_id: m.id,
        created_at: m.created_at,
        user: m.muted,
      }))
      .filter((m) => m.user !== null);

    return NextResponse.json({ muted_users: mutedUsers }, { status: 200 });
  } catch (err) {
    console.error("[Get Mutes] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
