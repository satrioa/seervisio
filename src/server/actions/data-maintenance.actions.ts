"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import JSZip from "jszip";
import { getSessionData, requireActionPermission, successResult, errorResult, type ActionResult } from "./action-helper";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function toCSV(rows: Record<string, any>[], columns: string[]): string {
  const header = columns.join(",");
  const body = rows.map((r) =>
    columns.map((c) => `"${(r[c] ?? "").toString().replace(/"/g, '""')}"`).join(",")
  ).join("\n");
  return header + "\n" + body;
}

async function assertMasterAdmin(brandSlug: string) {
  const session = await getSessionData(brandSlug);
  requireActionPermission(session.role, PERMISSIONS.DATA_MANAGE);
  return session;
}

async function assertCanExport(brandSlug: string) {
  const session = await getSessionData(brandSlug);
  const allowed = session.role === "MASTER_ADMIN" || session.role === "PLATFORM_OWNER" || session.role === "ADMIN";
  if (!allowed) throw new Error("Anda tidak memiliki izin untuk mengekspor data.");
  return session;
}

async function writeAuditLog(adminDb: any, action: string, targetLabel: string, description: string, details: Record<string, any>, actor: { profileId: string; brandId: number; brandName: string }, ip?: string) {
  await (adminDb as any).from("audit_logs").insert({
    brand_id: actor.brandId,
    actor_id: actor.profileId,
    action,
    target_type: "DATA_MAINTENANCE",
    target_label: targetLabel,
    description,
    details,
    ip_address: ip ?? null,
  });
}

/* ── Record Counts ── */

export interface RecordCounts {
  customers: number;
  services: number;
  servicePayments: number;
  inventoryItems: number;
  inventoryMovements: number;
  inventoryItemUnits: number;
  branches: number;
  users: number;
  paymentAccounts: number;
  paymentMethods: number;
  financeLedger: number;
  serviceSparepartUsages: number;
}

export async function getRecordCountsAction(brandSlug: string): Promise<ActionResult<RecordCounts>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const db = adminDb as any;

    const [
      c, sv, sp, inv, invm, invu, br, us, pa, pm, fl, ssu,
    ] = await Promise.all([
      db.from("customers").select("*", { count: "exact", head: true }).eq("brand_id", b).is("deleted_at", null),
      db.from("services").select("*", { count: "exact", head: true }).eq("brand_id", b).is("deleted_at", null),
      db.from("service_payments").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("inventory_items").select("*", { count: "exact", head: true }).eq("brand_id", b).is("deleted_at", null),
      db.from("inventory_movements").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("inventory_item_units").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("branches").select("*", { count: "exact", head: true }).eq("brand_id", b).is("deleted_at", null),
      db.from("user_brand_memberships").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("payment_accounts").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("payment_methods").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("finance_ledger").select("*", { count: "exact", head: true }).eq("brand_id", b),
      db.from("service_sparepart_usages").select("*", { count: "exact", head: true }).eq("brand_id", b),
    ]);

    return successResult({
      customers: (c as any).count ?? 0,
      services: (sv as any).count ?? 0,
      servicePayments: (sp as any).count ?? 0,
      inventoryItems: (inv as any).count ?? 0,
      inventoryMovements: (invm as any).count ?? 0,
      inventoryItemUnits: (invu as any).count ?? 0,
      branches: (br as any).count ?? 0,
      users: (us as any).count ?? 0,
      paymentAccounts: (pa as any).count ?? 0,
      paymentMethods: (pm as any).count ?? 0,
      financeLedger: (fl as any).count ?? 0,
      serviceSparepartUsages: (ssu as any).count ?? 0,
    });
  } catch (err: any) {
    console.error("[getRecordCountsAction]", err);
    return errorResult(err.message ?? "Gagal mengambil jumlah record.");
  }
}

/* ── 1. Clear Cache ── */

