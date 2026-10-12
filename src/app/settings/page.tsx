import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">What Ishaan&rsquo;s weekly brief watches. The next brief uses whatever is saved here.</p>
        </div>
      </div>
      <SettingsForm initial={settings} />
    </>
  );
}
