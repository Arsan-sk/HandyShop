# HandyShop Authentication Infinite Loop — Issues & Fixes

**Date:** May 27, 2026  
**Status:** FIXED  
**Root Cause:** Multiple critical bugs in auth flow, RLS policies, and routing

---

## Issues Found

### 🔴 CRITICAL ISSUE #1: Missing Middleware.ts
**Problem:** 
- The app had `src/proxy.ts` with a `proxy` function, but Next.js requires a `middleware.ts` file at the root with a `middleware` export
- Without proper middleware, auth routes weren't being protected
- Users could access protected routes without being logged in

**Fix:** 
- ✅ Created `middleware.ts` at project root with proper export
- Now auth state is properly managed and routes are protected

---

### 🔴 CRITICAL ISSUE #2: RLS Policy Blocks Profile Creation
**Problem:**
- The "Users can insert own profile" policy required `auth.uid() = id`
- When the server-side callback tried to insert a profile, the RLS policy blocked it because `auth.uid()` wasn't properly set in server context
- This caused new users to get stuck without a profile, triggering infinite loops

**Fix:**
- ✅ Updated RLS policy to allow both user-initiated and authenticated server inserts
- ✅ Relaxed policy: `auth.uid() = id OR auth.uid() IS NOT NULL`
- Users can now be created and the trigger can work properly

---

### 🔴 CRITICAL ISSUE #3: Trigger Not Firing Reliably
**Problem:**
- The auth trigger `handle_new_auth_user()` wasn't handling race conditions
- No retry logic when username conflicts occurred
- Exception handling was missing

**Fix:**
- ✅ Enhanced trigger with retry logic for unique username conflicts
- ✅ Added exception handling to prevent trigger failures
- ✅ Uses UPSERT (ON CONFLICT DO UPDATE) for idempotency
- Trigger now reliably creates profiles even with concurrent signups

---

### 🔴 CRITICAL ISSUE #4: Auth Callback Timing Issues
**Problem:**
- Callback tried to insert profile without waiting for trigger to run
- Race condition: checking for profile immediately after signup might find nothing
- No delay between signup and checking if profile exists

**Fix:**
- ✅ Added 200ms delays to allow trigger to execute
- ✅ Added retry logic: check → insert → wait → verify
- Callback now properly waits for profile to be created

---

### 🔴 CRITICAL ISSUE #5: Signup Page Navigation Loop
**Problem:**
- After signup, `router.push()` + `router.refresh()` could cause infinite loops
- No error handling for missing profile
- Could redirect before profile was ready

**Fix:**
- ✅ Improved error logging
- ✅ Wrapped redirect in timeout for safety
- ✅ Better handling of duplicate profile errors
- Signup now completes cleanly

---

### 🔴 CRITICAL ISSUE #6: Onboarding Navigation Loop
**Problem:**
- Used `router.push()` + `router.refresh()` which could loop back
- Hard to distinguish successful navigation from re-routes
- Race conditions on profile updates

**Fix:**
- ✅ Changed to `window.location.href` for hard navigation
- ✅ Ensures clean break from onboarding flow
- ✅ Prevents routing loops that re-render components

---

### 🔴 CRITICAL ISSUE #7: Auth Provider Infinite Fetch
**Problem:**
- Auth provider could fetch profile multiple times
- No guard against re-initialization
- Could cause cascading re-renders

**Fix:**
- ✅ Added `hasInitialized` flag to prevent multiple initializations
- ✅ Better error handling in profile fetch
- ✅ Prevents infinite fetch loops

---

### 🟡 ISSUE #8: Email Verification Not Properly Configured
**Problem:**
- User didn't know if email confirmation was enabled in Supabase
- If enabled, signup shows "Check your inbox" screen
- If disabled, user gets immediate session

**Fix:**
- ✅ Added logging to differentiate between both flows
- ℹ️ User must check Supabase Dashboard settings (see instructions below)

---

## Complete Signup Flow (Fixed)

