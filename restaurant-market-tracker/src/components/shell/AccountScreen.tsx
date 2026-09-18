"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/api-client";
import { ROLE_LABELS, type SafePerson } from "@/lib/types";

const WHAT_YOU_CAN_DO: Record<SafePerson["role"], string> = {
  kitchen:
    "Report what has run out, ask for extras, and confirm what actually arrives.",
  store:
    "Keep stock and market days up to date, verify the kitchen's list, buy it, and record what you paid.",
  admin:
    "Approve or send back the list, manage staff, and see everything.",
};

export function AccountScreen({ person }: { person: SafePerson }) {
  const router = useRouter();
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [busy, setBusy] = useState(false);

  const changePin = async () => {
    setBusy(true);
    const res = await postJson("/api/auth/pin", {
      current_pin: currentPin,
      new_pin: newPin,
    });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.data.error || "Could not change your PIN");
      return;
    }
    toast.success("PIN updated");
    setCurrentPin("");
    setNewPin("");
  };

  const signOut = async () => {
    await postJson("/api/auth/signout");
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-1 pt-5">
          <p className="text-lg font-semibold">{person.name}</p>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[person.role]}
          </p>
          <p className="pt-2 text-sm">{WHAT_YOU_CAN_DO[person.role]}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm font-semibold">Change your PIN</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="current-pin">Current</Label>
              <Input
                id="current-pin"
                inputMode="numeric"
                maxLength={4}
                value={currentPin}
                onChange={(e) =>
                  setCurrentPin(e.target.value.replace(/\D/g, ""))
                }
                placeholder="••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pin">New</Label>
              <Input
                id="new-pin"
                inputMode="numeric"
                maxLength={4}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
              />
            </div>
          </div>
          <Button
            disabled={busy || currentPin.length !== 4 || newPin.length !== 4}
            onClick={changePin}
          >
            {busy ? "Saving…" : "Update PIN"}
          </Button>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
