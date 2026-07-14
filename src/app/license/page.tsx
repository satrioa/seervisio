import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { getLicenseCenterStatusAction, getBankTransferInfoAction } from "@/server/actions/license.actions";
import { LicenseCenterClient } from "./license-center-client";

export default async function LicensePage() {
  const authResult = await getCurrentUser();
  if (!authResult.user) redirect("/login?redirect=/license");

  const status = await getLicenseCenterStatusAction();
  const bank = await getBankTransferInfoAction();

  return (
    <Suspense fallback={null}>
      <LicenseCenterClient
        initialStatus={status.success ? status.data! : null}
        bankInfo={bank.success ? bank.data! : null}
      />
    </Suspense>
  );
}
