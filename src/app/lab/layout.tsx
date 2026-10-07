import type { Metadata } from "next";

// /lab holds parked experiments. They are reachable by direct link only:
// no nav or footer entry, and kept out of search results.
export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
};

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return children;
}
