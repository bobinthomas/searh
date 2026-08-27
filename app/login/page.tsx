"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
        router.refresh();
      } else {
        setError("Wrong password");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-void)]">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-[var(--color-paper)]">
            Admin
          </h1>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-[var(--color-paper)]">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="border-[var(--color-void-line)] bg-[var(--color-void-2)] text-[var(--color-paper)]"
            />
            {error && (
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--color-lime)] text-[var(--color-void)] hover:bg-[var(--color-lime)]/90"
          >
            {loading ? "..." : "Enter"}
          </Button>
        </div>
      </form>
    </div>
  );
}
