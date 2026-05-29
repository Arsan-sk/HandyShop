import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getChats, getOrCreateChat } from "@/lib/chats-db";

export async function GET(request: NextRequest) {
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

    const chatsList = await getChats(user.id);
    return NextResponse.json({ chats: chatsList });
  } catch (err) {
    console.error("[Chats List GET] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ message: "targetUserId is required" }, { status: 400 });
    }

    if (user.id === targetUserId) {
      return NextResponse.json({ message: "Cannot chat with yourself" }, { status: 400 });
    }

    const chatRoom = await getOrCreateChat(user.id, targetUserId);
    return NextResponse.json({ chat: chatRoom }, { status: 201 });
  } catch (err) {
    console.error("[Chats Create POST] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
