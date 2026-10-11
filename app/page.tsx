import { BriefLayout } from "@/components/BriefLayout";
import { latestBriefId } from "@/lib/brief";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <BriefLayout briefId={await latestBriefId()} />;
}
