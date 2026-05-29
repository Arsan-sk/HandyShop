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

    // Get blocked users list with their profiles details
    const { data: blockedList, error: queryError } = await supabase
      .from("blocked_users")
      .select(`
        id,
        created_at,
        blocked:users!blocked_users_blocked_id_fkey(
          id,
          username,
          display_name,
          avatar_url,
          city,
          area
        )
      `)
      .eq("blocker_id", currentUser.id);

    if (queryError) {
      console.error("[Get Blocks] Query error:", queryError);
      return NextResponse.json(
        { message: "Failed to retrieve blocked users" },
        { status: 500 }
      );
    }

    // Map output safely
    const blockedUsers = (blockedList || [])
      .map((b: any) => ({
        block_id: b.id,
        created_at: b.created_at,
        user: b.blocked,
      }))
      .filter((b) => b.user !== null);

    return NextResponse.json({ blocked_users: blockedUsers }, { status: 200 });
  } catch (err) {
    console.error("[Get Blocks] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
