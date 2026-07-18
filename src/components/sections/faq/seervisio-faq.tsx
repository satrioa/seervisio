import FAQ from "./default";

const FAQ_ITEMS = [
  {
    question: "Apakah Seervisio cocok untuk toko servis kecil?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Ya. Paket Trial gratis memungkinkan Anda mencoba semua fitur inti tanpa biaya. Saat bisnis berkembang, Anda bisa naik ke Pro atau Lifetime.
      </p>
    ),
  },
  {
    question: "Bagaimana cara mengelola beberapa cabang?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Seervisio mendukung multi-cabang. Anda dapat melihat performa, stok, dan tim setiap lokasi dari satu dashboard pusat dengan kontrol akses per cabang.
      </p>
    ),
  },
  {
    question: "Apakah ada aplikasi mobile?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Dashboard Seervisio responsif dan bisa diakses dari HP maupun tablet. Pelanggan juga mendapat portal mandiri untuk mengecek status servis.
      </p>
    ),
  },
  {
    question: "Metode pembayaran apa yang didukung?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Kami mendukung transfer bank, QRIS, dan e-wallet. Untuk langganan, Anda dapat memilih tagihan bulanan atau pembayaran sekali untuk akses seumur hidup.
      </p>
    ),
  },
  {
    question: "Apakah data saya aman?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Ya. Data Anda dicadangkan otomatis dan dilindungi dengan kontrol akses berbasis peran serta audit trail lengkap untuk keamanan maksimal.
      </p>
    ),
  },
  {
    question: "Apakah ada biaya tersembunyi?",
    answer: (
      <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
        Tidak. Harga kami transparan tanpa biaya tersembunyi. Yang Anda lihat di halaman paket adalah yang Anda bayar.
      </p>
    ),
  },
];

export function SeervisioFaq() {
  return (
    <FAQ
      title="Pertanyaan yang sering diajukan"
      items={FAQ_ITEMS}
    />
  );
}
