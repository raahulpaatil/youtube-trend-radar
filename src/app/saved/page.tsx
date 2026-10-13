import { PageHead } from "@/components/PageHead";
import { SavedIdeas } from "@/components/SavedIdeas";
import { listIdeas } from "@/lib/store";

// Pre-built and cached. Refreshed on demand whenever an idea is saved, changed or removed.
export const revalidate = 3600;

export default async function SavedIdeasPage() {
  const ideas = await listIdeas();
  return (
    <div className="shell">
      <PageHead
        title={<>Saved <em>ideas</em></>}
        sub="The topics you liked, newest first. Move each one along as it goes from idea to published video."
      />
      <SavedIdeas initial={ideas} />
    </div>
  );
}
