# Learn&

AI-powered collaborative learning platform where a Teacher teaches on a shared whiteboard, Students join in real time, and AI agents check comprehension, form complementary study groups, and help peer discussions stay useful.

**Live demo: [learnand.kennykeni.com](https://learnand.kennykeni.com)**

## How It Works

1. **Teacher teaches** on a shared Excalidraw whiteboard while AI captures snapshots and synthesizes lesson context.
2. **AI checks in** with each Student through a short chat to probe understanding.
3. **Complementary grouping** pairs Students with different strengths and gaps.
4. **AI joins group chats** as a participant, nudging discussion when groups get stuck.
5. **Teacher gets feedback** through summaries of group activity and comprehension data.

## Tech Stack

- **Framework**: Next.js App Router
- **Deployment**: Cloudflare Workers through OpenNext
- **Backend/DB**: Convex for real-time queries, mutations, and actions
- **Auth**: Convex Auth with anonymous sign-in and display name capture
- **Whiteboard**: Excalidraw with real-time sync
- **AI**: OpenRouter through AI SDK
- **Styling**: Tailwind CSS and shadcn/ui
- **Language**: TypeScript

## Prerequisites

- `mise`
- Node `24.16.0`
- pnpm `11.x`
- A Convex account
- An OpenRouter API key
- A Cloudflare account for Worker deployment

Install the pinned local tools:

```bash
mise install
```

## Setup

```bash
pnpm install
```

Local Convex development sets the usual Convex variables:

```bash
pnpm convex:dev
```

Then run the Next.js app in another terminal:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Cloudflare Worker runtime:

```env
NEXT_PUBLIC_CONVEX_URL=https://spotted-starling-965.convex.cloud
OPENROUTER_API_KEY=...
```

Set the Worker secret with Wrangler:

```bash
pnpm exec wrangler secret put OPENROUTER_API_KEY --name learnand
```

Convex runtime:

```env
OPENROUTER_API_KEY=...
CONVEX_SITE_URL=https://spotted-starling-965.convex.site
```

Set Convex runtime variables with:

```bash
pnpm convex env set OPENROUTER_API_KEY
pnpm convex env set CONVEX_SITE_URL https://spotted-starling-965.convex.site
```

## Commands

```bash
pnpm lint              # ESLint over source files
pnpm typecheck         # TypeScript check
pnpm check             # lint, typecheck, Cloudflare type check, Next build
pnpm build             # Next.js build
pnpm build:cloudflare  # OpenNext Cloudflare bundle
pnpm preview           # Local Cloudflare preview
pnpm deploy            # Deploy Worker to Cloudflare
pnpm deploy:convex     # Deploy Convex functions
```

## Cleanup Queue

The safe hygiene pass removes unused starter assets, dormant simulation code, stale AI provider packages, and unused UI exports. Deeper architecture work should happen after stable checks are in place, in this order:

1. Extract named AI task modules for prompts, model setup, and structured outputs.
2. Add room/group access helpers for role normalization, room IDs, and membership assertions.
3. Extract teaching capture workflow behind `recordSnapshot` and `synthesize`.
4. Extract check-in workflow behind `start`, `respond`, `complete`, `proposeGroups`, and `openDiscussionRooms`.
5. Extract a `useSessionWorkspace(code)` view-model hook from the session route.

Do not delete public Convex maintenance functions or migrate `middleware.ts` to `proxy.ts` without a separate smoke test.
