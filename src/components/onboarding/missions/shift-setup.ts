import { Mission } from '../../../types/tour';

export const getShiftSetupMission = (brandSlug: string): Mission => ({
  id: 'shift-setup',
  title: 'Shift Toko',
  description: 'Kelola shift toko Anda.',
  difficulty: 'beginner',
  estimatedTime: '5m',
  reward: '50 XP',
  steps: [
    {
      id: 'shift',
      title: 'Halaman Shift Toko',
      description: 'Di halaman ini Anda dapat membuka shift baru, melihat shift yang sedang aktif, dan menutup shift. Pastikan shift aktif sebelum memulai transaksi.',
      route: `/${brandSlug}/panel/store-shift`,
      position: 'center',
      autoNavigate: true,
      missionId: 'shift-setup',
    },
  ],
});
