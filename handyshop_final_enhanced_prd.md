# HANDYSHOP — FINAL ENHANCED PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Social-First Local Shopping Discovery Platform

---

# 1. PROJECT OVERVIEW

## Product Name
HandyShop

---

# 2. CORE PRODUCT IDEA

HandyShop is a social-first local shopping discovery platform designed for local shop owners and nearby buyers.

The platform combines:
- Instagram-style social discovery
- Pinterest-style exploration
- Local market discovery
- Lightweight social commerce

The main purpose is NOT traditional e-commerce.

The platform is designed to:
- help local shops market products visually
- help buyers discover hidden nearby shops
- create addictive local discovery feeds
- digitally amplify physical local shopping

The platform should feel:
- premium
- minimal
- modern
- Gen Z-friendly
- smooth and responsive
- visually immersive

The platform should NOT feel like:
- Amazon
- Flipkart
- inventory software
- admin-heavy marketplace systems

The emotional core of the product is:
> discovering visually attractive nearby products and hidden local shops through a premium social feed.

---

# 3. MVP GOAL

The MVP goal is NOT full commerce.

The MVP goal is:
- local product discovery
- social browsing
- nearby shop visibility
- seller marketing
- user retention through discovery
- social engagement
- scalable social-commerce architecture

Commerce/payment systems are intentionally deferred.

---

# 4. MVP SCOPE

## MUST BE IMPLEMENTED

### Main Tabs
1. Home
2. Trends
3. QuickLook
4. Chats (UI only, non-functional placeholder)
5. Profile

---

# 5. MAIN USER TYPES

## Universal Account System

There are NOT separate buyer/seller registrations.

All users use one universal account system.

Users can:
- browse normally
- later become sellers

---

# 6. SELLER CONVERSION FLOW

A normal user becomes a seller by:
1. opening profile
2. selecting "Start Selling" / "Setup Shop"
3. completing seller profile setup
4. selecting category
5. adding shop information
6. confirming location

After setup:
- account flag changes to seller
- seller tools unlock
- products tab becomes active
- seller profile becomes discoverable in category search

Seller setup should remain lightweight and fast.

---

# 7. CORE NAVIGATION STRUCTURE

## Bottom Navigation

### 1. Home
Contains:
- Displays section at top
- Personalized feed below

Purpose:
- immersive scrolling
- nearby discovery
- followed sellers
- personalized algorithm feed

Feed should support:
- infinite scrolling
- lazy loading
- smooth transitions
- responsive media loading

---

### 2. Trends
Instagram Explore × Pinterest hybrid.

Contains:
- search bar
- filters
- masonry/grid layout
- nearby products
- trending products
- category discovery
- search results

Purpose:
- intentional discovery
- category browsing
- viral discovery
- nearby hidden shop exploration

---

### 3. QuickLook
Short-form vertical video experience.

Purpose:
- immersive scrolling
- product discovery
- fashion/cosmetic-focused engagement

IMPORTANT:
QuickLook content should remain visually distinct from normal posts.

QuickLook should prioritize:
- vertical content
- engagement velocity
- watch time
- interaction retention

---

### 4. Chats
UI placeholder only for MVP.

Architecture should support future implementation.

DO NOT fully implement messaging backend yet.

Future-ready architecture should support:
- direct messaging
- media sharing
- product sharing
- negotiation
- seller support chats

---

### 5. Profile
Contains:
- profile image
- username
- bio
- category
- seller/buyer state
- post count
- followers/following
- edit profile button
- analytics button
- display highlights
- tabs:
  - Posts
  - Products
  - Picks (private only)

Profile pages should feel:
- clean
- premium
- minimal
- social-first

---

# 8. DISPLAYS SYSTEM

Displays are equivalent to Instagram Stories.

Displays:
- last 24 hours
- appear at top of Home
- can contain photos/videos
- can be uploaded by both buyers and sellers

Users can:
- share posts into Displays
- view followed users’ Displays
- tap to advance
- hold to pause
- swipe to next user

Behavior should mimic modern social story systems.

## Display Visual Rules
- active/unviewed displays should show highlighted ring
- viewed displays should appear dimmed
- displays ordered by relevance and recency
- followed accounts prioritized first

## Display Sharing Flow
Users can:
- share their own posts into displays
- share discovered posts into displays
- repost interesting products socially

Shared displays should maintain:
- original attribution
- clickable source post
- linked seller visibility

This creates community-driven product discovery.

---

# 9. POSTS SYSTEM

## IMPORTANT ARCHITECTURE RULE

Posts and Products are separate entities.

This is mandatory.

Posts are discovery/social content.
Products are structured business entities.