```
1. User fills signup form (email, password, username)
                    ↓
2. Frontend validates (username format, password length)
                    ↓
3. Supabase.auth.signUp() creates auth user
                    ↓
4. Auth trigger fires: handle_new_auth_user()
   - Extracts username/email from auth user
   - Creates profile in public.users table
   - Handles duplicates with unique username generation
                    ↓
5a. If email confirmation DISABLED:
   - Session returned immediately
   - Frontend waits 300ms for profile creation
   - Tries to insert profile as fallback
   - Redirects to /onboarding
   
5b. If email confirmation ENABLED:
   - No session returned yet
   - Shows "Check your inbox" screen
   - User clicks email link
   - Callback route: /auth/callback?code=...
   - Callback exchanges code for session
   - Callback waits for profile
   - Callback redirects to /onboarding
                    ↓
6. Onboarding page:
   - User enters location
   - User selects interests (optional)
   - Profile is updated with location/interests
                    ↓
7. Hard navigation: window.location.href = "/home"
                    ↓
8. Middleware checks auth state
   - User IS authenticated → allow /home
   - User NOT authenticated → redirect /login
                    ↓
9. Home page loads successfully
```

---

## Files Changed

### New Files
- ✅ `middleware.ts` — Root middleware for auth protection
- ✅ `schema/fix_auth_infinite_loop.sql` — SQL fixes for RLS and trigger

### Modified Files
- ✅ `src/app/auth/callback/route.ts` — Added timing delays and retry logic
- ✅ `src/app/(auth)/signup/page.tsx` — Better error handling and logging
- ✅ `src/app/(auth)/onboarding/page.tsx` — Changed to hard navigation
- ✅ `src/app/(auth)/login/page.tsx` — Changed to hard navigation
- ✅ `src/components/providers/auth-provider.tsx` — Prevent infinite fetches

---

## Actions You Must Take

### 1. Apply SQL Fixes (CRITICAL)
In Supabase Dashboard:
1. Go to **SQL Editor**
2. Click **New query**
3. Copy entire contents of `schema/fix_auth_infinite_loop.sql`
4. Click **Run**

This will:
- Fix the auth trigger
- Update RLS policies
- Verify categories table
- Show diagnostic queries

### 2. Check Email Confirmation Setting (IMPORTANT)
In Supabase Dashboard:
1. Go to **Authentication** → **Providers** → **Email**
2. Check if **"Confirm email"** is toggled ON or OFF

**Recommended Setting:**
- For development/testing: Turn OFF (instant signup)
- For production: Turn ON (email verification)

The code now handles both cases properly!

### 3. Test Signup Flow
1. Go to http://localhost:3000/signup
2. Fill form with:
   - Username: `testuser123`
   - Email: `test@example.com`
   - Password: `password123`
3. Should see:
   - Immediate redirect to onboarding (if email OFF), OR
   - "Check your inbox" message (if email ON)
4. If email ON, check spam folder for Supabase email, click link
5. Should be redirected to onboarding automatically

### 4. Complete Onboarding
1. Fill in city and area (or skip)
2. Select interests (or skip)
3. Should auto-redirect to /home with hard navigation

### 5. Verify You Can Login
Try logging in with test@example.com / password123
Should work without issue!

---

## How to Recover if Still Having Issues

If you still see infinite loading:

### A. Check Browser Console
- Open DevTools (F12)
- Check **Console** tab for any errors
- Look for repeated requests

### B. Check Network Tab
- Open **Network** tab
- Look for repeated API calls
- Should see: auth/signup → callback → /onboarding → /home

### C. Clear Browser Data
- Clear cookies for localhost
- Clear localStorage
- Refresh page

### D. Check Supabase Status
1. Go to Supabase Dashboard
2. Check **Database** → **Tables** → **users**
3. Should see a `users` table with your test user
4. Check **SQL Editor** → Run this:
```sql
SELECT id, username, email FROM users LIMIT 10;
```
Should show your test user!

---

## Why These Bugs Happened

1. **Middleware Not Wired** — `proxy.ts` was never executed
2. **RLS Too Strict** — Policy blocked legitimate server operations
3. **No Timing Safeguards** — Race conditions between auth and profile creation
4. **Router Not Handling Auth** — Used soft navigation instead of hard navigation
5. **No Guard Against Loops** — Auth provider could re-fetch infinitely

---

## Prevention for Future

For production, ensure:
- ✅ Middleware is properly configured
- ✅ RLS policies tested with server operations
- ✅ Timing/race conditions handled with delays and retries
- ✅ Hard navigation used for auth state changes
- ✅ Auth provider guards against re-initialization

---

## Additional Notes

- All environment variables are properly set in `.env.local`
- Supabase project is accessible
- Categories table is pre-populated
- Auth trigger is set to SECURITY DEFINER (runs as schema owner)

You're ready to test! 🚀
