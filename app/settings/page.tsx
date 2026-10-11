import { SettingsClient } from "@/components/SettingsClient";
import { getDomains, getSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [domains, settings] = await Promise.all([getDomains(), getSettings()]);
  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-6">
      <div>
        <h1 className="h1">Settings</h1>
        <p className="text-[15px] text-muted-text">Your topics and how each Monday brief is put together.</p>
      </div>
      <SettingsClient domains={domains} settings={settings} defaultRecipient={process.env.DEFAULT_RECIPIENT || null} />
    </div>
  );
}
