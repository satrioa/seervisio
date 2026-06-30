import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ brandSlug: string }>;
}

export default async function DocumentationIndexPage({ params }: PageProps) {
  const { brandSlug } = await params;
  redirect(`/${brandSlug}/panel/documentation/README`);
}
