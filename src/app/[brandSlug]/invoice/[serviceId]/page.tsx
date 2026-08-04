import { headers } from "next/headers";
import { getInvoiceDataAction } from "@/server/actions/invoice-data.actions";
import { ThermalReceipt } from "@/components/services/thermal-receipt";

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ brandSlug: string; serviceId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const { brandSlug, serviceId } = await params;
  const { print } = await searchParams;

  const result = await getInvoiceDataAction(brandSlug, serviceId);

  if (!result.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-8">
        <div className="rounded-xl border bg-white px-8 py-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">Invoice tidak ditemukan</p>
          <p className="mt-1 text-sm text-gray-500">{result.error}</p>
        </div>
      </div>
    );
  }

  const headersList = await headers();
  const host = headersList.get("host") || `${brandSlug}.seervisio.com`;
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  return (
    <ThermalReceipt
      data={result.data}
      baseUrl={baseUrl}
      autoPrint={print === "true"}
    />
  );
}
