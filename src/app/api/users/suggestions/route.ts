import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Fetch current user's location & interests
    const { data: userProfile } = await supabase
      .from("users")
      .select("city, interests")
      .eq("id", currentUser.id)
      .single();

    const userCity = userProfile?.city || "";
    const userInterests = userProfile?.interests || [];

    // 3. Fetch followed users to exclude them from suggestions
    const { data: followed } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUser.id);
    const followedIds = new Set(followed?.map((f) => f.following_id) || []);
    followedIds.add(currentUser.id); // Also exclude self

    // 4. Query potential users to suggest (limit to first 50 candidates)
    // We prioritize sellers and users from the same city/interests
    const { data: candidates, error: candidatesError } = await supabase
      .from("users")
      .select(`
        id,
        username,
        display_name,
        avatar_url,
        role,
        city,
        area,
        interests,
        follower_count
      `)
      .not("id", "in", `(${Array.from(followedIds).join(",")})`)
      .limit(50);

    if (candidatesError || !candidates) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    // 5. Algorithm: Score candidates based on category overlap and city matching
    const scoredCandidates = candidates.map((cand) => {
      let score = 0;

      // Prioritize sellers
      if (cand.role === "seller") {
        score += 15;
      }

      // Location match
      if (userCity && cand.city && cand.city.toLowerCase() === userCity.toLowerCase()) {
        score += 20;
      }

      // Interests overlap
      const candInterests = cand.interests || [];
      const intersection = candInterests.filter((x: string) => userInterests.includes(x));
      score += intersection.length * 10;

      return {
        ...cand,
        score,
      };
    });

    // Sort by score descending, then by follower count
    scoredCandidates.sort((a, b) => b.score - a.score || b.follower_count - a.follower_count);

    // Limit to 5 premium recommendations
    const suggestions = scoredCandidates.slice(0, 5).map((u) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      role: u.role,
      city: u.city,
      area: u.area,
      follower_count: u.follower_count,
    }));

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (err) {
    console.error("[Suggestions GET] Error:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
