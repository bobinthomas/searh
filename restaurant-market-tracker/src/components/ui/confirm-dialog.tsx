"use client";

// In-app replacement for window.confirm(), which renders as native browser
// chrome ("Freebuff says…") and breaks the app's look.

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function useConfirmDialog() {
  const [state, setState] = useState<{
    title: string;
    description?: string;
    confirmLabel?: string;
    destructive?: boolean;
    resolve: (ok: boolean) => void;
  } | null>(null);

  const confirm = (
    title: string,
    options?: { description?: string; confirmLabel?: string; destructive?: boolean },
  ): Promise<boolean> =>
    new Promise((resolve) => setState({ title, ...options, resolve }));

  const element = (
    <Dialog
      open={state !== null}
      onOpenChange={(open) => {
        if (!open) {
          state?.resolve(false);
          setState(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{state?.title}</DialogTitle>
          {state?.description && (
            <DialogDescription>{state.description}</DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              state?.resolve(false);
              setState(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant={state?.destructive ? "destructive" : "default"}
            onClick={() => {
              state?.resolve(true);
              setState(null);
            }}
          >
            {state?.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, confirmDialog: element };
}
