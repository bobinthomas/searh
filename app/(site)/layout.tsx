import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: {
    template: "%s | serahbobin",
    default: "serahbobin — drawing portfolio",
  },
  description:
    "Sketchbook pages, still life, colour studies and illustration by serahbobin, applying to NID, NIFT and UCEED.",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
