import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// In-memory map to track typing states
// Key: "chatId:userId", Value: timestamp (Date.now())
const typingMap = new Map<string, number>();
const usernameMap = new Map<string, string>();

export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context?.params;
    const chatId = params?.chatId;

    if (!chatId) {
      return NextResponse.json({ message: "Chat ID is required" }, { status: 400 });
    }

    const now = Date.now();
    const typingUsers: string[] = [];

    // Filter typing users in this chat room (excluding self)
    for (const [key, timestamp] of typingMap.entries()) {
      if (key.startsWith(`${chatId}:`)) {
        const [_, userId] = key.split(":");
        
        if (userId !== user.id && now - timestamp < 4000) {
          // If typing state is fresh (less than 4s old)
          let username = usernameMap.get(userId);
          if (!username) {
            // Fetch username from DB and cache it
            const { data: profile } = await supabase
              .from("users")
              .select("username")
              .eq("id", userId)
              .single();
            if (profile?.username) {
              username = profile.username;
              usernameMap.set(userId, profile.username);
            }
          }
          if (username) {
            typingUsers.push(username);
          }
        }
      }
    }

    return NextResponse.json({ typingUsers });
  } catch (err) {
    console.error("[Typing GET] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context?.params;
    const chatId = params?.chatId;

    if (!chatId) {
      return NextResponse.json({ message: "Chat ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { isTyping } = body;

    const key = `${chatId}:${user.id}`;
    if (isTyping) {
      typingMap.set(key, Date.now());
    } else {
      typingMap.delete(key);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Typing POST] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
