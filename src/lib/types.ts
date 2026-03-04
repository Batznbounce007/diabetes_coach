export type CgmSample = {
  timestamp: Date;
  glucose: number;
};

export type DailyInsight = {
  tirPercent: number;
  stdDev: number;
  coefficientVariance: number;
  streakDays: number;
  recommendation: string;
  motivationalMessage: string;
};
