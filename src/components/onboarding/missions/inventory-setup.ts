import { Mission } from '../../../types/tour';

export const getInventorySetupMission = (brandSlug: string): Mission => ({
  id: 'inventory-setup',
  title: 'Manajemen Inventaris',
  description: 'Kelola stok produk Anda.',
  difficulty: 'beginner',
  estimatedTime: '10m',
  reward: '100 XP',
  steps: [
    {
      id: 'inventory',
      title: 'Halaman Inventaris',
      description: 'Di halaman ini Anda dapat melihat stok barang, menambah kategori, dan mengelola inventaris toko.',
      route: `/${brandSlug}/panel/inventory-v4`,
      position: 'center',
      autoNavigate: true,
      missionId: 'inventory-setup',
    },
  ],
});
