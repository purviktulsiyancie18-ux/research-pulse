import { notFound } from "next/navigation";
import { BriefLayout } from "@/components/BriefLayout";
import { q1 } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: PageProps<"/briefs/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const exists = await q1("select 1 from briefs where id = $1", [id]);
  if (!exists) notFound();
  return <BriefLayout briefId={id} showBack />;
}
