// Simulate full check-in flow for all seeded students
// Run with: node scripts/simulate-checkins.mjs

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL = "https://honorable-bloodhound-480.convex.cloud";
const BASE_URL = "http://localhost:3000";
const SESSION_CODE = "AQ725K";
const SESSION_ID = "jn78aw1cfra5egw92h8f94gh8n81jrn0";

const convex = new ConvexHttpClient(CONVEX_URL);

const studentResponses = [
  "I think I understood the note values pretty well - whole notes are 4 beats, half notes are 2, etc. But I'm confused about time signatures. What does the bottom number actually mean?",
  "The staff lines mnemonic was helpful! Every Good Boy Does Fine. But I got lost when we started talking about how notes subdivide.",
  "I feel pretty solid on everything! The time signatures make sense - 4/4 means 4 quarter notes per measure.",
  "I'm struggling with basically everything. The staff, the note values, the time signatures - it all blends together.",
  "The time signatures clicked for me, especially the waltz time 3/4 idea. But I don't understand why a half note gets 2 beats.",
  "I loved learning about the FACE mnemonic for spaces! But the whole note subdivision thing was really confusing.",
  "Honestly the whole lesson was great. I already knew some music theory so this was mostly review.",
  "The note values table was super helpful visually. But I'm confused about how time signatures connect to note values.",
  "I understand the staff and note names well. The mnemonics helped a lot. But the rhythm stuff is harder for me.",
  "I got confused pretty early with the staff. I don't get why the notes are where they are. I was lost after that.",
  "The subdivision tree was the clearest part for me! But I struggle with reading notes on the staff.",
  "Time signatures are my strength - I play drums. But I've never learned to read notes on the staff.",
  "I feel okay about note values but I keep mixing up eighth and sixteenth notes.",
  "Everything about the staff was clear. But the time signatures confused me, especially waltz time.",
  "I understood most things at a surface level but I'm not confident I could explain any of it.",
];

