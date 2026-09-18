"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Delete, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PickablePerson {
  id: string;
  name: string;
  role: Role;
}

export default function LoginPage() {
  const router = useRouter();
  const [people, setPeople] = useState<PickablePerson[] | null>(null);
  const [selected, setSelected] = useState<PickablePerson | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/people")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: PickablePerson[]) => {
        if (active) setPeople(list);
      })
      .catch(() => {
        if (active) setPeople([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (person: PickablePerson, enteredPin: string) => {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ person_id: person.id, pin: enteredPin }),
        });
        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(body.error || "Could not sign in");
          setPin("");
          setBusy(false);
          return;
        }

        router.replace("/");
        router.refresh();
      } catch {
        setError("Connection problem. Try again.");
        setPin("");
        setBusy(false);
      }
    },
    [router],
  );

  const press = (digit: string) => {
    if (busy || !selected) return;
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    setError("");
    // Sign in as soon as the fourth digit lands.
    if (next.length === 4) void signIn(selected, next);
  };

  if (!people) {
    return (
      <Shell>
        <p className="text-center text-sm text-muted-foreground">Loading…</p>
      </Shell>
    );
  }

  if (people.length === 0) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No staff yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Add people to the <code>people</code> table, then reload this page.
            </p>
            <p>
              The database ships with an <strong>Admin</strong> account (PIN
              1234), a <strong>Store Manager</strong> (2345) and a{" "}
              <strong>Kitchen</strong> (3456) for getting started.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // Step 1 — who are you?
  if (!selected) {
    return (
      <Shell>
        <div className="space-y-2">
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => {
                setSelected(person);
                setPin("");
                setError("");
              }}
              className="flex w-full items-center justify-between rounded-xl border bg-card px-4 py-4 text-left transition-colors hover:bg-muted active:scale-[0.99]"
            >
              <span className="text-base font-medium">{person.name}</span>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[person.role]}
              </span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  // Step 2 — PIN
  return (
    <Shell>
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-base font-semibold">{selected.name}</p>
          <p className="text-xs text-muted-foreground">
            {ROLE_LABELS[selected.role]}
          </p>
        </div>

        <div className="flex justify-center gap-3" aria-label="PIN entry">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-4 w-4 rounded-full border-2 transition-colors",
                i < pin.length
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40",
              )}
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <KeypadButton key={digit} onClick={() => press(digit)}>
              {digit}
            </KeypadButton>
          ))}
          <KeypadButton
            onClick={() => {
              setSelected(null);
              setPin("");
              setError("");
            }}
            muted
          >
            Back
          </KeypadButton>
          <KeypadButton onClick={() => press("0")}>0</KeypadButton>
          <KeypadButton
            onClick={() => setPin((p) => p.slice(0, -1))}
            muted
            aria-label="Delete last digit"
          >
            <Delete className="h-5 w-5" />
          </KeypadButton>
        </div>

        {busy && (
          <p className="text-center text-sm text-muted-foreground">
            Signing in…
          </p>
        )}
      </div>
    </Shell>
  );
}

function KeypadButton({
  children,
  onClick,
  muted,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  muted?: boolean;
} & React.AriaAttributes) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 items-center justify-center rounded-xl border text-xl font-medium transition-colors active:scale-[0.97]",
        muted
          ? "bg-muted text-muted-foreground"
          : "bg-card hover:bg-muted",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-bold">Market Tracker</h1>
          <p className="text-sm text-muted-foreground">Pick your name to sign in</p>
        </div>
        {children}
      </div>
    </div>
  );
}
