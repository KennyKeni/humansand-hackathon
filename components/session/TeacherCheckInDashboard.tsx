"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";

type Member = {
  _id: Id<"sessionMembers">;
  userId: Id<"users">;
  name: string;
  role: "creator" | "participant" | "professor" | "student";
};

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
    <div className="h-full overflow-y-auto" style={{ overflowX: "hidden" }}>
      <div className="p-4 space-y-4" style={{ maxWidth: "100%", overflowWrap: "break-word", wordBreak: "break-word" }}>
        {/* Check-in Progress */}
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Users className="h-4 w-4 shrink-0" />
            Check-In Progress
          </h3>
          {checkInStatus && (
            <div className="text-sm text-muted-foreground mb-2">
              {checkInStatus.completed}/{checkInStatus.total} students completed
            </div>
          )}
          <div className="space-y-1.5">
            {students.map((student) => {
              const checkIn = checkInStatus?.checkIns.find(
                (c) => c.userId === student.userId,
              );

              return (
                <div
                  key={student.userId}
                  className="flex items-center justify-between rounded-md border px-3 py-2 gap-2"
                >
                  <span className="text-sm font-medium truncate min-w-0">{student.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!checkIn && (
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        <AlertCircle className="h-3 w-3 mr-0.5" />
                        No response
                      </Badge>
                    )}
                    {checkIn?.status === "active" && (
                      <Badge variant="outline" className="text-xs animate-pulse whitespace-nowrap">
                        <Clock className="h-3 w-3 mr-0.5" />
                        Chatting
                      </Badge>
                    )}
                    {checkIn?.status === "completed" && (
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Done
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comprehension Topics */}
        {comprehensionProfiles && comprehensionProfiles.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Comprehension</h3>
            <div className="space-y-2">
              {comprehensionProfiles.map((profile) => (
                <div
                  key={profile._id}
                  className="rounded-md border p-2.5 space-y-1.5"
                >
                  <div className="text-sm font-medium truncate">
                    {memberNameMap.get(profile.userId) ?? "Unknown"}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profile.topics.map((topic, i) => (
                      <span
                        key={i}
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          topic.understood
                            ? "bg-secondary text-secondary-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }`}
                        style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {topic.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                    {profile.overallSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compute Matches Button */}
        {checkInStatus && checkInStatus.completed >= 2 && checkInPhase !== "matched" && checkInPhase !== "grouped" && (
          <Button
            className="w-full"
            onClick={handleComputeMatches}
            disabled={computing}
          >
            {computing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                Computing matches...
              </>
            ) : (
              `Form Groups (${checkInStatus.completed} students ready)`
            )}
          </Button>
        )}

        {/* Proposed Matches */}
        {proposedMatches && proposedMatches.groups.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Proposed Groups</h3>
            <div className="space-y-2">
              {proposedMatches.groups.map((group, i) => (
                <div key={i} className="rounded-md border p-2.5 space-y-1">
                  <div className="text-sm font-medium truncate">{group.name}</div>
                  <div className="flex flex-wrap gap-1">
                    {group.memberIds.map((id) => (
                      <span
                        key={id}
                        className="inline-block rounded-full border px-2 py-0.5 text-xs font-semibold"
                        style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        {memberNameMap.get(id as Id<"users">) ?? id}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground" style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                    {group.reason}
                  </p>
                </div>
              ))}
              {proposedMatches.unmatchedIds.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {proposedMatches.unmatchedIds.length} student(s) didn&apos;t respond
                  and will be distributed into groups.
                </div>
              )}
            </div>

            {checkInPhase !== "grouped" && !roomsSent && (
              <Button
                className="w-full mt-3"
                onClick={handleSendToRooms}
                disabled={sendingToRooms}
              >
                {sendingToRooms ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Creating rooms...
                  </>
                ) : (
                  "Send to Discussion Rooms"
                )}
              </Button>
            )}

            {(checkInPhase === "grouped" || roomsSent) && (
              <div className="mt-3 text-center text-sm text-muted-foreground">
                Discussion rooms are active! Students can see their group tabs.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
