export type ImageMeta = { src: string; width: number; height: number };

/** Public paths served from /public/drawings/ */
export const images: Record<string, ImageMeta> = {
  "hands-study": {
    src: "/drawings/hands-study.jpg",
    width: 1200,
    height: 1600,
  },
  "still-life-tumbler": {
    src: "/drawings/still-life-tumbler.jpg",
    width: 1600,
    height: 1100,
  },
  "market-colour-study": {
    src: "/drawings/market-colour-study.jpg",
    width: 1400,
    height: 1400,
  },
  "street-perspective": {
    src: "/drawings/street-perspective.jpg",
    width: 1600,
    height: 1000,
  },
  "bus-seat-illustration": {
    src: "/drawings/bus-seat-illustration.jpg",
    width: 1100,
    height: 1500,
  },
};

export type Work = {
  id: string;
  file: string;
  alt: string;
  title: string;
  date: string;
  medium: string;
  time: string;
  section: "sketchbook" | "selected";
  note: string;
};

export type LogEntry = { date: string; kind: string; text: string };
