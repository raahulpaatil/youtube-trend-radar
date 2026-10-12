import { PageHead } from "@/components/PageHead";
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
    <div className="shell">
      <PageHead
        title={<>Choose what to <em>watch</em></>}
        sub="What Ishaan’s weekly brief looks at. The next brief uses whatever is saved here."
      />
      <SettingsForm initial={settings} initialCategories={categories} />
    </div>
  );
}
