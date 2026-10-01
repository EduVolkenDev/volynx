import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./console.css";

export const metadata: Metadata = {
  title: "Volynx Cloud Console",
  description: "Managed infrastructure for Volynx products — status, deployments, security and care.",
};

/** Isolated console segment: own layout, no marketing header/footer. */
export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
