# HandyShop

> Social-first local shopping discovery platform

HandyShop helps local shop owners market products visually and helps buyers discover hidden nearby shops through an immersive, Instagram-style social feed.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + React 19 + TypeScript |
| Styling | Tailwind CSS v4 + CSS Modules |
| UI | Lucide Icons + Framer Motion |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Maps | Google Maps redirect |

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Supabase project

### Setup

1. **Clone the repo**
   ```bash
   git clone <repo-url>
   cd HandyShop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Supabase URL and keys in `.env.local`.

4. **Setup database**
   - Open Supabase SQL Editor
   - Paste the contents of `schema/supabase_schema.sql`
   - Run it to create all tables, buckets, policies, and triggers

5. **Run development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Signup, Onboarding (no bottom nav)
│   ├── (app)/            # Main app with bottom navigation
│   │   ├── home/         # Discovery feed + Displays
│   │   ├── trends/       # Search + Explore grid
│   │   ├── quicklook/    # Short-form vertical video
│   │   ├── chats/        # Messaging (placeholder)
│   │   └── profile/      # User profile + Setup Shop
│   ├── globals.css       # Design system tokens
│   └── layout.tsx        # Root layout
├── components/
│   ├── display/          # Display stories bar
│   ├── navigation/       # Bottom tab nav
│   ├── post/             # Post card
│   ├── product/          # Product bottom sheet
│   └── providers/        # Theme + Auth context
├── lib/
│   └── supabase/         # Client, server, middleware
└── types/                # TypeScript interfaces
```

## Features (MVP)

- 🏠 **Home** — Discovery feed with Displays (stories)
- 🔍 **Trends** — Search, filter, and explore nearby products
- ⚡ **QuickLook** — Short-form product videos
- 👤 **Profile** — Social profile with posts/products/picks tabs
- 🏪 **Seller Setup** — Convert buyer to seller in 3 steps
- 🔐 **Auth** — Email/password with onboarding flow
- 🌙 **Dark/Light Mode** — System-aware theme

## License

Private — All rights reserved.
