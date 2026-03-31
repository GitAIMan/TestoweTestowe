import { redirect } from "next/navigation";

export default async function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/oferty/${id}/edycja`);
}
