import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

// File-based database paths (fallback)
const CHATS_FILE = path.join(process.cwd(), "src", "data", "chats.json");
const MESSAGES_FILE = path.join(process.cwd(), "src", "data", "messages.json");

// Cache fallback choice
let useFallback = false;

function ensureDataDirectory() {
  const dir = path.dirname(CHATS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJSON(filePath: string): any[] {
  ensureDataDirectory();
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
    return [];
  }
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data || "[]");
  } catch (e) {
    console.error("Failed to read JSON:", filePath, e);
    return [];
  }
}

function writeJSON(filePath: string, data: any[]) {
  ensureDataDirectory();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write JSON:", filePath, e);
  }
}

async function getUserProfile(userId: string, supabase: any) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id, username, display_name, avatar_url")
      .eq("id", userId)
      .single();
    if (error || !data) {
      return { id: userId, username: "user_" + userId.slice(0, 4), display_name: "HandyShop User", avatar_url: null };
    }
    return data;
  } catch {
    return { id: userId, username: "user_" + userId.slice(0, 4), display_name: "HandyShop User", avatar_url: null };
  }
}

async function executeWithFallback<T>(
  supabaseQuery: () => Promise<{ data: T | null; error: any }>,
  fallbackQuery: () => Promise<T>
): Promise<T> {
  if (useFallback) {
    return fallbackQuery();
  }
  try {
    const { data, error } = await supabaseQuery();
    if (error) {
      if (
        error.code === "PGRST205" || 
        error.message?.includes("relation") || 
        error.message?.includes("does not exist")
      ) {
        console.warn("Supabase chats/messages tables missing. Falling back to local JSON store.");
        useFallback = true;
        return fallbackQuery();
      }
      throw error;
    }
    return data as T;
  } catch (err) {
    console.error("Supabase query failed, using JSON fallback:", err);
    return fallbackQuery();
  }
}

export async function getChats(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("chats")
        .select(`
          id,
          user1_id,
          user2_id,
          created_at,
          updated_at,
          user1:users!chats_user1_id_fkey(id, username, display_name, avatar_url),
          user2:users!chats_user2_id_fkey(id, username, display_name, avatar_url)
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (error) return { data: null, error };

      // Transform format
      const transformed = (data || []).map((chat: any) => {
        const otherUser = chat.user1_id === userId ? chat.user2 : chat.user1;
        return {
          id: chat.id,
          user1_id: chat.user1_id,
          user2_id: chat.user2_id,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          recipient: Array.isArray(otherUser) ? otherUser[0] : otherUser,
        };
      });

      return { data: transformed, error: null };
    },
    async () => {
      const chats = readJSON(CHATS_FILE);
      const userChats = chats.filter(c => c.user1_id === userId || c.user2_id === userId);
      
      const transformed = [];
      for (const chat of userChats) {
        const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
        const otherUserProfile = await getUserProfile(otherUserId, supabase);

        // Fetch last message for snippet
        const messages = readJSON(MESSAGES_FILE);
        const chatMessages = messages.filter(m => m.chat_id === chat.id);
        const lastMessage = chatMessages[chatMessages.length - 1];

        transformed.push({
          id: chat.id,
          user1_id: chat.user1_id,
          user2_id: chat.user2_id,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          recipient: otherUserProfile,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            created_at: lastMessage.created_at,
            sender_id: lastMessage.sender_id,
          } : null
        });
      }

      return transformed.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
  );
}

export async function getOrCreateChat(userId: string, targetUserId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      // Search existing chat
      const { data: existingChat } = await supabase
        .from("chats")
        .select("id")
        .or(`and(user1_id.eq.${userId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${userId})`)
        .single();

      if (existingChat) {
        return { data: existingChat, error: null };
      }

      // Create new chat
      const { data: newChat, error: createError } = await supabase
        .from("chats")
        .insert({
          user1_id: userId,
          user2_id: targetUserId,
        })
        .select("id")
        .single();

      return { data: newChat, error: createError };
    },
    async () => {
      const chats = readJSON(CHATS_FILE);
      let chat = chats.find(
        c => (c.user1_id === userId && c.user2_id === targetUserId) || 
             (c.user1_id === targetUserId && c.user2_id === userId)
      );

      if (!chat) {
        chat = {
          id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          user1_id: userId,
          user2_id: targetUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        chats.push(chat);
        writeJSON(CHATS_FILE, chats);
      }

      return chat;
    }
  );
}

export async function getMessages(chatId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("messages")
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          media_url,
          product_id,
          is_read,
          created_at,
          product:products(
            id,
            title,
            price,
            images:product_images(image_url)
          )
        `)
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) return { data: null, error };

      // Transform format
      const transformed = (data || []).map((msg: any) => {
        const productImages = msg.product?.images || [];
        const thumb = productImages[0]?.image_url || "";
        return {
          ...msg,
          product: msg.product ? {
            id: msg.product.id,
            title: msg.product.title,
            price: msg.product.price,
            thumbnail: thumb,
          } : null
        };
      });

      return { data: transformed, error: null };
    },
    async () => {
      const messages = readJSON(MESSAGES_FILE);
      const chatMessages = messages.filter(m => m.chat_id === chatId);

      // Fetch products in dynamic fallback manner
      const enriched = [];
      for (const msg of chatMessages) {
        let productData = null;
        if (msg.product_id) {
          try {
            const { data: prod } = await supabase
              .from("products")
              .select(`
                id,
                title,
                price,
                images:product_images(image_url)
              `)
              .eq("id", msg.product_id)
              .single();
            if (prod) {
              const thumb = prod.images?.[0]?.image_url || "";
              productData = {
                id: prod.id,
                title: prod.title,
                price: prod.price,
                thumbnail: thumb,
              };
            }
          } catch {}
        }

        enriched.push({
          ...msg,
          product: productData
        });
      }

      return enriched.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  );
}

