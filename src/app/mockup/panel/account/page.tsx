import AccountSettingsClient from "./account-settings-client";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  return <AccountSettingsClient brandSlug={brandSlug} />;
}