const followUpResponses = [
  "Yeah the bottom number thing really trips me up. I know 4 means quarter notes but I don't get why.",
  "The tree diagram - when you showed whole notes splitting into half notes? I couldn't follow it.",
  "Maybe the subdivision part was slightly less clear but I get the general idea.",
  "I think the note values are the hardest. A whole note is an open circle but a half note looks almost the same?",
  "I think it's the proportional relationship? Like if a whole note is 4 beats why is a half note exactly 2?",
  "Yeah the subdivision tree. I understand things get smaller but the splitting concept was hard to follow.",
  "The only thing I'd want more practice on is maybe the staff reading. Applying the mnemonics quickly is hard.",
  "So in 4/4, each count is a quarter note? But where do half notes fit in? Do they take 2 counts?",
  "I can name the notes but I don't understand how they relate to actual timing in music.",
  "I think if I understood the staff better the rest would make more sense.",
  "I can visualize the tree but connecting that to actual staff reading is where I get lost.",
  "The mnemonics are helpful but I need practice. Pitch is brand new to me. Rhythm I've got down.",
  "Eighth notes have a flag right? And sixteenth have two? I keep getting them mixed up.",
  "The waltz time OOM-pah-pah helped a bit but I still don't fully get what makes it different from 4/4.",
  "I need more time to absorb it. The concepts make sense individually but putting them together is hard.",
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log("=== Step 1: Get session info ===");
  const teachingSession = await convex.query(api.teaching.getCaptureSession, { sessionCode: SESSION_CODE });
  console.log(`Status: ${teachingSession?.status}, Phase: ${teachingSession?.checkInPhase || "none"}`);
  console.log(`Summary: ${teachingSession?.summary ? "yes" : "no"}`);

  // Step 2: Start check-ins via API route (this doesn't need Convex auth)
  console.log("\n=== Step 2: Start check-ins ===");
  const startRes = await fetch(`${BASE_URL}/api/check-in/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionCode: SESSION_CODE, sessionId: SESSION_ID }),
  });
  const startData = await startRes.json();
  if (!startRes.ok) {
    console.error("Failed to start:", startData);
    return;
  }
  console.log(`Started ${startData.started} check-ins`);

  await sleep(3000);

  // Step 3: Get all active check-ins
  console.log("\n=== Step 3: Simulate student conversations ===");
  const status = await convex.query(api.checkIns.getSessionCheckInStatus, { sessionId: SESSION_ID });
  const activeCheckIns = status.checkIns.filter(c => c.status === "active");
  console.log(`Active check-ins: ${activeCheckIns.length}`);

  // Process 12 students, leave rest as non-responders
  const toProcess = activeCheckIns.slice(0, 12);
  const nonResponders = activeCheckIns.length - toProcess.length;
  console.log(`Processing ${toProcess.length}, leaving ${nonResponders} as non-responders\n`);

  for (let i = 0; i < toProcess.length; i++) {
    const checkIn = toProcess[i];
    const label = `Student ${i + 1}/${toProcess.length}`;
    console.log(`--- ${label} ---`);

    // Send first student message (using system mutation, no auth needed)
    await convex.mutation(api.checkIns.addStudentMessageSystem, {
      checkInId: checkIn._id,
      body: studentResponses[i],
      userId: checkIn.userId,
    });
    console.log(`  [Student] ${studentResponses[i].substring(0, 70)}...`);

    // Get AI response via API route
    const res1 = await fetch(`${BASE_URL}/api/check-in/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkInId: checkIn._id }),
    });
    const data1 = await res1.json();
    if (data1.aiResponse) {
      console.log(`  [AI] ${data1.aiResponse.substring(0, 70)}...`);
    } else {
      console.log(`  [AI] Error: ${JSON.stringify(data1)}`);
    }

    await sleep(300);

    // Send follow-up
    await convex.mutation(api.checkIns.addStudentMessageSystem, {
      checkInId: checkIn._id,
      body: followUpResponses[i],
      userId: checkIn.userId,
    });
    console.log(`  [Student] ${followUpResponses[i].substring(0, 70)}...`);

    const res2 = await fetch(`${BASE_URL}/api/check-in/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkInId: checkIn._id }),
    });
    const data2 = await res2.json();
    if (data2.aiResponse) {
      console.log(`  [AI] ${data2.aiResponse.substring(0, 70)}...`);
    }

    await sleep(300);

    // Complete the check-in (extracts comprehension profile)
    const completeRes = await fetch(`${BASE_URL}/api/check-in/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkInId: checkIn._id, sessionId: SESSION_ID, sessionCode: SESSION_CODE }),
    });
    const completeData = await completeRes.json();
    const summary = completeData.profile?.overallSummary || "profile extracted";
    console.log(`  [Done] ${summary.substring(0, 80)}`);
    console.log(`  Progress: ${completeData.completed}/${completeData.total}\n`);

    await sleep(200);
  }

  // Step 4: Check for matches
  console.log("=== Step 4: Check matching results ===");
  await sleep(8000);

  const finalSession = await convex.query(api.teaching.getCaptureSession, { sessionCode: SESSION_CODE });
  console.log(`Check-in phase: ${finalSession?.checkInPhase}`);

  let matches = await convex.query(api.matches.getProposedMatches, { sessionId: SESSION_ID });

  if (!matches) {
    console.log("No matches yet -- triggering manually...");
    const matchRes = await fetch(`${BASE_URL}/api/compute-matches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: SESSION_ID, sessionCode: SESSION_CODE }),
    });
    const matchData = await matchRes.json();
    if (matchRes.ok) {
      matches = matchData;
      console.log("Matching complete!");
    } else {
      console.error("Matching failed:", matchData);
    }
  }

  if (matches?.groups) {
    console.log(`\nProposed ${matches.groups.length} groups:`);
    matches.groups.forEach((g, i) => {
      console.log(`  ${i + 1}. "${g.name}" (${g.memberIds.length} members)`);
      console.log(`     ${g.reason}`);
    });
    const unmatched = matches.unmatchedIds?.length || 0;
    console.log(`\nUnmatched students (non-responders): ${unmatched}`);
  }

  console.log("\n✅ Done! Open your browser to see:");
  console.log("   - Click the 'Check-In' tab in the floating panel");
  console.log("   - See student progress, comprehension profiles, and proposed groups");
  console.log("   - Press 'Send to Discussion Rooms' to create the groups");
}

main().catch(console.error);
