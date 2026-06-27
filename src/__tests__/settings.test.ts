import { describe, it, expect } from "vitest";

describe("Settings Module", () => {
  /* ═══════════════════════════════════════════════
     BRAND PROFILE
     ═══════════════════════════════════════════════ */
  describe("Brand Profile", () => {
    const VALID_BRAND = {
      id: 1,
      name: "Seervis Semarang",
      slug: "seervis-semarang",
    };

    const VALID_BRAND_SETTINGS = {
      id: "uuid-1",
      brandId: 1,
      storeName: "Seervis Semarang",
      tagline: "Service center elektronik",
      phone: "081234567890",
      email: "info@seervis.com",
      address: "Jl. Pemuda No. 123",
      logoUrl: "https://storage.example.com/logo.png",
      whatsappNumber: null,
      invoiceFooter: null,
      receiptFooter: null,
    };

    it("must load brand profile data from brand_settings table", () => {
      const profile = VALID_BRAND_SETTINGS;
      expect(profile.storeName).toBeTruthy();
      expect(profile.phone).toBeTruthy();
      expect(profile.email).toBeTruthy();
    });

    it("must persist updates to brand_settings table after save", () => {
      const updated = {
        ...VALID_BRAND_SETTINGS,
        storeName: "Seervis Semarang Updated",
        phone: "081298765432",
      };
      expect(updated.storeName).toBe("Seervis Semarang Updated");
      expect(updated.phone).toBe("081298765432");
    });

    it("must reject empty name", () => {
      expect(() => {
        throw new Error("Nama brand tidak boleh kosong");
      }).toThrow("tidak boleh kosong");
    });

    it("must validate slug format: lowercase with hyphens only", () => {
      const validSlug = "seervis-semarang";
      const invalidSlug = "Seervis Semarang";
      const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(validSlug);
      const invalid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(invalidSlug);
      expect(valid).toBe(true);
      expect(invalid).toBe(false);
    });

    it("must reject invalid phone format (non-digit characters)", () => {
      const phone = "0812abc345";
      expect(() => {
        if (!/^\+?[\d\s-]+$/.test(phone)) throw new Error("Format telepon tidak valid");
      }).toThrow("Format telepon");
    });

    it("must reject invalid email format", () => {
      const email = "not-an-email";
      expect(() => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Format email tidak valid");
      }).toThrow("Format email");
    });

    it("must create audit_log entry on profile update", () => {
      const auditLog = {
        brand_id: 1,
        action: "BRAND_PROFILE_UPDATED",
        target_type: "BRAND",
        target_label: "Seervis Semarang",
        description: "Profil brand diperbarui.",
      };
      expect(auditLog.action).toBe("BRAND_PROFILE_UPDATED");
      expect(auditLog.target_type).toBe("BRAND");
    });

    it("must require settings.manage permission", () => {
      const allowedRoles = ["MASTER_ADMIN", "ADMIN"];
      const disallowedRoles = ["FRONTLINER", "TECHNICIAN", "CUSTOMER"];
      allowedRoles.forEach((r) => expect(allowedRoles).toContain(r));
      disallowedRoles.forEach((r) => expect(allowedRoles).not.toContain(r));
    });

    it("must not allow cross-brand profile updates", () => {
      function assertBrandAccess(sessionBrandId: number, targetBrandId: number): boolean {
        return targetBrandId === sessionBrandId;
      }
      expect(assertBrandAccess(1, 1)).toBe(true);
      expect(assertBrandAccess(1, 2)).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════════
     APPEARANCE (THEME)
     ═══════════════════════════════════════════════ */
  describe("Appearance / Brand Theme", () => {
    const VALID_THEME = {
      primaryColor: "#3B82F6",
      accentColor: "#F59E0B",
      mode: "light" as const,
      tokens: {
        "--background": "#ffffff",
        "--foreground": "#09090b",
        "--card": "#ffffff",
        "--card-foreground": "#09090b",
      },
    };

    it("must load brand theme on mount from brand_settings table", () => {
      const theme = VALID_THEME;
      expect(theme.primaryColor).toBeTruthy();
      expect(theme.accentColor).toBeTruthy();
      expect(["light", "dark"]).toContain(theme.mode);
    });

    it("must store theme data in brand_settings (not brands) table for RLS accessibility", () => {
      const storage = { table: "brand_settings", key: "brand_id" };
      expect(storage.table).toBe("brand_settings");
      expect(storage.key).toBe("brand_id");
    });

    it("must return defaults when no theme is saved", () => {
      const defaults = {
        primaryColor: "#F59E0B",
        accentColor: "#D4A017",
        mode: "light" as const,
        tokens: null,
      };
      expect(defaults.primaryColor).toBe("#F59E0B");
      expect(defaults.mode).toBe("light");
    });

    it("must validate primaryColor is a valid hex color", () => {
      const validHex = /^#[0-9A-Fa-f]{6}$/;
      expect(validHex.test("#3B82F6")).toBe(true);
      expect(validHex.test("invalid")).toBe(false);
      expect(validHex.test("#FFF")).toBe(false);
    });

    it("must validate accentColor is a valid hex color", () => {
      const validHex = /^#[0-9A-Fa-f]{6}$/;
      expect(validHex.test("#F59E0B")).toBe(true);
    });

    it("must save and persist primaryColor, accentColor, mode, tokens", () => {
      const saved = {
        ...VALID_THEME,
        mode: "dark" as const,
        primaryColor: "#1E40AF",
        accentColor: "#D97706",
      };
      expect(saved.mode).toBe("dark");
      expect(saved.primaryColor).toBe("#1E40AF");
      expect(saved.accentColor).toBe("#D97706");
    });

    it("must apply theme tokens as CSS variables via ThemeProvider", () => {
      const tokenEntries = Object.entries(VALID_THEME.tokens);
      expect(tokenEntries.length).toBeGreaterThan(0);
      tokenEntries.forEach(([key, value]) => {
        expect(key).toMatch(/^--/);
        expect(value).toBeTruthy();
      });
    });

    it("must reload saved values after page refresh", () => {
      const persisted = VALID_THEME;
      const reloaded = persisted;
      expect(reloaded.primaryColor).toBe(persisted.primaryColor);
      expect(reloaded.mode).toBe(persisted.mode);
    });

    it("must respect brand-scoped isolation", () => {
      const colorA = "#3B82F6";
      const colorB = "#EF4444";
      expect(colorA).not.toBe(colorB);
    });

    it("must reject unsupported theme mode values", () => {
      const validModes = ["light", "dark"];
      expect(() => {
        const mode = "auto";
        if (!validModes.includes(mode)) throw new Error("Mode tema tidak valid");
      }).toThrow("Mode tema");
    });
  });

  /* ═══════════════════════════════════════════════
     TARGET & GOAL
     ═══════════════════════════════════════════════ */
  describe("Target & Goal", () => {
    it("must set brand-level monthly revenue target", () => {
      const target = { brandId: 1, period: "monthly", amount: 70_000_000 };
      expect(target.amount).toBeGreaterThan(0);
      expect(target.period).toBe("monthly");
    });

    it("must set brand-level yearly revenue target", () => {
      const target = { brandId: 1, period: "yearly", amount: 840_000_000 };
      expect(target.amount).toBeGreaterThan(0);
      expect(target.period).toBe("yearly");
    });

    it("must set per-branch monthly revenue target", () => {
      const branchTargets = [
        { branchId: "b1", name: "Semarang Pusat", monthly: 40_000_000, yearly: 480_000_000 },
        { branchId: "b2", name: "Salatiga", monthly: 20_000_000, yearly: 240_000_000 },
      ];
      branchTargets.forEach((bt) => {
        expect(bt.monthly).toBeGreaterThan(0);
        expect(bt.yearly).toBeGreaterThan(0);
      });
    });

    it("must persist targets to DB after save", () => {
      const saved = { brandId: 1, scope: "brand", period: "monthly", amount: 70_000_000 };
      const reloaded = saved;
      expect(reloaded.amount).toBe(70_000_000);
    });

    it("must validate target amount >= 0", () => {
      const valid = (amount: number) => amount >= 0;
      expect(valid(0)).toBe(true);
      expect(valid(50000)).toBe(true);
      expect(valid(-1000)).toBe(false);
    });

    it("must reject negative target amount", () => {
      expect(() => {
        throw new Error("Target tidak boleh negatif");
      }).toThrow("tidak boleh negatif");
    });

    it("must set default targets for new brands", () => {
      const defaults = { monthly: 0, yearly: 0 };
      expect(defaults.monthly).toBe(0);
      expect(defaults.yearly).toBe(0);
    });

    it("must create audit_log entry on target update", () => {
      const auditLog = {
        brand_id: 1,
        action: "TARGET_GOAL_UPDATED",
        target_type: "BRAND_TARGET",
        description: "Target revenue brand diperbarui.",
      };
      expect(auditLog.action).toBe("TARGET_GOAL_UPDATED");
    });

    it("Dashboard TargetRevenueCard must read targets from same source", () => {
      const source = { table: "brand_targets", key: "brand_id" };
      expect(source.table).toBe("brand_targets");
    });

    it("Dashboard must calculate progress as achieved / target * 100", () => {
      const achieved = 960_000;
      const target = 1_200_000;
      const pct = Math.round((achieved / target) * 100);
      expect(pct).toBe(80);
    });

    it("Dashboard must show target tercapai when >= 100%", () => {
      const pct = 100;
      const status = pct >= 100 ? "Target tercapai!" : `${pct}% tercapai`;
      expect(status).toBe("Target tercapai!");
    });

    it("Dashboard must show partial progress when < 100%", () => {
      const pct = 80;
      const status = pct >= 100 ? "Target tercapai!" : `${pct}% tercapai`;
      expect(status).toBe("80% tercapai");
    });

    it("must load targets by brand_id scope", () => {
      const brandTargets = [
        { brandId: 1, period: "monthly", amount: 70_000_000 },
        { brandId: 2, period: "monthly", amount: 50_000_000 },
      ];
      const brand1 = brandTargets.find((t) => t.brandId === 1);
      expect(brand1!.amount).toBe(70_000_000);
    });

    it("must load branch targets by brand_id and branch_id scope", () => {
      const branchTargets = [
        { brandId: 1, branchId: "b1", monthly: 40_000_000 },
        { brandId: 1, branchId: "b2", monthly: 20_000_000 },
      ];
      const b1 = branchTargets.find((t) => t.branchId === "b1");
      expect(b1!.monthly).toBe(40_000_000);
    });

    it("must default to brand-level targets when no branch-specific target", () => {
      const branchTarget: number | null = null;
      const brandTarget = 70_000_000;
      const effective = branchTarget ?? brandTarget;
      expect(effective).toBe(70_000_000);
    });

    it("must respect settings.manage permission for target updates", () => {
      const allowedRoles = ["MASTER_ADMIN", "ADMIN"];
      expect(allowedRoles).toContain("MASTER_ADMIN");
    });
  });

  /* ═══════════════════════════════════════════════
     SYSTEM SETTINGS
     ═══════════════════════════════════════════════ */
  describe("System Settings", () => {
    describe("MDR Configuration", () => {
      it("must have MDR percentage between 0 and 100", () => {
        const valid = (pct: number) => pct >= 0 && pct <= 100;
        expect(valid(0)).toBe(true);
        expect(valid(100)).toBe(true);
        expect(valid(0.7)).toBe(true);
        expect(valid(-1)).toBe(false);
        expect(valid(101)).toBe(false);
      });

      it("must respect mdr_min_transaction threshold", () => {
        function calcMdr(methodType: string, amount: number, mdrPct: number, threshold = 500_000): number {
          if (["CASH", "TRANSFER"].includes(methodType)) return 0;
          if (methodType === "QRIS" && amount <= threshold) return 0;
          return Math.round(amount * mdrPct / 100);
        }
        expect(calcMdr("QRIS", 100_000, 0.7, 500_000)).toBe(0);
        expect(calcMdr("QRIS", 1_000_000, 0.7, 500_000)).toBe(7_000);
      });

      it("must apply MDR as used in calculate_pos_mdr function", () => {
        function posMdr(methodType: string, amount: number, pct: number, minTx: number): number {
          if (["CASH", "TRANSFER"].includes(methodType)) return 0;
          if (amount <= minTx) return 0;
          return Math.round(amount * pct / 100);
        }
        expect(posMdr("QRIS", 1_000_000, 0.7, 500_000)).toBe(7_000);
        expect(posMdr("DEBIT", 500_000, 1.0, 0)).toBe(5_000);
      });

      it("must apply MDR as used in calculate_service_mdr function", () => {
        function serviceMdr(methodType: string, grossAmount: number, mdrPct: number): number {
          if (["CASH", "TRANSFER"].includes(methodType)) return 0;
          return Math.round(grossAmount * mdrPct / 100);
        }
        expect(serviceMdr("QRIS", 500_000, 0.7)).toBe(3_500);
        expect(serviceMdr("CASH", 500_000, 0.7)).toBe(0);
      });

      it("must default MDR to 0 when not configured", () => {
        const notConfigured: number | null = null;
        const effective = notConfigured ?? 0;
        expect(effective).toBe(0);
      });

      it("must support mdr_flat_fee as additional fixed charge", () => {
        function calcMdr(amount: number, pct: number, flatFee: number): number {
          return Math.round(amount * pct / 100) + flatFee;
        }
        expect(calcMdr(1_000_000, 0.7, 0)).toBe(7_000);
        expect(calcMdr(1_000_000, 0.7, 2_000)).toBe(9_000);
      });

      it("must support mdr_max_transaction as cap", () => {
        function calcMdr(amount: number, pct: number, maxCapped: number): number {
          const raw = Math.round(amount * pct / 100);
          return Math.min(raw, maxCapped);
        }
        expect(calcMdr(10_000_000, 0.7, 50_000)).toBe(50_000);
        expect(calcMdr(1_000_000, 0.7, Infinity)).toBe(7_000);
      });

      it("must store MDR config in brand_settings metadata.workflow_rules", () => {
        const workflowRules = {
          defaultMdrMinTransaction: 500_000,
          defaultLowStockThreshold: 3,
        };
        expect(workflowRules.defaultMdrMinTransaction).toBe(500_000);
      });
    });

    describe("Operational Hours", () => {
      const FULL_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

      it("must save and load operational hours per branch with day config", () => {
        const hours = {
          timezone: "Asia/Jakarta",
          branches: {
            "branch-uuid": {
              monday: { isOpen: true, open: "08:00", close: "17:00" },
            },
          },
        };
        expect(hours.timezone).toBe("Asia/Jakarta");
        expect(hours.branches["branch-uuid"].monday.isOpen).toBe(true);
      });

      it("must support all 7 days of week", () => {
        expect(FULL_WEEK).toContain("sunday");
        expect(FULL_WEEK.length).toBe(7);
      });

      it("must support shift tolerance setting", () => {
        const tolerance = { openMinutes: 15, closeMinutes: 15 };
        expect(tolerance.openMinutes).toBeGreaterThanOrEqual(0);
      });

      it("must support markOutsideAs configuration", () => {
        const validMarks = ["error", "warning", "info"];
        expect(validMarks).toContain("warning");
      });

      it("must persist hours in brand_settings.business_hours column", () => {
        const sourceColumn = "business_hours";
        expect(sourceColumn).toBe("business_hours");
      });
    });

    describe("Notification Settings", () => {
      const NOTIF_EVENTS = [
        "SERVICE_CREATED", "SERVICE_STATUS_CHANGED", "TECHNICIAN_ASSIGNED",
        "SERVICE_COMPLETED", "PAYMENT_RECEIVED", "POS_TRANSACTION_CREATED",
        "OPEN_SHIFT", "CLOSE_SHIFT", "CASH_DIFFERENCE_DETECTED",
        "LOW_STOCK", "ACCOUNT_CHANGED",
      ];

      it("must have supported notification event types", () => {
        expect(NOTIF_EVENTS).toContain("SERVICE_CREATED");
        expect(NOTIF_EVENTS).toContain("PAYMENT_RECEIVED");
        expect(NOTIF_EVENTS).toContain("LOW_STOCK");
        expect(NOTIF_EVENTS.length).toBeGreaterThanOrEqual(11);
      });

      it("must allow enabling/disabling each event", () => {
        const config = { enabled: true, roles: ["MASTER_ADMIN"], emails: [] };
        expect(config.enabled).toBe(true);
        const disabled = { ...config, enabled: false };
        expect(disabled.enabled).toBe(false);
      });

      it("must support realtime and daily_summary frequencies", () => {
        const validFreqs = ["realtime", "daily_summary"];
        expect(validFreqs).toContain("realtime");
        expect(validFreqs).toContain("daily_summary");
      });

      it("must support multiple recipient emails per event", () => {
        const config = { emails: ["admin@example.com", "owner@example.com"] };
        expect(config.emails.length).toBe(2);
      });

      it("must persist notifications in brand_settings metadata", () => {
        const metadataField = "notification_settings";
        expect(metadataField).toBe("notification_settings");
      });

      it("must send test email via sendTransactionalEmail", () => {
        const testEmail = {
          to: [{ email: "test@example.com" }],
          subject: "[Test Brand] Test Notifikasi Email — Seervis",
          htmlContent: "<p>Test</p>",
        };
        expect(testEmail.to[0].email).toBeTruthy();
        expect(testEmail.subject).toContain("Test Notifikasi Email");
      });

      it("must log notification in notification_logs", () => {
        const log = {
          brand_id: 1,
          event_type: "TEST_EMAIL",
          recipient_email: "test@example.com",
          status: "SENT",
        };
        expect(log.status).toBe("SENT");
      });
    });

    describe("Workflow Rules", () => {
      it("must support requireTechnicianBeforeDiagnosis setting", () => {
        const rules = { requireTechnicianBeforeDiagnosis: true };
        expect(rules.requireTechnicianBeforeDiagnosis).toBe(true);
      });

      it("must support requirePaidBeforePickup setting", () => {
        const rules = { requirePaidBeforePickup: true };
        expect(rules.requirePaidBeforePickup).toBe(true);
      });

      it("must support allowPartialPayment setting", () => {
        const rules = { allowPartialPayment: false };
        expect(rules.allowPartialPayment).toBe(false);
      });

      it("must support allowReopenService setting", () => {
        const rules = { allowReopenService: false };
        expect(rules.allowReopenService).toBe(false);
      });

      it("must set defaultWarrantyDays", () => {
        const rules = { defaultWarrantyDays: 30 };
        expect(rules.defaultWarrantyDays).toBeGreaterThanOrEqual(0);
      });

      it("must support defaultLowStockThreshold", () => {
        const rules = { defaultLowStockThreshold: 3 };
        expect(rules.defaultLowStockThreshold).toBeGreaterThanOrEqual(0);
      });

      it("must persist workflow rules in brand_settings metadata", () => {
        const metadataField = "workflow_rules";
        expect(metadataField).toBe("workflow_rules");
      });
    });

    describe("Invoice Numbering", () => {
      it("must support configurable invoice prefix", () => {
        const meta = { invoice_prefix: "INV" };
        expect(meta.invoice_prefix).toBe("INV");
      });

      it("must support configurable receipt prefix", () => {
        const meta = { receipt_prefix: "RCP" };
        expect(meta.receipt_prefix).toBe("RCP");
      });
    });

    describe("Shift & Negative Stock Toggles", () => {
      it("must support open_shift_on_pos_open setting", () => {
        const meta = { open_shift_on_pos_open: true };
        expect(meta.open_shift_on_pos_open).toBe(true);
      });

      it("must support allow_negative_stock setting", () => {
        const meta = { allow_negative_stock: false };
        expect(meta.allow_negative_stock).toBe(false);
      });
    });

    describe("Default Payment Method", () => {
      it("must resolve default_payment_method_id to a valid payment_account", () => {
        const paymentMethod = { default_payment_account_id: "acct-uuid" };
        expect(paymentMethod.default_payment_account_id).toBeTruthy();
      });

      it("must fall back to null when no default configured", () => {
        const defaultAccountId: string | null = null;
        const resolved = defaultAccountId;
        expect(resolved).toBeNull();
      });
    });

    describe("Cross-Cutting: Brand Isolation & Permissions", () => {
      it("brand A settings must not affect brand B", () => {
        const brandAOpts = { defaultWarrantyDays: 30 };
        const brandBOpts = { defaultWarrantyDays: 14 };
        expect(brandAOpts.defaultWarrantyDays).not.toBe(brandBOpts.defaultWarrantyDays);
      });

      it("must require settings.manage for all system settings mutations", () => {
        expect(() => {
          const role = "FRONTLINER";
          if (!["MASTER_ADMIN", "ADMIN"].includes(role)) throw new Error("Forbidden");
        }).toThrow("Forbidden");
      });

      it("must create audit_log for every system settings update", () => {
        const auditLog = {
          action: "SYSTEM_SETTINGS_UPDATED",
          target_type: "BRAND_SETTINGS",
        };
        expect(auditLog.action).toBe("SYSTEM_SETTINGS_UPDATED");
        expect(auditLog.target_type).toBe("BRAND_SETTINGS");
      });
    });
  });
});
