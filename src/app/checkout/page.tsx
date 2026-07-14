import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCheckoutSessionAction } from "@/server/actions/checkout.actions";
import { CheckoutClient } from "./checkout-client";

interface CheckoutPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { token } = await searchParams;
  const result = await getCheckoutSessionAction(token);

  if (!result.success || !result.data) {
    // No (valid) session yet — bounce to pricing to (re)select a package.
    redirect("/pricing");
  }

  return (
    <Suspense fallback={null}>
      <CheckoutClient session={result.data} />
    </Suspense>
  );
}
