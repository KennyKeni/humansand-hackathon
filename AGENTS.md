# AGENTS.md

## Project Posture

This is a hackathon-origin Learn& app. Prefer small, safe changes that keep the core demo working end to end. Do not add speculative abstractions unless they reduce current duplication or make the main workflow easier to test.

## Local Tooling

Use `mise` for runtime versions and `pnpm` for JavaScript packages.

```bash
mise install
pnpm install
```

Pinned tools live in `mise.toml`:

- Node `24.16.0`
- pnpm `11.x`

Useful commands:

```bash
pnpm convex:dev
pnpm dev
pnpm lint
pnpm typecheck
pnpm check
pnpm build:cloudflare
pnpm deploy
pnpm deploy:convex
```

## Current Stack

- Next.js App Router
- Cloudflare Workers through OpenNext
- Convex for real-time backend and auth
- Excalidraw for the whiteboard
- OpenRouter through AI SDK
- Tailwind CSS and shadcn/ui

## Domain Terms

- **Teacher**: The session creator. Code may still use `creator` or `professor`; treat those as Teacher roles.
- **Student**: A session participant. Code may still use `participant`; treat it as Student.
- **Check-in**: AI-guided one-on-one comprehension probe.
- **Discussion room**: A group chat and group whiteboard created after matching.
- **Teaching capture**: Snapshot, transcription, and synthesis flow for a lesson segment.

## Environment Separation

Cloudflare Worker runtime needs:

- `NEXT_PUBLIC_CONVEX_URL`
- `OPENROUTER_API_KEY` as a Worker secret

Convex runtime needs:

- `OPENROUTER_API_KEY`
- `CONVEX_SITE_URL`

Do not confuse `CONVEX_SITE_URL` with browser-facing `NEXT_PUBLIC_CONVEX_URL`.

## Cleanup Boundaries

Safe cleanup:

- Unused assets, dormant simulation wiring, stale direct dependencies, and unused UI exports.

Gated cleanup:

- Do not delete `convex/seed.ts`, `convex/fix.ts`, or public Convex mutations unless external usage has been checked.
- Do not rename `middleware.ts` to `proxy.ts` without a focused auth smoke test.

Architecture follow-up order:

1. Named AI task modules.
2. Room/group access helpers.
3. Teaching capture workflow.
4. Check-in workflow.
5. Session workspace view model.

## Code Style

- TypeScript strict mode.
- Functional React components and hooks.
- Keep route files and UI modules thin when a workflow module exists.
- No em dashes in new text or comments.
- Convex functions use standard `query`, `mutation`, `action`, and internal wrappers.
