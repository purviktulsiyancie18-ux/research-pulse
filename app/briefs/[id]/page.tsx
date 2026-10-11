import { notFound } from "next/navigation";
import { BriefView } from "@/components/BriefView";
import { getBriefView } from "@/lib/brief";

export const dynamic = "force-dynamic";

export default async function BriefPage({ params }: PageProps<"/briefs/[id]">) {
  const { id } = await params;
  const view = await getBriefView(id);
  if (!view) notFound();
  return <BriefView view={view} />;
}
