export interface MdrConfig {
  enabled: boolean;
  ratePercent: number;
  fixedFee: number;
  minAmount: number;
}

export interface MdrResult {
  grossAmount: number;
  mdrAmount: number;
  netAmount: number;
}

export function calculateMdr(
  amount: number,
  config: MdrConfig,
): MdrResult {
  if (!config.enabled) {
    return { grossAmount: amount, mdrAmount: 0, netAmount: amount };
  }

  if (amount < config.minAmount) {
    return { grossAmount: amount, mdrAmount: 0, netAmount: amount };
  }

  const mdrAmount = Math.round(amount * (config.ratePercent / 100) + config.fixedFee);
  const cappedAmount = Math.min(mdrAmount, amount);
  return {
    grossAmount: amount,
    mdrAmount: cappedAmount,
    netAmount: amount - cappedAmount,
  };
}