This architecture must support:
- multiple products per post
- one product reused across multiple posts
- future analytics scalability
- sponsored content later
- recommendation systems later

---

# 10. PRODUCT SYSTEM

Products are structured business objects.

Products contain:
- title
- price
- stock
- images
- optional variants
- optional sizes
- optional delivery info
- product status
- linked seller
- category
- archived status

Products are attached to posts.

## Product Creation Flow
Seller can:
1. create products separately
2. later attach products while creating posts

OR:
1. create products directly during post creation

Product architecture should remain flexible.

---

# 11. POST STRUCTURE

Posts are social/discovery objects.

Posts contain:
- images/videos
- caption
- tags
- linked products
- engagement metrics
- category metadata
- location metadata

Posts may:
- contain multiple media items
- reference multiple products

One product may appear in multiple posts.

## Supported Media Ratios
- 1:1
- 4:5
- 9:16
- 16:9

Media should:
- auto-fit intelligently
- preserve quality
- avoid aggressive cropping
- remain visually clean in feed layouts

---

# 12. POST UI BEHAVIOR

## Feed UI Must Remain Minimal

Visible immediately:
- media
- username
- profile image
- caption preview
- appreciate button
- picked/save button
- comment button
- share button
- buy/view button

---

## Caption Behavior
Captions should:
- initially show limited lines
- expand on click
- remain scrollable when expanded

---

## Product Details
Product details should NOT overload feed UI.

When clicking:
- Buy
OR
- View Product

Open:
- modal
OR
- bottom sheet overlay

This overlay contains:
- product info
- stock
- map button
- sizes
- delivery info
- linked products
- seller details

Overlay UI should:
- feel modern
- remain minimal
- avoid marketplace clutter

---

# 13. CONTENT TYPES

## Standard Posts
Appear in:
- Home
- Trends
- Profile

Supports:
- photos
- carousels
- videos

---

## QuickLook Content
Dedicated vertical-first content.

Appears in:
- QuickLook tab
- selective feed recommendations

Should prioritize:
- fashion
- cosmetics
- lifestyle products

QuickLook algorithm should prioritize:
- watch time
- replay behavior
- engagement velocity
- local trend popularity

---

# 14. PROFILE ARCHITECTURE

## Public Profiles
Profiles are public by default.

Any user can:
- view posts
- view products
- follow accounts

---

## Follow System
Users can:
- follow accounts
- unfollow accounts
- view follower/following counts

Follow system should heavily influence:
- Home feed ranking
- display prioritization
- recommendations

## Follow Suggestions
During onboarding:
- suggested accounts should appear
- suggestions should be skippable
- suggestions based on:
  - location
  - category
  - popularity
  - trending shops

---

# 15. PROFILE CATEGORIES

Seller profiles must include categories.

Examples:
- Clothing
- Cosmetics
- Electronics
- Handmade
- Furniture
- Accessories
- Wearables
- Other

Category selected during seller setup.

Category auto-links to:
- search
- recommendations
- profile labeling
- discovery systems

Clothing should receive primary UX optimization during MVP.

---

# 16. FEED ALGORITHM

The Home feed should combine:

## 1. Following-based content
Posts from followed accounts.

---

## 2. Nearby discovery
Location-aware recommendations.

---

## 3. Interest-based learning
Based on:
- likes/appreciates
- saves/picks
- watch time
- searches
- profile visits
- category interaction

---

## 4. Trending amplification
Highly engaging posts may spread beyond local areas.

---

## Feed Ranking Philosophy
Feed ranking should combine:
- follows
- nearby relevance
- recency
- engagement
- category relevance
- interaction history

The ranking architecture must support adjustable weighting later.

Avoid hardcoded ranking logic.

---

# 17. SEARCH & TRENDS

Search should support:
- usernames
- tags
- categories
- products
- profiles
- captions

---

## Search Filters
Filters include:
- Nearby
- Trending
- Following
- For You

---

## Search Ranking
Search should prioritize:
- nearby relevance
- verified/trusted accounts later
- engagement quality
- category relevance
- keyword matching
- profile activity

Search indexing should support:
- usernames
- tags
- captions
- product titles
- categories

---

# 18. MEDIA LIMITS

## Posts
- max 10 media items
- max 50MB video upload
- max 10MB per image

---

## Displays
- image auto-duration: ~5 seconds
- videos play until completion

---

## Upload Optimization
Use:
- client-side image compression
- lightweight video optimization
- responsive media delivery

Prioritize:
- smooth loading
- low bandwidth usage
- feed responsiveness

---

# 19. ARCHIVE SYSTEM

Posts should NOT auto-delete.

After 60 days:
- move to archive state
- reduce discovery priority
- remain visible on profile

Seller can reactivate archived posts later.

