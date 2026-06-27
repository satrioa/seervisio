import { getPortalDataAction } from "@/server/actions/customer-portal.actions";
import { PortalClient } from "./portal-client";

export default async function SecurePortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await getPortalDataAction(token);

  if (!result.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-50 p-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
            <svg className="size-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Tautan Tidak Valid</h1>
          <p className="mt-2 text-sm text-gray-500">
            {result.error || "Tautan tracking tidak ditemukan atau telah kedaluwarsa."}
          </p>
        </div>
      </div>
    );
  }

  return <PortalClient data={result.data} />;
}