export async function clearCacheAction(brandSlug: string): Promise<ActionResult<void>> {
  try {
    const session = await assertMasterAdmin(brandSlug);

    revalidatePath("/");
    revalidateTag(`brand:${session.brandId}`);
    revalidateTag(`brand_settings:${session.brandId}`);
    revalidateTag(`branches:${session.brandId}`);
    revalidateTag(`services:${session.brandId}`);

    const adminDb = createServiceRoleSupabaseClient();
    await writeAuditLog(adminDb, "CACHE_CLEARED", session.brandName, "Cache aplikasi dibersihkan.", {}, session);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[clearCacheAction]", err);
    return errorResult(err.message ?? "Gagal membersihkan cache.");
  }
}

/* ── 2. Export Brand Configuration (JSON) ── */

export async function exportBrandConfigAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const [brandResult, settingsResult, targetsResult, methodsResult, accountsResult] = await Promise.all([
      (adminDb as any).from("brands").select("*").eq("id", b).maybeSingle(),
      (adminDb as any).from("brand_settings").select("*").eq("brand_id", b).maybeSingle(),
      (adminDb as any).from("brand_targets").select("*").eq("brand_id", b),
      (adminDb as any).from("payment_methods").select("*").eq("brand_id", b),
      (adminDb as any).from("payment_accounts").select("*").eq("brand_id", b),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      brand: brandResult.data,
      brandSettings: settingsResult.data,
      targets: targetsResult.data ?? [],
      paymentMethods: methodsResult.data ?? [],
      paymentAccounts: accountsResult.data ?? [],
    };

    const json = JSON.stringify(payload, null, 2);

    const adminDb2 = createServiceRoleSupabaseClient();
    await writeAuditLog(adminDb2, "EXPORT_BRAND_CONFIG", session.brandName, "Konfigurasi brand diekspor.", { format: "json", tables: ["brands", "brand_settings", "brand_targets", "payment_methods", "payment_accounts"] }, session);

    return successResult(json);
  } catch (err: any) {
    console.error("[exportBrandConfigAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor konfigurasi brand.");
  }
}

/* ── 3. Export Users (CSV) ── */

export async function exportUsersAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    const { data: memberships } = await adminDb
      .from("user_brand_memberships")
      .select("id, role, is_active, profile:profiles!inner(id, name, email)")
      .eq("brand_id", session.brandId);

    const rows = (memberships ?? []).map((m: any) => ({
      name: m.profile?.name ?? "",
      email: m.profile?.email ?? "",
      role: m.role,
      active: m.is_active,
    }));

    const csv = toCSV(rows, ["name", "email", "role", "active"]);

    await writeAuditLog(adminDb, "EXPORT_USERS", session.brandName, "Data pengguna brand diekspor.", { format: "csv", count: rows.length }, session);

    return successResult(csv);
  } catch (err: any) {
    console.error("[exportUsersAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor pengguna.");
  }
}

/* ── 4. Export Customers (CSV) ── */

export async function exportCustomersAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    const { data: customers } = await adminDb
      .from("customers")
      .select("name, phone, email, address, notes, created_at")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);

    const csv = toCSV(customers ?? [], ["name", "phone", "email", "address", "notes", "created_at"]);

    await writeAuditLog(adminDb, "EXPORT_CUSTOMERS", session.brandName, "Data pelanggan diekspor.", { format: "csv", count: (customers ?? []).length }, session);

    return successResult(csv);
  } catch (err: any) {
    console.error("[exportCustomersAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor pelanggan.");
  }
}

/* ── 5. Export Services (CSV) ── */

