import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { display_name, bio, city, area, interests, avatar_url } = body;

    // Validate username format constraint check is bypassed since username shouldn't be edited by default here
    // Clean inputs
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (city !== undefined) updates.city = city;
    if (area !== undefined) updates.area = area;
    if (interests !== undefined) updates.interests = interests; // expects UUID[]
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    const { data: updatedProfile, error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Profile Update] Error:", updateError);
      return NextResponse.json(
        { message: "Failed to update profile", error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { profile: updatedProfile },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Profile Update] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
