"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type SummaryResult =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: ParsedSummary };

type ParsedSummary = {
  overallSummary: string;
  participants: {
    userId: string;
    name: string;
    strengths: string[];
    weaknesses: string[];
  }[];
};

function parseSummary(raw: string | undefined): SummaryResult {
  if (!raw) return { status: "loading" as const };
  try {
    const parsed = JSON.parse(raw);
    if (parsed.error) return { status: "error" as const, message: parsed.message };
    if (!parsed.overallSummary || !Array.isArray(parsed.participants)) {
      return { status: "error" as const, message: "Summary data is malformed." };
    }
    return { status: "success" as const, data: parsed };
  } catch {
    return { status: "error" as const, message: "Summary data is corrupted." };
  }
}

export function SummaryModal({
  open,
  onClose,
  sessionId,
}: {
  open: boolean;
  onClose: () => void;
  sessionId: Id<"sessions">;
}) {
  const groups = useQuery(api.groups.getMyGroups, { sessionId }) ?? [];
  const archived = groups.filter((g) => g.endedAt);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Group Summaries</DialogTitle>
          <DialogDescription>
            AI-generated summaries for ended groups.
          </DialogDescription>
        </DialogHeader>
        {archived.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No groups have been ended yet.
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            <div className="space-y-4 pb-2">
              {archived.map((group) => (
                <GroupCard
                  key={group._id}
                  name={group.name}
                  summary={group.summary}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({ name, summary }: { name: string; summary?: string }) {
  const result = parseSummary(summary);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold text-sm mb-2">{name}</h3>

      {result.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating summary...
        </div>
      )}

      {result.status === "error" && (
        <p className="text-sm text-muted-foreground">{result.message}</p>
      )}

      {result.status === "success" && (
        <div className="space-y-3">
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{result.data.overallSummary}</Streamdown>
          </div>
          {result.data.participants.map((p) => (
            <div key={p.userId} className="text-sm">
              <p className="font-medium">{p.name}</p>
              {p.strengths.length > 0 && (
                <ul className="list-disc ml-4 text-muted-foreground">
                  {p.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              )}
              {p.weaknesses.length > 0 && (
                <ul className="list-disc ml-4 text-destructive/80">
                  {p.weaknesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