export async function exportServicesAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    const { data: services } = await adminDb
      .from("services")
      .select("service_number, device_type, device_brand, device_model, device_imei, reported_issue, current_status, estimated_cost, final_cost, created_at, customer:customers!inner(name)")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);

    const rows = (services ?? []).map((s: any) => ({
      service_number: s.service_number,
      customer_name: s.customer?.name ?? "",
      device_type: s.device_type ?? "",
      device_brand: s.device_brand ?? "",
      device_model: s.device_model ?? "",
      device_imei: s.device_imei ?? "",
      reported_issue: s.reported_issue ?? "",
      current_status: s.current_status,
      estimated_cost: s.estimated_cost ?? 0,
      final_cost: s.final_cost ?? 0,
      created_at: s.created_at,
    }));

    const csv = toCSV(rows, ["service_number", "customer_name", "device_type", "device_brand", "device_model", "device_imei", "reported_issue", "current_status", "estimated_cost", "final_cost", "created_at"]);

    await writeAuditLog(adminDb, "EXPORT_SERVICES", session.brandName, "Data servis diekspor.", { format: "csv", count: rows.length }, session);

    return successResult(csv);
  } catch (err: any) {
    console.error("[exportServicesAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor servis.");
  }
}

/* ── 6. Export Inventory (CSV) ── */

export async function exportInventoryAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    const { data: items } = await adminDb
      .from("inventory_items")
      .select("name, sku, item_type, cost_price, selling_price, min_stock, created_at, category:inventory_categories(name)")
      .eq("brand_id", session.brandId)
      .is("deleted_at", null);

    const rows = (items ?? []).map((i: any) => ({
      name: i.name,
      sku: i.sku ?? "",
      item_type: i.item_type,
      category: i.category?.name ?? "",
      cost_price: i.cost_price ?? 0,
      selling_price: i.selling_price ?? 0,
      min_stock: i.min_stock ?? 0,
      created_at: i.created_at,
    }));

    const csv = toCSV(rows, ["name", "sku", "item_type", "category", "cost_price", "selling_price", "min_stock", "created_at"]);

    await writeAuditLog(adminDb, "EXPORT_INVENTORY", session.brandName, "Data inventaris diekspor.", { format: "csv", count: rows.length }, session);

    return successResult(csv);
  } catch (err: any) {
    console.error("[exportInventoryAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor inventaris.");
  }
}

/* ── 7. Export Finance (CSV) ── */

export async function exportFinanceAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertCanExport(brandSlug);
    const adminDb = createServiceRoleSupabaseClient();

    const { data: entries } = await adminDb
      .from("finance_ledger")
      .select("entry_type, direction, amount, category, account_code, reference_type, description, ledger_date, created_at")
      .eq("brand_id", session.brandId)
      .order("ledger_date", { ascending: false });

    const csv = toCSV(entries ?? [], ["entry_type", "direction", "amount", "category", "account_code", "reference_type", "description", "ledger_date", "created_at"]);

    await writeAuditLog(adminDb, "EXPORT_FINANCE", session.brandName, "Data keuangan diekspor.", { format: "csv", count: (entries ?? []).length }, session);

    return successResult(csv);
  } catch (err: any) {
    console.error("[exportFinanceAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor keuangan.");
  }
}

/* ── 8. Full Operational Backup (ZIP, base64) ── */

