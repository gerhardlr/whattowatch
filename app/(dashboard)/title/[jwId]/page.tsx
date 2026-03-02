import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSimilarTitles } from "@/lib/similar";
import { TitleDetailClient } from "@/components/TitleDetailClient";
import type { TitleItem } from "@/types";

export default async function TitleDetailPage({
  params,
}: {
  params: Promise<{ jwId: string }>;
}) {
  const { jwId } = await params;

  const title = await prisma.title.findUnique({ where: { jwId } });
  if (!title) notFound();

  const similar = await getSimilarTitles(jwId);

  const titleItem: TitleItem = {
    ...title,
    ratingsUpdatedAt: title.ratingsUpdatedAt?.toISOString() ?? null,
  };

  return <TitleDetailClient title={titleItem} similar={similar} />;
}
