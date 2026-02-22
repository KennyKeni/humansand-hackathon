"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Loader2, Send, CheckCheck } from "lucide-react";

function MessageBubble({ msg }: { msg: { _id: string; role: string; body: string } }) {
  const isAI = msg.role === "assistant";
  return (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} animate-message-enter`}>
      <div className={`max-w-[85%] ${isAI ? "flex gap-2" : ""}`}>
        {isAI && (
          <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-blue-subtle">
            <Bot className="h-3.5 w-3.5 text-slate-blue" />
          </div>
        )}
        <div>
          <span className={`mb-1 block text-[11px] font-medium tracking-wide uppercase ${isAI ? "text-slate-blue" : "text-charcoal-soft text-right"}`}>
            {isAI ? "AI Assistant" : "You"}
          </span>
          <div
            className={`rounded-[10px] px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
              isAI
                ? "rounded-tl-[6px] bg-chat-ai border-l-[3px] border-slate-blue text-charcoal"
                : "rounded-tr-[6px] bg-chat-own text-charcoal"
            }`}
          >
            {msg.body}
          </div>
        </div>
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
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto px-4">
          <div className="space-y-4 py-4">
            {messages?.map((msg) => (
              <MessageBubble key={msg._id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="border-t border-parchment bg-cream-deep/50 px-4 py-4 text-center shrink-0">
          <div className="flex items-center justify-center gap-2 text-sm font-medium text-charcoal-soft">
            <CheckCheck className="h-4 w-4 text-sage" />
            Check-in complete! Your teacher will group you soon.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-4">
        <div className="space-y-4 py-4">
          {messages?.map((msg) => (
            <MessageBubble key={msg._id} msg={msg} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex gap-2">
                <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-blue-subtle">
                  <Bot className="h-3.5 w-3.5 text-slate-blue" />
                </div>
                <div>
                  <span className="mb-1 block text-[11px] font-medium tracking-wide uppercase text-slate-blue">
                    AI Assistant
                  </span>
                  <div className="rounded-[10px] rounded-tl-[6px] bg-chat-ai px-4 py-3">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-blue/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-slate-blue/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-slate-blue/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="border-t border-parchment bg-cream-deep/30 px-3 py-3 space-y-2 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2 items-center">
          <Input
            placeholder="Share what you learned..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            disabled={sending}
            autoFocus
            className="text-[13px]"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            size="icon"
            className="h-9 w-9 shrink-0 rounded-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-charcoal-soft hover:text-foreground"
          onClick={handleComplete}
          disabled={completing}
        >
          {completing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
              Wrapping up...
            </>
          ) : (
            <>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              I'm Done
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
