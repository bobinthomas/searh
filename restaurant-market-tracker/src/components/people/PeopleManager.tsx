"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Plus, UserMinus, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patchJson, postJson, deleteJson } from "@/lib/api-client";
import { ROLE_LABELS, type Person, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLES: Role[] = ["kitchen", "store", "admin"];

export function PeopleManager({ people }: { people: Person[] }) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [pinFor, setPinFor] = useState<Person | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("kitchen");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => router.refresh();

  const addPerson = async () => {
    setBusy(true);
    const res = await postJson("/api/people", { name, role, pin });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.data.error || "Could not add them");
      return;
    }
    toast.success(`${name} can now sign in`);
    setAddOpen(false);
    setName("");
    setPin("");
    setRole("kitchen");
    refresh();
  };

  const changeRole = async (person: Person, next: Role) => {
    const res = await patchJson(`/api/people/${person.id}`, { role: next });
    if (!res.ok) {
      toast.error(res.data.error || "Could not change the role");
      return;
    }
    toast.success(`${person.name} is now ${ROLE_LABELS[next]}`);
    refresh();
  };

  const toggleActive = async (person: Person) => {
    const res = person.active
      ? await deleteJson(`/api/people/${person.id}`)
      : await patchJson(`/api/people/${person.id}`, { active: 1 });

    if (!res.ok) {
      toast.error(res.data.error || "Could not update them");
      return;
    }
    toast.success(person.active ? `${person.name} is off` : `${person.name} is back`);
    refresh();
  };

  const savePin = async () => {
    if (!pinFor) return;
    setBusy(true);
    const res = await patchJson(`/api/people/${pinFor.id}`, { pin });
    setBusy(false);

    if (!res.ok) {
      toast.error(res.data.error || "Could not set the PIN");
      return;
    }
    toast.success(`New PIN set for ${pinFor.name}`);
    setPinFor(null);
    setPin("");
    refresh();
  };

  return (
    <div className="space-y-4">
      <Button onClick={() => setAddOpen(true)} className="w-full">
        <Plus className="mr-1 h-4 w-4" />
        Add someone
      </Button>

      <div className="space-y-2">
        {people.map((person) => (
          <Card key={person.id} className={cn(person.active === 0 && "opacity-60")}>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[person.role]}
                  {person.active === 0 && " · signed out for good"}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Select
                  value={person.role}
                  onValueChange={(v) => changeRole(person, v as Role)}
                >
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title="Set a new PIN"
                  onClick={() => {
                    setPinFor(person);
                    setPin("");
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  title={person.active ? "Deactivate" : "Reactivate"}
                  onClick={() => toggleActive(person)}
                >
                  {person.active ? (
                    <UserMinus className="h-4 w-4 text-destructive" />
                  ) : (
                    <UserCheck className="h-4 w-4 text-emerald-500" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add someone */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add someone</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-pin">4-digit PIN</Label>
              <Input
                id="new-pin"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={busy || !name.trim() || pin.length !== 4}
              onClick={addPerson}
            >
              {busy ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset a PIN */}
      <Dialog open={!!pinFor} onOpenChange={(open) => !open && setPinFor(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New PIN for {pinFor?.name}</DialogTitle>
          </DialogHeader>
          <Input
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="1234"
          />
          <DialogFooter>
            <Button disabled={busy || pin.length !== 4} onClick={savePin}>
              {busy ? "Saving…" : "Set PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