Use:
- soft delete architecture
- archive-first approach

Avoid permanent deletion where unnecessary.

---

# 20. ENGAGEMENT SYSTEM

## Primary Actions
- Appreciate
- Pick
- Comment
- Share
- Follow

Picks/Saves should remain private to the user.

---

# 21. COMMENT SYSTEM

Avoid strict low comment limits.

Instead implement:
- cooldown rate limiting
- duplicate prevention
- spam prevention

Recommended:
- max comment frequency limit
- 300–500 character comment limit

---

# 22. USER BLOCKING & MODERATION

## User-Level Blocking
Users can:
- block accounts
- mute accounts
- hide content

Blocked accounts should:
- disappear from feed
- disappear from recommendations
- disappear from displays

---

## Admin-Level Moderation
Admins can:
- review reports
- remove posts
- suspend users
- block spam accounts
- manage moderation queue

Admin panel should support:
- report review page
- user management page
- moderation dashboard
- flagged content queue

---

# 23. REPORT SYSTEM

Three-dot menu should support:
- Report
- Block
- Share
- Hide
- Copy Link

For own posts:
- Edit
- Delete
- Archive
- View Analytics

---

## Report Categories
Examples:
- Spam
- Fake products
- Inappropriate media
- Shop does not exist
- Harassment
- Scam behavior
- Other

---

# 24. ANALYTICS

Seller analytics should remain lightweight for MVP.

Metrics:
- profile views
- post views
- appreciates
- picks
- follower growth
- map opens
- product clicks

Analytics should remain:
- simple
- minimal
- social-first

Avoid enterprise dashboard complexity.

---

# 25. MAP INTEGRATION

DO NOT build custom maps system.

Use:
- Google Maps redirect integration

Behavior:
- open navigation externally
- route user to shop location

## Location System
Store:
- city
- area
- optional coordinates
- optional manual override

Location should influence:
- recommendations
- nearby feeds
- search ranking
- trends ranking

---

# 26. CHAT SYSTEM

MVP:
- placeholder UI only
- architecture-ready
- non-functional initially

Future:
- seller-buyer chat
- product sharing
- social sharing
- negotiation

Architecture should remain compatible with future realtime systems.

---

# 27. AUTHENTICATION

Use Supabase Auth.

MVP supports:
- username/password
- email/password

Username must be unique globally.

Authentication architecture should support:
- email verification later
- OTP later
- Google login later

---

# 28. USERNAME RULES

Usernames:
- unique globally
- lowercase normalized
- editable with cooldown later
- no spaces
- allow underscores and numbers

---

# 29. STORAGE & PERFORMANCE

## IMPORTANT
Do NOT over-engineer infrastructure during MVP.

Use:
- Supabase Storage
- PostgreSQL
- lightweight optimization

---

## Compression Strategy
Prefer:
- client-side image optimization
- lightweight video compression before upload

---

## Performance Rules
Must support:
- lazy loading
- infinite scroll optimization
- optimized media rendering
- responsive touch targets
- efficient feed rendering

Avoid:
- unnecessary re-renders
- heavy GPU effects
- large blocking animations

---

# 30. TECH STACK

## Frontend
- Next.js
- React
- TypeScript

---

## Styling
- Tailwind CSS

---

## UI Libraries
Agent may use:
- shadcn/ui
- Lucide icons
- Framer Motion
- Swiper/carousel libraries
- Masonry grid libraries
- Gesture libraries
- Modal/bottom-sheet libraries

Use libraries intelligently where beneficial.

---

## Backend
- Supabase

---

## Database
- PostgreSQL (Supabase)

---

## Storage
- Supabase Storage

---

## Authentication
- Supabase Auth

---

# 31. DESIGN SYSTEM

## Design Philosophy
- luxury minimalist
- dark/light theme support
- clean spacing
- modern typography
- smooth interactions
- subtle animations
- Gen Z social feel

Avoid:
- excessive gradients
- over-animation
- GPU-heavy effects
- visual clutter

---

## Theme System
Use:
- centralized color variables
- scalable theme tokens
- dark/light mode architecture

---

## UI Inspirations
Inspired by:
- Instagram
- Pinterest
- Threads
- TikTok
- Apple-style minimal spacing

Avoid:
- marketplace clutter
- dashboard-heavy appearance
- enterprise admin styling

---

# 32. RESPONSIVE DESIGN

MVP is:
- mobile-first responsive web app

Must work excellently on:
- phones
- tablets
- desktop

Future architecture should support:
- React Native conversion
- PWA support

---

# 33. RATE LIMITING

Soft limits:
- 15 posts/day
- spam prevention
- duplicate upload prevention later

Displays may also receive soft cooldowns later.

