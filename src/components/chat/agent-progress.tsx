"use client";

import {
  Loader2,
  CheckCircle2,
  Users,
  Globe,
  BookOpen,
  Archive,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AgentProgressData = {
  agent:
    | "orchestrator"
    | "faction_turn"
    | "world_advance"
    | "narrator"
    | "archivist";
  status: "started" | "completed";
  faction?: string;
  description?: string;
  preStepsCount?: number;
  summary?: string;
};

type AgentConfig = {
  icon: LucideIcon;
  startLabel: string | ((data: AgentProgressData) => string);
  doneLabel: string | ((data: AgentProgressData) => string) | null;
};

const AGENT_CONFIG: Record<AgentProgressData["agent"], AgentConfig> = {
  orchestrator: {
    icon: BookOpen,
    startLabel: "Planning...",
    doneLabel: (data) =>
      data.summary ? `Planned: ${data.summary}` : "Planned",
  },
  faction_turn: {
    icon: Users,
    startLabel: (data) => `${data.faction || "Faction"} acting...`,
    doneLabel: (data) => `${data.faction || "Faction"} done`,
  },
  world_advance: {
    icon: Globe,
    startLabel: (data) =>
      data.description
        ? `Advancing: ${data.description}`
        : "Advancing world...",
    doneLabel: "World advanced",
  },
  narrator: {
    icon: BookOpen,
    startLabel: "Narrating...",
    doneLabel: null, // We don't show "completed" for narrator since it streams
  },
  archivist: {
    icon: Archive,
    startLabel: "Recording...",
    doneLabel: "Recorded",
  },
};

export type AgentProgressIndicatorProps = {
  progress: AgentProgressData;
};

export function AgentProgressIndicator({
  progress,
}: AgentProgressIndicatorProps) {
  const { agent, status } = progress;
  const config = AGENT_CONFIG[agent];

  if (!config) {
    return null;
  }

  const Icon = status === "completed" ? CheckCircle2 : config.icon;

  const labelConfig =
    status === "started" ? config.startLabel : config.doneLabel;
  if (labelConfig === null) {
    return null;
  }

  const label =
    typeof labelConfig === "function" ? labelConfig(progress) : labelConfig;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
      {status === "started" ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Icon className="size-3 opacity-60" />
      )}
      <span className="italic">{label}</span>
    </div>
  );
}
