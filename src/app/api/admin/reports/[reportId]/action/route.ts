import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const supabase = await createClient();
    const { reportId } = await params;

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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!reportId || !uuidRegex.test(reportId)) {
      return NextResponse.json(
        { message: "Invalid report ID format" },
        { status: 400 }
      );
    }

    const { action, reason } = await request.json();

    const validActions = ["resolve", "dismiss", "delete_post", "suspend_user"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { message: "Invalid moderation action" },
        { status: 400 }
      );
    }

    // Fetch original report to get targets
    const { data: report, error: fetchError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ message: "Report not found" }, { status: 404 });
    }

    let modAction: "report_resolved" | "report_dismissed" | "post_removed" | "user_suspended" = "report_resolved";

    if (action === "resolve") {
      // Resolve report
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;
      modAction = "report_resolved";
    } else if (action === "dismiss") {
      // Dismiss report
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "dismissed",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;
      modAction = "report_dismissed";
    } else if (action === "delete_post") {
      if (!report.reported_post_id) {
        return NextResponse.json(
          { message: "This report does not target a post" },
          { status: 400 }
        );
      }
      
      // Update post status to deleted
      const { error: postError } = await supabase
        .from("posts")
        .update({ status: "deleted" })
        .eq("id", report.reported_post_id);

      if (postError) throw postError;

      // Automatically resolve the report
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;
      modAction = "post_removed";
    } else if (action === "suspend_user") {
      if (!report.reported_user_id) {
        return NextResponse.json(
          { message: "This report does not target a user" },
          { status: 400 }
        );
      }

      // Suspend reported user
      const { error: suspendError } = await supabase
        .from("users")
        .update({ is_suspended: true })
        .eq("id", report.reported_user_id);

      if (suspendError) throw suspendError;

      // Automatically resolve the report
      const { error: updateError } = await supabase
        .from("reports")
        .update({
          status: "resolved",
          reviewed_by: currentUser.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (updateError) throw updateError;
      modAction = "user_suspended";
    }

    // Log admin action to moderation_logs
    await supabase.from("moderation_logs").insert({
      admin_id: currentUser.id,
      target_user_id: report.reported_user_id || null,
      target_post_id: report.reported_post_id || null,
      action: modAction,
      reason: reason || `Admin action: ${action}`,
    });

    return NextResponse.json(
      { message: `Action ${action} executed successfully` },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Admin Report Action] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
