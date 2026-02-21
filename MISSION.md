# Mission: Collaborative Classroom with AI-Powered Check-Ins

## Vision
A web app where Teachers teach on a virtual whiteboard and Students join the same session via URL. An AI Agent Swarm facilitates understanding checks and peer-to-peer learning.

## MVP Scope

### Core Flow (Demo Scenario)
1. **Teacher creates a session** → gets a shareable URL
2. **Students join** the session and see the whiteboard in real-time
3. **Teacher teaches** a concept on the whiteboard
4. **Teacher presses "Check-In"** → triggers the Agent Swarm
5. **Agent Swarm checks in with each student** via chat — asks questions to gauge understanding
6. **Agent synthesizes results** — identifies what each student understands and doesn't
7. **Complementary pairing** — Students who understand concept A but not B are paired (via chat) with students who understand B but not A, so they teach each other
8. **Teacher receives a concise report** — what students struggled with, what was well understood, what to revisit
9. **Class resumes** — Teacher continues the lesson with actionable insights

### Key Features (MVP)
- Shared whiteboard session (Teacher + Students)
- Session/room management (create, join via URL, role assignment: Teacher vs Student)
- "Check-In" button (Teacher only) that kicks off the Agent Swarm
- Agent chat with each student (1-on-1 check-in conversations)
- Synthesis engine — aggregates understanding across all students
- Complementary student pairing + peer chat
- Teacher dashboard/report — concise summary of class understanding

### Stretch Goals (Post-MVP)
- **Evolving peer chats** — When a peer chat reaches consensus (everyone understands the paired concepts), the agent re-evaluates whether new gaps surfaced during the conversation. If so, the chat evolves: new topics are introduced, or students get re-paired with different partners to address the newly discovered misunderstandings. The peer learning phase becomes fluid rather than one-shot.
- Educational artifact generation (quizzes, games, exercises) by a Teacher Assistant Agent for concepts students struggled with
- Richer Teacher dashboard with per-student breakdowns
- Persistent session history

## Architecture Notes

### Roles
- **Teacher**: Creates session, draws on whiteboard, triggers check-ins, receives reports
- **Student**: Joins session via URL, views whiteboard, responds to agent check-ins, participates in peer chats

### Agent Swarm Design
- One agent instance per student for the check-in phase (parallel conversations)
- A synthesis agent that aggregates individual check-in results
- A pairing agent that matches students with complementary knowledge gaps
- All agents coordinate to produce: (1) peer pairings, (2) teacher report

### Tech Stack
- **Frontend**: Next.js (App Router), React, TypeScript, TailwindCSS
- **Backend/DB**: Convex (real-time serverless)
- **Whiteboard**: Excalidraw
- **AI**: AI SDK + OpenAI
- **UI**: shadcn/ui, Radix UI

### Guiding Principles
- **MVP-first**: Skip polish, get the core loop working end-to-end
- **Real-time**: Leverage Convex for live updates across all participants
- **Keep it simple**: Minimal UI, focus on the flow working correctly
