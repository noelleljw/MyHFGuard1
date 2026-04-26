export type BaselineProfile = {
  baselineWeightKg: number;
  baselineSys?: number;
  baselineDia?: number;
  waterTargetMl?: number;
  saltTargetLevel?: "low" | "moderate";
};

export type WeightEntry = {
  time: string;
  kg: number;
};

export type BPEntry = {
  time: string;
  systolic: number;
  diastolic: number;
};

export type SymptomEntry = {
  time: string;
  cough: number;
  breathlessness: number;
  swelling: number;
  weightGain: number;
  abdomen: number;
  sleeping: number;
};

export type WaterSaltEntry = {
  time: string;
  waterMl: number;
  saltLevel: "low" | "moderate" | "high";
};

export type AlertLevel = "green" | "orange" | "red";

export type HFAlert = {
  type: string;
  level: AlertLevel;
  title: string;
  message: string;
};

function diffDays(a: Date, b: Date) {
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function evaluateWeightAlerts(
  baseline: BaselineProfile,
  weights: WeightEntry[]
): HFAlert[] {
  const alerts: HFAlert[] = [];
  if (!weights.length) return alerts;

  const sorted = [...weights].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const latest = sorted[sorted.length - 1];
  const baselineDiff = latest.kg - baseline.baselineWeightKg;

  if (baselineDiff >= 5) {
    alerts.push({
      type: "weight",
      level: "red",
      title: "Weight critically above baseline",
      message: `Current weight is ${baselineDiff.toFixed(1)}kg above baseline.`,
    });
  } else if (baselineDiff >= 3) {
    alerts.push({
      type: "weight",
      level: "orange",
      title: "Weight above baseline",
      message: `Current weight is ${baselineDiff.toFixed(1)}kg above baseline.`,
    });
  }

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const d1 = new Date(sorted[i].time);
      const d2 = new Date(sorted[j].time);
      const gap = diffDays(d1, d2);
      const gain = sorted[j].kg - sorted[i].kg;

      if (gap <= 2 && gain >= 3) {
        alerts.push({
          type: "weight",
          level: "orange",
          title: "Rapid weight gain",
          message: `Weight increased ${gain.toFixed(1)}kg within 2 days.`,
        });
        return alerts;
      }

      if (gap <= 5 && gain >= 2) {
        alerts.push({
          type: "weight",
          level: "orange",
          title: "Weight increasing",
          message: `Weight increased ${gain.toFixed(1)}kg within 5 days.`,
        });
        return alerts;
      }
    }
  }

  return alerts;
}

export function classifyBP(systolic: number, diastolic: number): AlertLevel {
  if (systolic >= 180 || diastolic >= 120) return "red";
  if ((systolic >= 140 && systolic <= 179) || (diastolic >= 90 && diastolic <= 119)) return "red";
  if ((systolic >= 120 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return "orange";
  return "green";
}

export function evaluateBPAlerts(bp: BPEntry[]): HFAlert[] {
  const alerts: HFAlert[] = [];
  if (bp.length < 2) return alerts;

  const sorted = [...bp].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
  const lastTwo = sorted.slice(-2);

  const tooLow = lastTwo.every(x => x.systolic < 80 || x.diastolic < 50);
  const tooHigh = lastTwo.every(x => x.systolic > 180 || x.diastolic > 90);

  if (tooLow) {
    alerts.push({
      type: "bp",
      level: "red",
      title: "Blood pressure too low",
      message: "BP was below 80/50 for 2 consecutive checks.",
    });
  }

  if (tooHigh) {
    alerts.push({
      type: "bp",
      level: "red",
      title: "Blood pressure too high",
      message: "BP was above threshold for 2 consecutive checks.",
    });
  }

  return alerts;
}

export function evaluateSymptomAlerts(symptoms: SymptomEntry[]): HFAlert[] {
  const alerts: HFAlert[] = [];
  if (!symptoms.length) return alerts;

  const worseningCount = (s: SymptomEntry) =>
    [s.cough, s.breathlessness, s.swelling, s.weightGain, s.abdomen, s.sleeping]
      .filter(v => v >= 3).length;

  const sorted = [...symptoms].sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );

  const latest = sorted[sorted.length - 1];
  if (worseningCount(latest) >= 3) {
    alerts.push({
      type: "symptom",
      level: "red",
      title: "Symptoms worsening",
      message: "At least 3 symptoms are worsening today. Please seek medical advice.",
    });
  }

  if (sorted.length >= 3) {
    const lastThree = sorted.slice(-3);
    const consecutive = lastThree.every(s => worseningCount(s) >= 2);
    if (consecutive) {
      alerts.push({
        type: "symptom",
        level: "red",
        title: "Persistent symptom worsening",
        message: "At least 2 symptoms worsened for 3 consecutive days.",
      });
    }
  }

  return alerts;
}

export function evaluateWaterSaltAlerts(
  baseline: BaselineProfile,
  logs: WaterSaltEntry[]
): HFAlert[] {
  const alerts: HFAlert[] = [];
  if (!logs.length) return alerts;

  const latest = logs[logs.length - 1];

  if (baseline.waterTargetMl && latest.waterMl > baseline.waterTargetMl) {
    alerts.push({
      type: "water",
      level: latest.waterMl > baseline.waterTargetMl * 1.2 ? "red" : "orange",
      title: "Water intake above target",
      message: `Today's water intake is ${latest.waterMl}ml.`,
    });
  }

  if (latest.saltLevel === "high") {
    alerts.push({
      type: "salt",
      level: "red",
      title: "Salt intake too high",
      message: "Today's salt intake is marked as high.",
    });
  } else if (latest.saltLevel === "moderate") {
    alerts.push({
      type: "salt",
      level: "orange",
      title: "Salt intake moderate",
      message: "Please monitor your salt intake closely.",
    });
  }

  return alerts;
}