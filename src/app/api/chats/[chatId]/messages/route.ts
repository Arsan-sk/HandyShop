import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage, markAsRead } from "@/lib/chats-db";

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

    // Mark messages as read
    await markAsRead(chatId, user.id);

    // Fetch messages list
    const messages = await getMessages(chatId);
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("[Messages GET] Error:", err);
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
    const { content, mediaUrl, productId } = body;

    if (!content && !mediaUrl && !productId) {
      return NextResponse.json(
        { message: "Message content, media, or product attachment is required" },
        { status: 400 }
      );
    }

    const msg = await sendMessage(chatId, user.id, content || "", mediaUrl, productId);
    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error("[Messages POST] Error:", err);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