export async function exportFullBackupAction(brandSlug: string): Promise<ActionResult<string>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const [
      customersRes, servicesRes, paymentsRes,
      invItemsRes, invMovementsRes,
      branchesRes, membershipsRes,
      accountsRes, methodsRes, settingsRes,
    ] = await Promise.all([
      (adminDb as any).from("customers").select("*").eq("brand_id", b).is("deleted_at", null),
      (adminDb as any).from("services").select("*").eq("brand_id", b).is("deleted_at", null),
      (adminDb as any).from("service_payments").select("*").eq("brand_id", b),
      (adminDb as any).from("inventory_items").select("*").eq("brand_id", b).is("deleted_at", null),
      (adminDb as any).from("inventory_movements").select("*").eq("brand_id", b),
      (adminDb as any).from("branches").select("*").eq("brand_id", b).is("deleted_at", null),
      (adminDb as any).from("user_brand_memberships").select("id, role, is_active, profile_id, created_at, updated_at").eq("brand_id", b),
      (adminDb as any).from("payment_accounts").select("*").eq("brand_id", b),
      (adminDb as any).from("payment_methods").select("*").eq("brand_id", b),
      (adminDb as any).from("brand_settings").select("*").eq("brand_id", b).maybeSingle(),
    ]);

    const zip = new JSZip();
    zip.file("customers.json", JSON.stringify(customersRes.data ?? [], null, 2));
    zip.file("services.json", JSON.stringify(servicesRes.data ?? [], null, 2));
    zip.file("service_payments.json", JSON.stringify(paymentsRes.data ?? [], null, 2));
    zip.file("inventory_items.json", JSON.stringify(invItemsRes.data ?? [], null, 2));
    zip.file("inventory_movements.json", JSON.stringify(invMovementsRes.data ?? [], null, 2));
    zip.file("branches.json", JSON.stringify(branchesRes.data ?? [], null, 2));
    zip.file("users.json", JSON.stringify(membershipsRes.data ?? [], null, 2));
    zip.file("payment_accounts.json", JSON.stringify(accountsRes.data ?? [], null, 2));
    zip.file("payment_methods.json", JSON.stringify(methodsRes.data ?? [], null, 2));
    zip.file("brand_settings.json", JSON.stringify(settingsRes.data ?? null, null, 2));
    zip.file("meta.json", JSON.stringify({
      exportedAt: new Date().toISOString(),
      brandId: b,
      brandName: session.brandName,
      brandSlug,
      version: "1.0",
      collections: [
        "customers", "services", "service_payments", "inventory_items",
        "inventory_movements", "branches", "users", "payment_accounts",
        "payment_methods", "brand_settings",
      ],
    }, null, 2));

    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const base64 = buffer.toString("base64");

    const recordCounts = {
      customers: (customersRes.data ?? []).length,
      services: (servicesRes.data ?? []).length,
      servicePayments: (paymentsRes.data ?? []).length,
      inventoryItems: (invItemsRes.data ?? []).length,
      inventoryMovements: (invMovementsRes.data ?? []).length,
      branches: (branchesRes.data ?? []).length,
      users: (membershipsRes.data ?? []).length,
      paymentAccounts: (accountsRes.data ?? []).length,
      paymentMethods: (methodsRes.data ?? []).length,
    };

    await writeAuditLog(adminDb, "EXPORT_FULL_BACKUP", session.brandName, "Backup lengkap brand diekspor (ZIP).", {
      format: "zip", collections: Object.keys(recordCounts), recordCounts,
    }, session);

    return successResult(base64);
  } catch (err: any) {
    console.error("[exportFullBackupAction]", err);
    return errorResult(err.message ?? "Gagal mengekspor backup lengkap.");
  }
}

/* ── 9. Import Backup ── */

export interface BackupPreview {
  files: { name: string; recordCount: number; valid: boolean; error?: string }[];
  totalRecords: number;
}

export async function previewBackupAction(brandSlug: string, zipBase64: string): Promise<ActionResult<BackupPreview>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const buffer = Buffer.from(zipBase64, "base64");
    const zip = await JSZip.loadAsync(buffer);

    const expectedFiles = [
      "customers.json", "services.json", "service_payments.json",
      "inventory_items.json", "inventory_movements.json",
      "branches.json", "users.json", "payment_accounts.json",
      "payment_methods.json", "brand_settings.json", "meta.json",
    ];

    const files: BackupPreview["files"] = [];
    let totalRecords = 0;

    for (const name of expectedFiles) {
      const file = zip.file(name);
      if (!file) {
        files.push({ name, recordCount: 0, valid: false, error: "File tidak ditemukan dalam ZIP." });
        continue;
      }
      try {
        const content = await file.async("string");
        const data = JSON.parse(content);
        const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
        files.push({ name, recordCount: count, valid: true });
        totalRecords += count;
      } catch (e: any) {
        files.push({ name, recordCount: 0, valid: false, error: `Gagal parse JSON: ${e.message}` });
      }
    }

    return successResult({ files, totalRecords });
  } catch (err: any) {
    console.error("[previewBackupAction]", err);
    return errorResult(err.message ?? "Gagal membaca backup.");
  }
}

