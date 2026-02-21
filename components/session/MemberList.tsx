"use client";

import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";

type Member = {
  _id: Id<"sessionMembers">;
  name: string;
  role: "creator" | "participant";
};

export function MemberList({ members }: { members: Member[] }) {
  return (
    <div className="space-y-2 p-4">
      <h2 className="text-sm font-medium text-muted-foreground">Members</h2>
      <ul className="space-y-1">
        {members.map((m) => (
          <li key={m._id} className="flex items-center gap-2 text-sm">
            <span>{m.name}</span>
            <Badge variant={m.role === "creator" ? "default" : "secondary"}>
              {m.role}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
