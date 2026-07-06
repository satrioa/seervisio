import { Mission } from '../../../types/tour';

export const getFirstServiceMission = (brandSlug: string): Mission => ({
  id: 'first-service',
  title: 'Servis Pertama',
  description: 'Pelajari cara mengelola servis.',
  difficulty: 'beginner',
  estimatedTime: '3m',
  reward: '20 XP',
  steps: [
    {
      id: 'services',
      title: 'Halaman Servis',
      description: 'Ini adalah halaman daftar servis. Di sini Anda dapat membuat servis baru, melihat status servis, dan mengelola antrian pekerjaan.',
      route: `/${brandSlug}/panel/services`,
      position: 'center',
      autoNavigate: true,
      missionId: 'first-service',
    },
  ],
});
