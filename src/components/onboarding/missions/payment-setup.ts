import { Mission } from '../../../types/tour';

export const getPaymentSetupMission = (brandSlug: string): Mission => ({
  id: 'payment-setup',
  title: 'Pembayaran',
  description: 'Atur metode pembayaran.',
  difficulty: 'intermediate',
  estimatedTime: '5m',
  reward: '150 XP',
  steps: [
    {
      id: 'payment-methods',
      title: 'Metode Pembayaran',
      description: 'Di halaman ini Anda dapat menambah dan mengkonfigurasi metode pembayaran yang tersedia untuk bisnis Anda.',
      route: `/${brandSlug}/panel/payment-methods`,
      position: 'center',
      autoNavigate: true,
      missionId: 'payment-setup',
    },
  ],
});