Comment systems should support:
- spam prevention
- cooldown logic
- anti-flooding

---

# 34. FUTURE FEATURES (NOT MVP)

## Commerce
- checkout system
- payments
- carts
- delivery tracking

---

## Messaging
- real-time chat
- media sharing
- negotiation

---

## Notifications
- push notifications
- post notifications
- follow notifications

Notification architecture should remain event-ready for future implementation.

---

## Monetization
Future architecture should support:
- sponsored posts
- promoted products
- premium seller accounts
- boosted visibility
- analytics upgrades
- verified seller badges
- local trend sponsorships

DO NOT implement monetization in MVP.

---

# 35. ADMIN PANEL

Admin architecture must support:
- user search
- post moderation
- report management
- user suspension
- user blocking
- content removal

---

## IMPORTANT SECURITY NOTE
DO NOT hardcode production credentials.

Use:
- environment variables
- seeded admin setup
- secure credential handling

---

# 36. DATABASE ARCHITECTURE REQUIREMENTS

Generate:
- normalized scalable schema
- proper relationships
- optimized indexes
- scalable feed-ready structure

Architecture must support future:
- recommendations
- analytics
- monetization
- messaging
- notifications
- multi-product posts

without major restructuring.

---

# 37. REQUIRED DATABASE ENTITIES

Minimum expected entities include:

- users
- seller_profiles
- posts
- products
- post_products
- displays
- comments
- follows
- picks
- appreciates
- reports
- categories
- analytics
- archived_posts
- blocked_users
- muted_users
- search_indexes
- moderation_logs

Agent may improve schema intelligently if needed.

---

# 38. SUPABASE REQUIREMENTS

Generate:
- schema.sql
- storage bucket setup
- RLS policies
- indexes
- relationship constraints
- bucket permissions

The generated schema.sql should be directly pasteable into Supabase SQL editor.

---

## Storage Bucket Structure
Recommended buckets:
- posts-media
- displays-media
- profile-images
- product-images

Architecture should remain scalable.

---

## RLS Expectations
Users should:
- edit only their own content
- manage only their own profile
- manage only their own products

Public users should:
- read public posts
- read public profiles
- view public products

Admins should:
- bypass moderation restrictions
- manage reports
- moderate users

Analytics should remain private to account owners.

---

# 39. ENVIRONMENT VARIABLES

Generate:
- `.env.local`
- example env template

Include placeholders for:
- Supabase URL
- Supabase anon key
- service role key
- optional Google Maps integration variables

User will manually paste keys later.

---

# 40. AI AGENT INSTRUCTIONS

The implementation agent has authority to:
- optimize schemas
- improve architecture
- adjust component structure
- improve scalability
- prevent conflicts
- optimize queries
- refine UX
- improve indexing
- improve feed efficiency

BUT:
the core product philosophy and UX direction defined in this PRD must remain preserved.

Agent should:
- avoid conflicts
- preserve modularity
- maintain clean architecture
- preserve scalability
- maintain social-first UX

---

# 41. IMPORTANT PRODUCT PHILOSOPHY

HandyShop is NOT:
- a traditional marketplace
- inventory software
- transaction-first platform

HandyShop IS:
- a social-first local discovery ecosystem
- a visibility platform for local shops
- a visually immersive nearby shopping network
- a modern digital local market

The platform should prioritize:
- discovery
- retention
- visual quality
- smooth UX
- nearby relevance
- community-driven sharing

over:
- heavy commerce systems
- operational logistics
- enterprise complexity

---

# 42. ONBOARDING FLOW

## User Registration Flow
1. Sign up/login
2. Choose username
3. Set password
4. Allow/select location
5. Choose interests/categories
6. Follow suggested accounts (optional/skippable)
7. Enter app immediately

Onboarding should feel:
- lightweight
- modern
- fast
- social-first

Avoid long forms.

---

## Cold Start Logic
If user has:
- no follows
- low interactions
- no nearby sellers

System should:
- recommend trending nearby content
- recommend category-based content
- recommend popular sellers
- populate feed intelligently

Avoid empty feed experiences.

---

# 43. SEO & PWA STRATEGY

Since the app is feed-heavy and authentication-centric:
- SEO is secondary during MVP
- PWA readiness is preferred

Future architecture should support:
- installable web app
- app-like mobile experience
- push notifications later

---

# 44. FINAL IMPLEMENTATION NOTES

The generated system should:
- avoid architecture conflicts
- remain modular
- support future scaling
- remain component-driven
- maintain clean code organization
- support iterative AI-assisted development
- remain easy to extend later

All features, components, schemas, policies, and structures should be designed with:
- scalability
- maintainability
- modularity
- performance
- responsive UX

in mind from the beginning.

