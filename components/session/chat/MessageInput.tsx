"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageInput({ sessionId }: { sessionId: Id<"sessions"> }) {
  const [body, setBody] = useState("");
  const send = useMutation(api.messages.send);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    try {
      await send({ sessionId, body: trimmed });
      setBody("");
    } catch {
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t px-4 py-3">
      <Input
        placeholder="Type a message..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        autoFocus
      />
      <Button type="submit" disabled={!body.trim()}>
        Send
      </Button>
    </form>
  );
}
