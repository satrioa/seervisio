import { Mission } from '../../../types/tour';

export const getBusinessSetupMission = (brandSlug: string): Mission => ({
  id: 'business-setup',
  title: 'Pengaturan Bisnis',
  description: 'Konfigurasi detail bisnis Anda.',
  difficulty: 'beginner',
  estimatedTime: '5m',
  reward: '50 XP',
  steps: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Ini adalah dashboard Anda. Di sini Anda bisa melihat ringkasan performa bisnis, termasuk pendapatan, servis, dan inventaris.',
      route: `/${brandSlug}/panel/dashboard`,
      position: 'center',
      autoNavigate: true,
      missionId: 'business-setup',
    },
    {
      id: 'settings',
      title: 'Pengaturan Toko',
      description: 'Di halaman pengaturan, Anda dapat mengkonfigurasi profil bisnis, cabang, dan preferensi toko Anda.',
      route: `/${brandSlug}/panel/settings`,
      position: 'center',
      autoNavigate: true,
      missionId: 'business-setup',
    },
  ],
});
