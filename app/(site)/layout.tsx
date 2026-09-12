import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata: Metadata = {
  title: {
    template: "%s | serahbobin",
    default: "serahbobin — drawing portfolio",
  },
  description:
    "Sketchbook pages, still life, colour studies and illustration by serahbobin, applying to NID, NIFT and UCEED.",
};

// Runs before the rest of #site-root paints, so the stored/system theme
// preference applies with no flash of the wrong theme. Sets the attribute
// imperatively (not via React) so hydration never has to reconcile it.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.getElementById('site-root').setAttribute('data-theme',t);}catch(e){}})();`;

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="site-root"
      suppressHydrationWarning
      className="min-h-screen bg-[var(--color-paper)]"
    >
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
