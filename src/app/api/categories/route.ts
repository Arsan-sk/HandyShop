import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon_url, display_order")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch categories:", error);
      return NextResponse.json(
        { message: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
