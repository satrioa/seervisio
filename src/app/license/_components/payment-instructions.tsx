"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PaymentInstructionsProps {
  bankName: string;
}

interface AccordionItem {
  id: string;
  label: string;
  steps: string[];
}

export function PaymentInstructions({ bankName }: PaymentInstructionsProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const items: AccordionItem[] = [
    {
      id: "mobile",
      label: `${bankName} Mobile`,
      steps: [
        "Buka aplikasi mobile banking Anda",
        "Pilih menu Transfer",
        "Masukkan nomor rekening tujuan yang tertera di atas",
        "Masukkan nominal sesuai Total Pembayaran",
        "Konfirmasi dan masukkan PIN",
        "Simpan bukti transfer untuk diunggah",
      ],
    },
    {
      id: "atm",
      label: "ATM",
      steps: [
        "Kunjungi mesin ATM terdekat",
        "Pilih menu Transfer",
        "Pilih jenis Bank yang sesuai",
        "Masukkan nomor rekening tujuan",
        "Masukkan nominal sesuai Total Pembayaran",
        "Konfirmasi dan selesaikan transaksi",
        "Simpan bukti transfer untuk diunggah",
      ],
    },
    {
      id: "internet",
      label: "Internet Banking",
      steps: [
        "Login ke internet banking Anda",
        "Pilih menu Transfer",
        "Masukkan nomor rekening tujuan",
        "Masukkan nominal sesuai Total Pembayaran",
        "Konfirmasi dengan OTP/Token",
        "Simpan bukti transfer untuk diunggah",
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <button
        type="button"
        onClick={() => toggle("main")}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={openId !== null}
        aria-controls="payment-instructions-content"
      >
        <span>Panduan Pembayaran</span>
        <motion.svg
          className="size-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: openId ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <polyline points="6 9 12 15 18 9" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {openId && (
          <motion.div
            id="payment-instructions-content"
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 rounded-xl border border-border/60 bg-muted/20 p-1">
              {items.map((item) => (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={openId === item.id}
                    aria-controls={`steps-${item.id}`}
                  >
                    <span className="font-medium">{item.label}</span>
                    <motion.svg
                      className="size-3.5 text-muted-foreground"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      animate={{ rotate: openId === item.id ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </motion.svg>
                  </button>

                  <AnimatePresence>
                    {openId === item.id && (
                      <motion.div
                        id={`steps-${item.id}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <ol className="space-y-2 px-3.5 pb-3 pt-1">
                          {item.steps.map((step, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2.5 text-sm text-muted-foreground"
                            >
                              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                {i + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
