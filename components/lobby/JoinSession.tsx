"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function JoinSession() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const normalized = code.trim().toUpperCase();
  const session = useQuery(
    api.sessions.getByCode,
    normalized.length === 6 ? { code: normalized } : "skip"
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!normalized) return;
    if (session === undefined) return;
    if (session === null) {
      setError("Session not found");
      return;
    }
    router.push(`/session/${session.code}`);
  }

  return (
    <Card className="border-t-[3px] border-t-sage">
      <CardHeader>
        <CardTitle className="font-display">Join Session</CardTitle>
        <CardDescription>Enter a session code to join</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Session Code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            maxLength={6}
            className="font-mono tracking-widest"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            variant="secondary"
            disabled={normalized.length !== 6}
          >
            Join
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
