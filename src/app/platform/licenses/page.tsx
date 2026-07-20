import React from "react";
import { getAllLicenseOrders, getAllLicenses } from "@/server/repositories/license.repository";
import { WaitingApprovalSection } from "./waiting-approval-section";
import { ActiveLicensesSection } from "./active-licenses-section";
import { ExpiredLicensesSection } from "./expired-licenses-section";

export const dynamic = "force-dynamic";

export default async function LicensesPage() {
  const [orders, licenses] = await Promise.all([
    getAllLicenseOrders(),
    getAllLicenses(),
  ]);

  const waitingOrders = orders.filter((o) => o.status === "waiting_verification");
  const activeOnes = licenses.filter(
    (l) => l.status === "active" || l.status === "trial" || l.status === "suspended",
  );
  const expiredOnes = licenses.filter((l) => l.status === "expired" || l.status === "cancelled");

  return (
    <div className="space-y-10">
      <WaitingApprovalSection orders={waitingOrders} />

      <ActiveLicensesSection licenses={activeOnes} />

      {expiredOnes.length > 0 && (
        <ExpiredLicensesSection licenses={expiredOnes} />
      )}
    </div>
  );
}
