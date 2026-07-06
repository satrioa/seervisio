import { TourConfig, Mission } from '../../types/tour';
import { getBusinessSetupMission } from '../../components/onboarding/missions/business-setup';
import { getInventorySetupMission } from '../../components/onboarding/missions/inventory-setup';
import { getPaymentSetupMission } from '../../components/onboarding/missions/payment-setup';
import { getFirstServiceMission } from '../../components/onboarding/missions/first-service';
import { getShiftSetupMission } from '../../components/onboarding/missions/shift-setup';

export const deepMerge = (target: any, source: any): any => {
  for (const key in source) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
};

const ROLE_MISSIONS: Record<string, string[]> = {
  PLATFORM_OWNER: ['business-setup', 'inventory-setup', 'payment-setup', 'shift-setup', 'first-service'],
  MASTER_ADMIN: ['business-setup', 'inventory-setup', 'payment-setup', 'shift-setup'],
  ADMIN: ['inventory-setup', 'shift-setup'],
  FRONTLINER: ['first-service'],
  TECHNICIAN: ['first-service'],
  CASHIER: ['first-service'],
  default: ['first-service'],
};

const MISSION_BUILDERS: Record<string, (brandSlug: string) => Mission> = {
  'business-setup': getBusinessSetupMission,
  'inventory-setup': getInventorySetupMission,
  'payment-setup': getPaymentSetupMission,
  'shift-setup': getShiftSetupMission,
  'first-service': getFirstServiceMission,
};

export const getTourConfig = (
  brandSlug: string,
  role: string,
  featureFlags: string[] = []
): TourConfig => {
  const missionIds = ROLE_MISSIONS[role] || ROLE_MISSIONS.default;

  const missions = missionIds
    .filter((id) => {
      const mission = MISSION_BUILDERS[id](brandSlug);
      return !mission.featureFlag || featureFlags.includes(mission.featureFlag);
    })
    .map((id) => MISSION_BUILDERS[id](brandSlug));

  return {
    missions,
    role,
    version: 1,
  };
};
