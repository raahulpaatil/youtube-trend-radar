import { SettingsForm } from "@/components/SettingsForm";
import { getSettings } from "@/lib/store";
import { listCategories } from "@/lib/youtube";

// Pre-built and cached. Refreshed on demand when a brief or the settings change (see revalidatePath),
// with an hourly safety refresh. Page views never call YouTube or Gemini.
export const revalidate = 3600;

export default async function SettingsPage() {
  const settings = await getSettings();
  // YouTube's category list is cached for a day; if it is unreachable the form loads it in the browser.
  const categories = await listCategories(settings.region).catch(() => null);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="sub">What Ishaan&rsquo;s weekly brief watches. The next brief uses whatever is saved here.</p>
        </div>
      </div>
      <SettingsForm initial={settings} initialCategories={categories} />
    </>
  );
}
