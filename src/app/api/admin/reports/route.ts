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

    // Verify admin role
    const { data: profile, error: roleError } = await supabase
      .from("users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (roleError || !profile || profile.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Fetch reports with full joins
    const { data: reports, error: reportsError } = await supabase
      .from("reports")
      .select(`
        id,
        reason,
        description,
        status,
        reviewed_at,
        created_at,
        reporter:users!reports_reporter_id_fkey(
          id,
          username,
          display_name
        ),
        reported_user:users!reports_reported_user_id_fkey(
          id,
          username,
          display_name,
          is_suspended
        ),
        reported_post:posts!reports_reported_post_id_fkey(
          id,
          caption,
          status,
          user:users(
            id,
            username
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (reportsError) {
      console.error("[Admin Reports GET] Error:", reportsError);
      return NextResponse.json(
        { message: "Failed to fetch reports" },
        { status: 500 }
      );
    }

    return NextResponse.json({ reports }, { status: 200 });
  } catch (err) {
    console.error("[Admin Reports GET] Exception:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
