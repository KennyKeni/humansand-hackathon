"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
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

export function CreateSession() {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const createSession = useMutation(api.sessions.create);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { code } = await createSession({ title: trimmed });
      router.push(`/session/${code}`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-t-[3px] border-t-terracotta">
      <CardHeader>
        <CardTitle className="font-display">Create Session</CardTitle>
        <CardDescription>Start a new teaching session</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            placeholder="Session title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={submitting}
          />
          <Button type="submit" disabled={!title.trim() || submitting}>
            {submitting ? "Creating..." : "Create"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