export async function importBackupAction(
  brandSlug: string,
  zipBase64: string,
  dryRun: boolean
): Promise<ActionResult<{ imported: Record<string, number>; errors: string[] }>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const buffer = Buffer.from(zipBase64, "base64");
    const zip = await JSZip.loadAsync(buffer);

    const errors: string[] = [];
    const imported: Record<string, number> = {};

    async function importJSON<T>(fileName: string, tableName: string, transform?: (item: T) => any): Promise<number> {
      const file = zip.file(fileName);
      if (!file) { errors.push(`${fileName}: file tidak ditemukan.`); return 0; }
      try {
        const content = await file.async("string");
        const data: T[] = JSON.parse(content);
        if (!Array.isArray(data)) {
          errors.push(`${fileName}: format tidak valid (bukan array).`);
          return 0;
        }
        if (data.length === 0) return 0;

        if (dryRun) return data.length;

        const batchSize = 100;
        let inserted = 0;
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize).map((item) => {
            const row = transform ? transform(item) : item;
            return { brand_id: session.brandId, ...row };
          });
          const { error } = await adminDb.from(tableName).upsert(batch as any, { onConflict: "id", ignoreDuplicates: false });
          if (error) {
            errors.push(`${fileName} (batch ${i / batchSize + 1}): ${error.message}`);
          } else {
            inserted += batch.length;
          }
        }
        return inserted;
      } catch (e: any) {
        errors.push(`${fileName}: ${e.message}`);
        return 0;
      }
    }

    imported.branches = await importJSON("branches.json", "branches");
    imported.customers = await importJSON("customers.json", "customers");
    imported.services = await importJSON("services.json", "services");
    imported.servicePayments = await importJSON("service_payments.json", "service_payments");
    imported.inventoryItems = await importJSON("inventory_items.json", "inventory_items");
    imported.inventoryMovements = await importJSON("inventory_movements.json", "inventory_movements");
    imported.users = await importJSON("users.json", "user_brand_memberships");
    imported.paymentAccounts = await importJSON("payment_accounts.json", "payment_accounts");
    imported.paymentMethods = await importJSON("payment_methods.json", "payment_methods");
    imported.brandSettings = await importJSON("brand_settings.json", "brand_settings", (item: any) => {
      const { id, brand_id, ...rest } = item;
      return rest;
    });

    if (!dryRun) {
      await writeAuditLog(adminDb, "IMPORT_BACKUP", session.brandName, "Backup diimpor ke brand.", { imported, errors: errors.length > 0 ? errors : undefined }, session);
    }

    return successResult({ imported, errors });
  } catch (err: any) {
    console.error("[importBackupAction]", err);
    return errorResult(err.message ?? "Gagal mengimpor backup.");
  }
}

/* ── 10. Reset Demo Data ── */

