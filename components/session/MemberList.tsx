"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";

type Member = {
  _id: Id<"sessionMembers">;
  userId: Id<"users">;
  name: string;
  role: "creator" | "participant" | "professor" | "student";
};

export function MemberList({
  members,
  role,
  sessionId,
}: {
  members: Member[];
  role: "creator" | "participant" | "professor" | "student";
  sessionId: Id<"sessions">;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"users">>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const createGroup = useMutation(api.groups.create);
  const myGroups = useQuery(api.groups.getMyGroups, { sessionId }) ?? [];


  function toggleMember(userId: Id<"users">) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function startSelecting() {
    setSelecting(true);
    setSelectedIds(new Set());
    setGroupName(`Group ${myGroups.length + 1}`);
  }

  function cancelSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
    setGroupName("");
  }

  async function handleCreate() {
    const memberIds = Array.from(selectedIds);
    if (memberIds.length < 2 || !groupName.trim()) return;
    setCreating(true);
    try {
      await createGroup({ sessionId, name: groupName.trim(), memberIds });
      cancelSelecting();
    } catch {
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
        {role === "creator" && !selecting && (
          <Button variant="outline" size="sm" onClick={startSelecting}>
            Create Group
          </Button>
        )}
      </div>

      {selecting && (
        <div className="space-y-2 rounded border p-3">
          <Input
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Select at least 2 students
          </p>
        </div>
      )}

      <ul className="space-y-1">
        {members.map((m) => {
          const isParticipant = m.role !== "creator";
          const isSelected = selectedIds.has(m.userId);

          return (
            <li key={m._id} className="flex items-center gap-2 text-sm">
              {selecting && isParticipant && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleMember(m.userId)}
                  className="h-4 w-4 rounded border-gray-300"
                />
              )}
              <span>{m.name}</span>
              <Badge variant={m.role === "creator" ? "default" : "secondary"}>
                {m.role}
              </Badge>
            </li>
          );
        })}
      </ul>

      {selecting && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            disabled={selectedIds.size < 2 || !groupName.trim() || creating}
            onClick={handleCreate}
          >
            {creating ? "Creating..." : "Create"}
          </Button>
          <Button variant="ghost" size="sm" onClick={cancelSelecting}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
