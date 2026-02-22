"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Users,
  CheckCircle2,
  Clock,
  CircleDashed,
  Brain,
  Shuffle,
  ArrowRight,
} from "lucide-react";

type Member = {
  _id: Id<"sessionMembers">;
  userId: Id<"users">;
  name: string;
  role: "creator" | "participant" | "professor" | "student";
};

function SectionHeader({
  icon: Icon,
  title,
  detail,
}: {
  icon: React.ElementType;
  title: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal-soft font-display">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {detail && (
        <span className="text-xs tabular-nums text-charcoal-soft">
          {detail}
        </span>
      )}
    </div>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-parchment overflow-hidden mb-3">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: "none" | "active" | "completed" }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center">
      {status === "completed" ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
      ) : status === "active" ? (
        <Clock className="h-3.5 w-3.5 text-terracotta animate-pulse" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5 text-charcoal-muted" />
      )}
    </span>
  );
}

function StatusLabel({ status }: { status: "none" | "active" | "completed" }) {
  const labels = { none: "Waiting", active: "Chatting", completed: "Done" };
  const colors = {
    none: "text-charcoal-muted",
    active: "text-terracotta",
    completed: "text-sage",
  };
  return (
    <span className={`text-[11px] font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

export function TeacherCheckInDashboard({
  sessionId,
  sessionCode,
  checkInPhase,
  members,
  creatorId,
}: {
  sessionId: Id<"sessions">;
  sessionCode: string;
  checkInPhase: string | undefined;
  members: Member[];
  creatorId: Id<"users">;
}) {
  const [sendingToRooms, setSendingToRooms] = useState(false);
  const [roomsSent, setRoomsSent] = useState(false);
  const [computing, setComputing] = useState(false);

  const checkInStatus = useQuery(api.checkIns.getSessionCheckInStatus, {
    sessionId,
  });
  const comprehensionProfiles = useQuery(api.comprehension.getBySession, {
    sessionId,
  });
  const proposedMatches = useQuery(api.matches.getProposedMatches, {
    sessionId,
  });

  const students = members.filter(
    (m) => m.role === "participant" || m.role === "student",
  );

  async function handleComputeMatches() {
    setComputing(true);
    try {
      const res = await fetch("/api/compute-matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        console.error("Matching failed:", data);
      }
    } catch (err) {
      console.error("Failed to compute matches:", err);
    } finally {
      setComputing(false);
    }
  }

  async function handleSendToRooms() {
    setSendingToRooms(true);
    try {
      const res = await fetch("/api/send-to-rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, sessionCode, creatorId }),
      });
      if (res.ok) {
        setRoomsSent(true);
      }
    } catch (err) {
      console.error("Failed to send to rooms:", err);
    } finally {
      setSendingToRooms(false);
    }
  }

  const memberNameMap = new Map(students.map((m) => [m.userId, m.name]));

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="p-4 space-y-5">
        {/* Check-in Progress */}
        <section>
          <SectionHeader
            icon={Users}
            title="Progress"
            detail={
              checkInStatus
                ? `${checkInStatus.completed} of ${checkInStatus.total}`
                : undefined
            }
          />
          {checkInStatus && (
            <ProgressBar
              completed={checkInStatus.completed}
              total={checkInStatus.total}
            />
          )}
          <div className="space-y-1">
            {students.map((student) => {
              const checkIn = checkInStatus?.checkIns.find(
                (c) => c.userId === student.userId,
              );
              const status: "none" | "active" | "completed" = !checkIn
                ? "none"
                : checkIn.status === "completed"
                  ? "completed"
                  : "active";

              return (
                <div
                  key={student.userId}
                  className="flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors hover:bg-cream-deep"
                >
                  <StatusDot status={status} />
                  <span className="flex-1 truncate text-sm">{student.name}</span>
                  <StatusLabel status={status} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Comprehension Profiles */}
        {comprehensionProfiles && comprehensionProfiles.length > 0 && (
          <section>
            <SectionHeader icon={Brain} title="Comprehension" />
            <div className="space-y-2">
              {comprehensionProfiles.map((profile) => (
                <div
                  key={profile._id}
                  className="rounded-md bg-cream-deep p-3 space-y-2"
                >
                  <div className="text-sm font-medium truncate">
                    {memberNameMap.get(profile.userId) ?? "Unknown"}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.topics.map((topic, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium truncate max-w-full ${
                          topic.understood
                            ? "bg-sage-subtle text-sage"
                            : "bg-terracotta-subtle text-terracotta"
                        }`}
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-charcoal-soft break-words">
                    {profile.overallSummary}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Compute Matches Button */}
        {checkInStatus &&
          checkInStatus.completed >= 2 &&
          checkInPhase !== "matched" &&
          checkInPhase !== "grouped" && (
            <Button
              className="w-full gap-2"
              onClick={handleComputeMatches}
              disabled={computing}
            >
              {computing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Computing matches...
                </>
              ) : (
                <>
                  <Shuffle className="h-4 w-4" />
                  Form Groups ({checkInStatus.completed} ready)
                </>
              )}
            </Button>
          )}

        {/* Proposed Matches */}
        {proposedMatches && proposedMatches.groups.length > 0 && (
          <section>
            <SectionHeader
              icon={Users}
              title="Groups"
              detail={`${proposedMatches.groups.length} groups`}
            />
            <div className="space-y-2">
              {proposedMatches.groups.map((group, i) => (
                <div
                  key={i}
                  className="rounded-md bg-cream-deep p-3 space-y-2"
                >
                  <div className="text-sm font-medium truncate">{group.name}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.memberIds.map((id) => (
                      <span
                        key={id}
                        className="inline-flex items-center rounded-md bg-cream border border-parchment px-2 py-0.5 text-[11px] font-medium truncate max-w-full"
                      >
                        {memberNameMap.get(id as Id<"users">) ?? id}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-charcoal-soft break-words">
                    {group.reason}
                  </p>
                </div>
              ))}
              {proposedMatches.unmatchedIds.length > 0 && (
                <p className="text-xs text-charcoal-soft px-1">
                  {proposedMatches.unmatchedIds.length} student(s) didn&apos;t respond
                  and will be distributed into groups.
                </p>
              )}
            </div>

            {checkInPhase !== "grouped" && !roomsSent && (
              <Button
                className="w-full mt-3 gap-2"
                onClick={handleSendToRooms}
                disabled={sendingToRooms}
              >
                {sendingToRooms ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating rooms...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" />
                    Send to Discussion Rooms
                  </>
                )}
              </Button>
            )}

            {(checkInPhase === "grouped" || roomsSent) && (
              <div className="mt-3 flex items-center justify-center gap-2 rounded-md bg-sage-subtle py-3 text-sm font-medium text-sage">
                <CheckCircle2 className="h-4 w-4" />
                Discussion rooms are active
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