export async function resetDemoDataAction(brandSlug: string): Promise<ActionResult<Record<string, number>>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const deleted: Record<string, number> = {};

    const tables = [
      { table: "service_sparepart_usages", key: "serviceSparepartUsages" },
      { table: "service_payments", key: "servicePayments" },
      { table: "inventory_movements", key: "inventoryMovements" },
      { table: "inventory_item_units", key: "inventoryItemUnits" },
      { table: "branch_inventory_stocks", key: "branchInventoryStocks" },
      { table: "inventory_items", key: "inventoryItems" },
      { table: "service_status_history", key: "serviceStatusHistory" },
      { table: "service_sparepart_usages", key: "serviceSparepartUsagesV2" },
      { table: "service_photos", key: "servicePhotos" },
      { table: "service_notes", key: "serviceNotes" },
      { table: "services", key: "services" },
      { table: "customers", key: "customers" },
    ];

    for (const { table, key } of tables) {
      const { count } = await adminDb.from(table).delete({ count: "exact" as any }).eq("brand_id", b);
      deleted[key] = count ?? 0;
    }

    await writeAuditLog(adminDb, "RESET_DEMO_DATA", session.brandName, "Data demo direset untuk brand.", { deleted }, session);

    revalidatePath("/");
    revalidateTag(`services:${b}`);

    return successResult(deleted);
  } catch (err: any) {
    console.error("[resetDemoDataAction]", err);
    return errorResult(err.message ?? "Gagal mereset data demo.");
  }
}

/* ── 11. Delete All Data ── */

export async function deleteAllDataAction(brandSlug: string): Promise<ActionResult<Record<string, number>>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const deleted: Record<string, number> = {};

    const tables = [
      { table: "inv_sparepart_usage", key: "invSparepartUsage" },
      { table: "inv_stock_movements", key: "invStockMovements" },
      { table: "inv_stock_purchase_items", key: "invStockPurchaseItems" },
      { table: "inv_stock_purchases", key: "invStockPurchases" },
      { table: "inv_units", key: "invUnits" },
      { table: "inv_variant_stocks", key: "invVariantStocks" },
      { table: "inv_variants", key: "invVariants" },
      { table: "inv_products", key: "invProducts" },
      { table: "service_sparepart_usages", key: "serviceSparepartUsages" },
      { table: "service_payments", key: "servicePayments" },
      { table: "payment_account_movements", key: "paymentAccountMovements" },
      { table: "inventory_movements", key: "inventoryMovements" },
      { table: "inventory_item_units", key: "inventoryItemUnits" },
      { table: "branch_inventory_stocks", key: "branchInventoryStocks" },
      { table: "inventory_items", key: "inventoryItems" },
      { table: "pos_transaction_reversals", key: "posTransactionReversals" },
      { table: "pos_transaction_items", key: "posTransactionItems" },
      { table: "pos_transactions", key: "posTransactions" },
      { table: "pos_sale_items", key: "posSaleItems" },
      { table: "pos_sales", key: "posSales" },
      { table: "transaction_reversals", key: "transactionReversals" },
      { table: "service_status_history", key: "serviceStatusHistory" },
      { table: "service_sparepart_usages", key: "serviceSparepartUsages" },
      { table: "service_photos", key: "servicePhotos" },
      { table: "service_notes", key: "serviceNotes" },
      { table: "services", key: "services" },
      { table: "service_status_history", key: "serviceStatusHistory" },
      { table: "finance_ledger", key: "financeLedger" },
      { table: "store_shift_cash_movements", key: "storeShiftCashMovements" },
      { table: "store_shifts", key: "storeShifts" },
      { table: "trade_ins", key: "tradeIns" },
      { table: "notification_logs", key: "notificationLogs" },
      { table: "customers", key: "customers" },
      { table: "purchase_items", key: "purchaseItems" },
      { table: "purchases", key: "purchases" },
    ];

    for (const { table, key } of tables) {
      const { count } = await adminDb.from(table).delete({ count: "exact" as any }).eq("brand_id", b);
      if (count && count > 0) deleted[key] = count;
    }

    await writeAuditLog(adminDb, "DELETE_ALL_DATA", session.brandName, "Seluruh data brand dihapus.", { deleted }, session);

    revalidatePath("/");
    revalidateTag(`services:${b}`);

    return successResult(deleted);
  } catch (err: any) {
    console.error("[deleteAllDataAction]", err);
    return errorResult(err.message ?? "Gagal menghapus semua data.");
  }
}

/* ── 12. Factory Reset ── */