export async function sendMessage(
  chatId: string, 
  senderId: string, 
  content: string, 
  mediaUrl?: string, 
  productId?: string
) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          content,
          media_url: mediaUrl || null,
          product_id: productId || null,
          is_read: false,
        })
        .select()
        .single();

      return { data, error };
    },
    async () => {
      const messages = readJSON(MESSAGES_FILE);
      const newMsg = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        chat_id: chatId,
        sender_id: senderId,
        content,
        media_url: mediaUrl || null,
        product_id: productId || null,
        is_read: false,
        created_at: new Date().toISOString()
      };

      messages.push(newMsg);
      writeJSON(MESSAGES_FILE, messages);

      // Update chat updated_at timestamp
      const chats = readJSON(CHATS_FILE);
      const chatIndex = chats.findIndex(c => c.id === chatId);
      if (chatIndex >= 0) {
        chats[chatIndex].updated_at = new Date().toISOString();
        writeJSON(CHATS_FILE, chats);
      }

      return newMsg;
    }
  );
}

export async function getUnreadCount(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      // Fetch chats that this user is a part of
      const { data: myChats } = await supabase
        .from("chats")
        .select("id")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const chatIds = myChats?.map(c => c.id) || [];
      if (chatIds.length === 0) return { data: 0, error: null };

      // Count unread messages that were NOT sent by this user
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("chat_id", chatIds)
        .eq("is_read", false)
        .neq("sender_id", userId);

      return { data: count || 0, error };
    },
    async () => {
      const chats = readJSON(CHATS_FILE);
      const myChatIds = chats
        .filter(c => c.user1_id === userId || c.user2_id === userId)
        .map(c => c.id);

      const messages = readJSON(MESSAGES_FILE);
      const unread = messages.filter(
        m => myChatIds.includes(m.chat_id) && !m.is_read && m.sender_id !== userId
      );

      return unread.length;
    }
  );
}

export async function markAsRead(chatId: string, userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("chat_id", chatId)
        .neq("sender_id", userId);

      return { data: null, error };
    },
    async () => {
      const messages = readJSON(MESSAGES_FILE);
      let changed = false;
      const updated = messages.map(m => {
        if (m.chat_id === chatId && m.sender_id !== userId && !m.is_read) {
          changed = true;
          return { ...m, is_read: true };
        }
        return m;
      });

      if (changed) {
        writeJSON(MESSAGES_FILE, updated);
      }
      return null;
    }
  );
}
