import { SettingsClient } from "@/components/SettingsClient";
import { getDomains, getSettings } from "@/lib/repo";
import { ARXIV_CATEGORIES } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [domains, settings] = await Promise.all([getDomains(), getSettings()]);
  const categories = [...new Set([...ARXIV_CATEGORIES, ...domains.flatMap((d) => d.categories)])];
  return (
    <div className="mx-auto max-w-[860px]">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-4">
        <SettingsClient domains={domains} settings={settings} categories={categories} defaultRecipient={process.env.DEFAULT_RECIPIENT || null} />
      </div>
    </div>
  );
}
