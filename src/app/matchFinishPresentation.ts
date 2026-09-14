export interface MatchFinishFramePlan {
  startResultTimer: boolean;
  keepRendering: boolean;
}

export function getMatchFinishFramePlan(
  winnerDecided: boolean,
  resultTimerStarted: boolean,
): MatchFinishFramePlan {
  return {
    startResultTimer: winnerDecided && !resultTimerStarted,
    keepRendering: true,
  };
}
