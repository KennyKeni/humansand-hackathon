"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { CreateSession } from "@/components/lobby/CreateSession";
import { JoinSession } from "@/components/lobby/JoinSession";

export default function LobbyPage() {
  const me = useQuery(api.users.getMe);
  const { signOut } = useAuthActions();
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-2xl space-y-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            Welcome{me?.name ? `, ${me.name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Create a session or join one with a code
          </p>
          <button
            className="text-sm text-muted-foreground underline mt-2"
            onClick={() => signOut().then(() => router.push("/"))}
          >
            Sign out
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <CreateSession />
          <JoinSession />
        </div>
      </div>
    </div>
  );
}
