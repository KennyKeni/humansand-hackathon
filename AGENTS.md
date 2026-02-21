# CLAUDE.md

## Project Overview

AI-powered collaborative learning platform where a professor teaches on a shared whiteboard, and an AI agent monitors comprehension, dynamically pairs students into complementary study groups, and facilitates peer learning — all in real time.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Backend/DB**: Convex (real-time queries, mutations, actions)
- **Auth**: Convex Auth (Anonymous + display name)
- **Whiteboard**: Excalidraw (embedded, professor-controlled)
- **AI**: Anthropic Claude API (via Convex Actions)
- **Styling**: Tailwind CSS + shadcn/ui
- **Language**: TypeScript throughout

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Next.js Frontend                  │
│                                                     │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  Whiteboard   │  │  Chat UI   │  │  Dashboard  │ │
│  │  (Excalidraw) │  │  (custom)  │  │ (professor) │ │
│  └──────┬───────┘  └─────┬──────┘  └──────┬──────┘ │
└─────────┼────────────────┼─────────────────┼────────┘
          │                │                 │
┌─────────┼────────────────┼─────────────────┼────────┐
│         ▼                ▼                 ▼        │
│                    Convex Backend                    │
│                                                     │
│  Queries (real-time)  │  Mutations  │  Actions (AI) │
│                                                     │
│  Tables: users, channels, messages, sessions,       │
│          whiteboardSnapshots, comprehensionScores    │
└─────────────────────────────────────────────────────┘
```

## Auth Strategy

- Current branch (`kenny/group-chat`): anonymous sign-in with display name capture for fast session entry.
- Role policy for this branch: session creator is professor, joiners are students.
- No OAuth planned for this project.

## Core Concepts

### 1. Whiteboard Monitoring

The professor draws/teaches on an Excalidraw whiteboard. The AI periodically snapshots the whiteboard state (elements, text) and processes it to understand what topics are being taught.

### 2. Comprehension Probing

The AI sends targeted questions to individual students via chat: "Do you understand concept X?" Based on responses, it builds a per-student comprehension profile tracking which topics each student does/doesn't understand.

### 3. Complementary Group Formation

The core innovation. When Student A understands X but not Y, and Student B understands Y but not X, the AI creates a group chat between them. The idea: peer teaching reinforces the teacher's understanding while filling the learner's gap.

### 4. AI as Participant

The AI joins group chats as a peer — not a lecturer. It nudges discussion, asks clarifying questions, and sends supplementary materials (links, explanations) when students get stuck.

### 5. Professor Feedback Loop

The AI summarizes group chat activity and comprehension data back to the professor, giving them real-time insight into what the class is struggling with.

## Convex Schema (High Level)

```typescript
// convex/schema.ts

users; // id, name, email, role ("professor" | "student")
sessions; // id, professorId, title, active, createdAt
channels; // id, sessionId, type ("direct" | "group"), memberIds[], createdBy
messages; // id, channelId, authorId, body, role ("student" | "ai"), createdAt
whiteboardSnapshots; // id, sessionId, elements (JSON), extractedTopics[], timestamp
comprehension; // id, sessionId, userId, topic, understood (boolean), timestamp
```

## Convex Functions

```
convex/
├── auth.ts              # Convex Auth config (Anonymous sign-in)
├── messages.ts          # send, list by channel (query + mutation)
├── channels.ts          # create, list, addMembers (group formation)
├── sessions.ts          # create/end teaching sessions
├── whiteboard.ts        # saveSnapshot mutation
├── comprehension.ts     # record scores, query by student/topic
└── ai.ts                # Actions — call Claude API, process whiteboard,
                         #   probe students, form groups, summarize chats
```

## Key Flows

### Professor starts a session

1. Professor creates a session → gets a shareable link
2. Students join → added to `users` table with session association
3. Whiteboard becomes active, AI monitoring begins

### AI probes understanding

1. Convex scheduled function triggers after whiteboard changes
2. `ai.ts` action sends whiteboard snapshot to Claude → extracts topics
3. AI sends comprehension questions to students via direct message channels
4. Student responses are processed → `comprehension` table updated

### Group formation

1. AI queries comprehension table for complementary gaps
2. Creates a new group channel with paired students
3. Sends an opening message explaining why they were paired
4. AI monitors the group chat, participates as needed

### Summary to professor

1. Periodic action summarizes active group chats
2. Aggregates comprehension data across all students
3. Surfaces to professor dashboard: "60% of students struggling with Topic Y"

## File Structure

```
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Landing / join session
│   ├── session/[id]/
│   │   ├── page.tsx                # Main session view
│   │   ├── whiteboard.tsx          # Excalidraw embed
│   │   ├── chat.tsx                # Chat panel (channels + messages)
│   │   └── dashboard.tsx           # Professor-only comprehension view
│   └── ConvexClientProvider.tsx
├── components/
│   ├── ui/                         # shadcn components (ScrollArea, Input, Button, Avatar)
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   ├── ChannelSidebar.tsx
│   └── ComprehensionCard.tsx
├── convex/
│   ├── schema.ts
│   ├── auth.ts
│   ├── messages.ts
│   ├── channels.ts
│   ├── sessions.ts
│   ├── whiteboard.ts
│   ├── comprehension.ts
│   └── ai.ts
├── lib/
│   └── utils.ts
└── public/
```

## Development Commands

```bash
npm install
npx convex dev          # Start Convex backend (runs in background, syncs functions)
npm run dev             # Start Next.js dev server
```

## Environment Variables

```env
CONVEX_DEPLOYMENT=      # Auto-set by `npx convex dev`
NEXT_PUBLIC_CONVEX_URL= # Auto-set by `npx convex dev`
ANTHROPIC_API_KEY=      # For AI actions
```

## Hackathon Priorities

1. **Must have**: Whiteboard + chat working in real-time (Excalidraw + Convex)
2. **Must have**: AI reads whiteboard and asks students comprehension questions
3. **Must have**: AI pairs students into group chats based on complementary knowledge
4. **Nice to have**: AI joins group chats as a participant
5. **Nice to have**: Professor dashboard with comprehension summary
6. **Stretch**: AI sends supplementary materials/resources to students

## Code Style

- TypeScript strict mode
- Functional components with hooks
- No em dashes in any text or comments
- Convex functions use the standard `query`, `mutation`, `action` wrappers
- Chat UI is custom-built with shadcn/ui primitives, not a chat library
- Keep components small and focused
