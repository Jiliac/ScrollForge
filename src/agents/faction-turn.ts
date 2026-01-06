export type FactionTurnResult = {
  summary: string;
};

export async function runFactionTurnStub(): Promise<FactionTurnResult> {
  return {
    summary: "(stub) faction_turn not implemented yet",
  };
}
