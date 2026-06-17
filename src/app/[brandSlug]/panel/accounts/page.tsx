import { AccountsPageClient } from "./accounts-page-client";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function AccountsPage({ params }: PageProps) {
  const { brandSlug } = await params;
  return <AccountsPageClient brandSlug={brandSlug} />;
}
