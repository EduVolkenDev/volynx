import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Box,
  Database,
  HeartHandshake,
  LayoutDashboard,
  LifeBuoy,
  Rocket,
  Server,
  Settings,
  ShieldCheck,
} from "lucide-react";

export interface ConsoleSection {
  slug: string; // "" = overview (index route)
  name: string;
  icon: LucideIcon;
  description: string;
}

/** Primary navigation — V1 scope (§20). Order matters: operational first. */
export const SECTIONS: ConsoleSection[] = [
  { slug: "", name: "Overview", icon: LayoutDashboard, description: "Product status at a glance" },
  { slug: "products", name: "Products", icon: Box, description: "Products and product detail" },
  { slug: "infrastructure", name: "Infrastructure", icon: Server, description: "Connected services and providers" },
  { slug: "deployments", name: "Deployments", icon: Rocket, description: "History, status, source" },
  { slug: "monitoring", name: "Monitoring", icon: Activity, description: "Basic health per component" },
  { slug: "backups", name: "Backups", icon: Database, description: "Capability, status, history" },
  { slug: "security", name: "Security", icon: ShieldCheck, description: "Visible protection state" },
  { slug: "incidents", name: "Incidents", icon: AlertTriangle, description: "Active and past incidents" },
  { slug: "care", name: "Care", icon: HeartHandshake, description: "Current plan and support info" },
  { slug: "support", name: "Support", icon: LifeBuoy, description: "Request support" },
  { slug: "settings", name: "Settings", icon: Settings, description: "Safe administrative configuration" },
];

/** Sections shown in the mobile bottom bar; the rest live under "More". */
export const MOBILE_PRIMARY = ["", "deployments", "monitoring", "incidents", "support"];