export async function factoryResetAction(brandSlug: string): Promise<ActionResult<Record<string, number>>> {
  try {
    const session = await assertMasterAdmin(brandSlug);
    const adminDb: any = createServiceRoleSupabaseClient();
    const b = session.brandId;

    const deleted: Record<string, number> = {};

    const tables = [
      { table: "inv_sparepart_usage", key: "invSparepartUsage" },
      { table: "inv_stock_movements", key: "invStockMovements" },
      { table: "inv_stock_purchase_items", key: "invStockPurchaseItems" },
      { table: "inv_stock_purchases", key: "invStockPurchases" },
      { table: "inv_units", key: "invUnits" },
      { table: "inv_variant_stocks", key: "invVariantStocks" },
      { table: "inv_variants", key: "invVariants" },
      { table: "inv_products", key: "invProducts" },
      { table: "service_sparepart_usages", key: "serviceSparepartUsages" },
      { table: "service_payments", key: "servicePayments" },
      { table: "payment_account_movements", key: "paymentAccountMovements" },
      { table: "inventory_movements", key: "inventoryMovements" },
      { table: "inventory_item_units", key: "inventoryItemUnits" },
      { table: "branch_inventory_stocks", key: "branchInventoryStocks" },
      { table: "inventory_items", key: "inventoryItems" },
      { table: "pos_transaction_reversals", key: "posTransactionReversals" },
      { table: "pos_transaction_items", key: "posTransactionItems" },
      { table: "pos_transactions", key: "posTransactions" },
      { table: "pos_sale_items", key: "posSaleItems" },
      { table: "pos_sales", key: "posSales" },
      { table: "transaction_reversals", key: "transactionReversals" },
      { table: "service_status_history", key: "serviceStatusHistory" },
      { table: "service_sparepart_usages", key: "serviceSparepartUsages" },
      { table: "service_photos", key: "servicePhotos" },
      { table: "service_notes", key: "serviceNotes" },
      { table: "services", key: "services" },
      { table: "finance_ledger", key: "financeLedger" },
      { table: "store_shift_cash_movements", key: "storeShiftCashMovements" },
      { table: "store_shifts", key: "storeShifts" },
      { table: "trade_ins", key: "tradeIns" },
      { table: "notification_logs", key: "notificationLogs" },
      { table: "customers", key: "customers" },
      { table: "purchase_items", key: "purchaseItems" },
      { table: "purchases", key: "purchases" },
      { table: "branch_payment_methods", key: "branchPaymentMethods" },
      { table: "payment_methods", key: "paymentMethods" },
      { table: "payment_accounts", key: "paymentAccounts" },
      { table: "brand_targets", key: "brandTargets" },
    ];

    for (const { table, key } of tables) {
      const { count } = await adminDb.from(table).delete({ count: "exact" as any }).eq("brand_id", b);
      if (count && count > 0) deleted[key] = count;
    }

    await (adminDb as any).from("brand_settings").update({
      store_name: null,
      tagline: null,
      logo_url: null,
      favicon_url: null,
      accent_color: null,
      business_hours: null,
      metadata: null,
    }).eq("brand_id", b);

    await (adminDb as any).from("brands").update({
      logo_url: null,
      accent_color: null,
      theme_primary_color: null,
      theme_accent_color: null,
      theme_mode: null,
      theme_tokens: null,
    }).eq("id", b);

    await writeAuditLog(adminDb, "FACTORY_RESET", session.brandName, "Brand direset ke pengaturan pabrik.", { deleted }, session);

    revalidatePath("/");
    revalidateTag(`brand:${b}`);
    revalidateTag(`brand_settings:${b}`);
    revalidateTag(`services:${b}`);

    return successResult(deleted);
  } catch (err: any) {
    console.error("[factoryResetAction]", err);
    return errorResult(err.message ?? "Gagal melakukan factory reset.");
  }
}
