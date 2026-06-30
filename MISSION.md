# Mission: Collaborative Classroom With AI-Powered Check-Ins

## Vision

Learn& helps a Teacher run a live whiteboard lesson, ask Students quick AI-guided comprehension questions, and form peer discussion rooms where complementary knowledge gaps can be filled by classmates.

## MVP Scope

### Core Flow

1. Teacher creates a session and gets a shareable URL.
2. Students join the session and see the whiteboard in real time.
3. Teacher teaches a concept on the whiteboard.
4. Teacher presses "Check-In" to synthesize the lesson and start the AI check-in phase.
5. AI checks in with each Student through a one-on-one chat.
6. AI synthesizes each Student's strengths and gaps.
7. AI proposes complementary study groups.
8. Teacher sends Students into discussion rooms.
9. Teacher reviews group summaries and resumes the lesson.

### Key Features

- Shared whiteboard session for Teacher and Students.
- Session creation, joining, and role assignment.
- Teaching capture with snapshot transcription and lesson synthesis.
- One-on-one AI check-in conversations.
- Complementary student pairing.
- Peer discussion rooms with group chat and group whiteboard.
- Teacher dashboard and group summaries.

### Stretch Goals

- Evolving peer chats that can introduce newly discovered gaps.
- Generated exercises or quizzes for concepts Students struggled with.
- Richer Teacher dashboard with per-Student breakdowns.
- Persistent session history.

## Architecture Notes

### Roles

- **Teacher**: Creates the session, draws on the whiteboard, starts check-ins, sends rooms, and reviews reports.
- **Student**: Joins the session, watches the whiteboard, responds to AI check-ins, and participates in peer rooms.

The code still contains role names like `creator`, `professor`, and `participant`. Treat `creator` and `professor` as Teacher roles, and `participant` as Student.

### Agent Design

- Check-in agent: asks each Student short targeted questions.
- Synthesis agent: extracts a comprehension profile from each check-in.
- Pairing agent: proposes complementary groups.
- Group assistant: nudges peer discussion without replacing peer teaching.

### Tech Stack

- **Frontend**: Next.js App Router, React, TypeScript, Tailwind CSS
- **Deployment**: Cloudflare Workers through OpenNext
- **Backend/DB**: Convex
- **Auth**: Convex Auth
- **Whiteboard**: Excalidraw
- **AI**: OpenRouter through AI SDK
- **UI**: shadcn/ui and Radix UI

### Guiding Principles

- MVP first: keep the core loop working end to end.
- Real-time by default: use Convex live queries where they simplify the interface.
- Keep workflows local: route files and UI modules should call deeper workflow modules instead of knowing the whole sequence.
- Keep deployment explicit: Cloudflare Worker env and Convex env are separate.
