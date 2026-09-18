"use client";

// One icon per category, shared by the trip screen and the market-days screen
// so both read the same way.

import {
  Apple,
  Beef,
  Fish,
  Egg,
  Wheat,
  Soup,
  CupSoda,
  Package,
  SprayCan,
  Printer,
  Shapes,
  type LucideIcon,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Produce: Apple,
  Meat: Beef,
  Seafood: Fish,
  "Dairy & Eggs": Egg,
  Pantry: Wheat,
  Sauces: Soup,
  Drinks: CupSoda,
  Packaging: Package,
  Cleaning: SprayCan,
  Office: Printer,
  Misc: Shapes,
};

/** Icon for a category, falling back to a generic shape for unknown names. */
export function CategoryIcon({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[category] ?? Shapes;
  return <Icon className={className} aria-hidden />;
}
