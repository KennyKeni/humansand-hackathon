"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2 } from "lucide-react";

function MessageBubble({ msg }: { msg: { _id: string; role: string; body: string } }) {
  const isAI = msg.role === "assistant";
  return (
    <div className={`flex flex-col ${isAI ? "items-start" : "items-end"}`}>
      {isAI && (
        <span className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
          <Bot className="h-3 w-3" /> AI Assistant
        </span>
      )}
      {!isAI && (
        <span className="text-xs text-muted-foreground mb-0.5">You</span>
      )}
      <div
        className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
          isAI ? "bg-muted" : "bg-primary text-primary-foreground"
        }`}
        style={{ overflowWrap: "break-word", wordBreak: "break-word" }}
      >
        {msg.body}
      </div>
    </div>
  );
}

export function CheckInChat({
  checkIn,
  sessionId,
  sessionCode,
}: {
  checkIn: {
    _id: Id<"checkIns">;
    status: "active" | "completed" | "expired";
  };
  sessionId: Id<"sessions">;
  sessionCode: string;
  currentUserId: Id<"users">;
}) {
  const messages = useQuery(api.checkIns.listMessages, {
    checkInId: checkIn._id,
  });
  const sendStudentMessage = useMutation(api.checkIns.sendStudentMessage);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");
    try {
      await sendStudentMessage({
        checkInId: checkIn._id,
        body: trimmed,
      });
      await fetch("/api/check-in/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkInId: checkIn._id }),
      });
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await fetch("/api/check-in/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId: checkIn._id,
          sessionId,
          sessionCode,
        }),
      });
    } catch (err) {
      console.error("Failed to complete check-in:", err);
    } finally {
      setCompleting(false);
    }
  }

  if (checkIn.status === "completed") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-3 py-4">
            {messages?.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="border-t px-4 py-3 text-center text-sm text-muted-foreground shrink-0">
          Check-in complete! Your teacher will group you soon.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-3 py-4">
          {messages?.map((msg) => (
            <MessageBubble key={msg._id} msg={msg} />
          ))}
          {sending && (
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Bot className="h-3 w-3" /> AI Assistant
              </span>
              <div className="rounded-lg px-3 py-2 text-sm bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t px-4 py-3 space-y-2 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            placeholder="Share what you learned or found confusing..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            disabled={sending}
            autoFocus
          />
          <Button type="submit" disabled={!input.trim() || sending} size="sm">
            Send
          </Button>
        </form>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Wrapping up...
            </>
          ) : (
            "I'm Done"
          )}
        </Button>
      </div>
    </div>
  );
}
