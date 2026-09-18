"use client";

import { createContext, useContext } from "react";
import type { SafePerson } from "@/lib/types";

const PersonContext = createContext<SafePerson | null>(null);

export function PersonProvider({
  person,
  children,
}: {
  person: SafePerson;
  children: React.ReactNode;
}) {
  return (
    <PersonContext.Provider value={person}>{children}</PersonContext.Provider>
  );
}

/** The signed-in person. Only valid inside the app shell, which gates auth. */
export function usePerson(): SafePerson {
  const person = useContext(PersonContext);
  if (!person) {
    throw new Error("usePerson must be used inside the app shell");
  }
  return person;
}
