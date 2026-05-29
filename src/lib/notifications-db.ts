import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

// File-based database paths (fallback)
const NOTIFICATIONS_FILE = path.join(process.cwd(), "src", "data", "notifications.json");
const PREFERENCES_FILE = path.join(process.cwd(), "src", "data", "notification_preferences.json");

// Cache fallback choice
let useFallback = false;

function ensureDataDirectory() {
  const dir = path.dirname(NOTIFICATIONS_FILE);
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
        console.warn("Supabase notifications tables missing. Falling back to local JSON store.");
        useFallback = true;
        return fallbackQuery();
      }
      throw error;
    }
    return data as T;
  } catch (err) {
    console.error("Supabase query failed, using JSON fallback:", err);
    useFallback = true;
    return fallbackQuery();
  }
}

export async function getNotificationPreferences(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) return { data: null, error };
      if (!data) {
        // Create default preferences in DB
        const defaultPrefs = {
          user_id: userId,
          follow_notifications: true,
          appreciate_notifications: true,
          comment_notifications: true,
        };
        const { data: newPrefs } = await supabase
          .from("notification_preferences")
          .insert(defaultPrefs)
          .select()
          .single();
        return { data: newPrefs, error: null };
      }
      return { data, error: null };
    },
    async () => {
      const prefs = readJSON(PREFERENCES_FILE);
      let userPref = prefs.find(p => p.user_id === userId);
      if (!userPref) {
        userPref = {
          user_id: userId,
          follow_notifications: true,
          appreciate_notifications: true,
          comment_notifications: true,
        };
        prefs.push(userPref);
        writeJSON(PREFERENCES_FILE, prefs);
      }
      return userPref;
    }
  );
}

export async function updateNotificationPreferences(userId: string, updates: {
  follow_notifications?: boolean;
  appreciate_notifications?: boolean;
  comment_notifications?: boolean;
}) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();
      return { data, error };
    },
    async () => {
      const prefs = readJSON(PREFERENCES_FILE);
      const index = prefs.findIndex(p => p.user_id === userId);
      if (index >= 0) {
        prefs[index] = { ...prefs[index], ...updates };
        writeJSON(PREFERENCES_FILE, prefs);
        return prefs[index];
      } else {
        const newPref = {
          user_id: userId,
          follow_notifications: true,
          appreciate_notifications: true,
          comment_notifications: true,
          ...updates
        };
        prefs.push(newPref);
        writeJSON(PREFERENCES_FILE, prefs);
        return newPref;
      }
    }
  );
}

export async function createNotification(
  userId: string,
  actorId: string,
  type: "follow" | "appreciate" | "comment",
  postId?: string,
  body?: string
) {
  // Prevent notifying yourself
  if (userId === actorId) return null;

  const supabase = await createClient();
  const preferences = await getNotificationPreferences(userId);

  // Check user preferences
  if (preferences) {
    if (type === "follow" && !preferences.follow_notifications) return null;
    if (type === "appreciate" && !preferences.appreciate_notifications) return null;
    if (type === "comment" && !preferences.comment_notifications) return null;
  }

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          actor_id: actorId,
          type,
          post_id: postId || null,
          body: body || null,
          is_read: false
        })
        .select()
        .single();
      return { data, error };
    },
    async () => {
      const notifications = readJSON(NOTIFICATIONS_FILE);
      const newNotif = {
        id: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        user_id: userId,
        actor_id: actorId,
        type,
        post_id: postId || null,
        body: body || null,
        is_read: false,
        created_at: new Date().toISOString()
      };
      notifications.push(newNotif);
      writeJSON(NOTIFICATIONS_FILE, notifications);
      return newNotif;
    }
  );
}

export async function getNotifications(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          actor_id,
          post_id,
          type,
          body,
          is_read,
          created_at,
          actor:users!notifications_actor_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) return { data: null, error };

      // Transform format to fix array/single user mapping issue
      const transformed = (data || []).map((notif: any) => ({
        ...notif,
        actor: Array.isArray(notif.actor) ? notif.actor[0] : notif.actor,
      }));

      return { data: transformed, error: null };
    },
    async () => {
      const notifications = readJSON(NOTIFICATIONS_FILE);
      const userNotifs = notifications.filter(n => n.user_id === userId);

      const enriched = [];
      for (const notif of userNotifs) {
        const actorProfile = await getUserProfile(notif.actor_id, supabase);
        enriched.push({
          ...notif,
          actor: actorProfile
        });
      }

      return enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  );
}

export async function getUnreadNotificationsCount(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      return { data: count || 0, error };
    },
    async () => {
      const notifications = readJSON(NOTIFICATIONS_FILE);
      const unread = notifications.filter(n => n.user_id === userId && !n.is_read);
      return unread.length;
    }
  );
}

export async function markNotificationsAsRead(userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      return { data: null, error };
    },
    async () => {
      const notifications = readJSON(NOTIFICATIONS_FILE);
      let changed = false;
      const updated = notifications.map(n => {
        if (n.user_id === userId && !n.is_read) {
          changed = true;
          return { ...n, is_read: true };
        }
        return n;
      });
      if (changed) {
        writeJSON(NOTIFICATIONS_FILE, updated);
      }
      return null;
    }
  );
}

export async function markSingleNotificationAsRead(notificationId: string, userId: string) {
  const supabase = await createClient();

  return executeWithFallback(
    async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", userId);
      return { data: null, error };
    },
    async () => {
      const notifications = readJSON(NOTIFICATIONS_FILE);
      let changed = false;
      const updated = notifications.map(n => {
        if (n.id === notificationId && n.user_id === userId && !n.is_read) {
          changed = true;
          return { ...n, is_read: true };
        }
        return n;
      });
      if (changed) {
        writeJSON(NOTIFICATIONS_FILE, updated);
      }
      return null;
    }
  );
}
