"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SessionHeader({
  session,
  memberCount,
}: {
  session: Doc<"sessions">;
  memberCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  function copyCode() {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/lobby")}>
          Back
        </Button>
        <h1 className="text-lg font-semibold">{session.title}</h1>
        <Badge variant="secondary">{memberCount} members</Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={copyCode}>
          {copied ? "Copied!" : session.code}
        </Button>
      </div>
    </div>
  );
}
