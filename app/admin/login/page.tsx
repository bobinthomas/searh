"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-void)]">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[var(--color-paper)]">
            Check your email
          </h1>
          <p className="text-sm text-[var(--color-muted-ink)]">
            We sent a magic link to <strong className="text-[var(--color-paper)]">{email}</strong>.
            Click the link to sign in.
          </p>
          <Button
            variant="ghost"
            className="text-[var(--color-muted-ink)] hover:text-[var(--color-paper)]"
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-void)]">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-6"
      >
        <div className="space-y-2 text-center">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[var(--color-paper)]">
            Admin Login
          </h1>
          <p className="text-sm text-[var(--color-muted-ink)]">
            Sign in with a magic link — no password needed.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[var(--color-paper)]">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-[var(--color-void-line)] bg-[var(--color-void-2)] text-[var(--color-paper)] placeholder:text-[var(--color-void-muted)]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-lime)] text-[var(--color-void)] hover:bg-[var(--color-lime)]/90"
          >
            {loading ? "Sending..." : "Send magic link"}
          </Button>
        </div>
      </form>
    </div>
  );
}
