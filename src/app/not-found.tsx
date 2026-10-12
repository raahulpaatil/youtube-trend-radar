import Link from "next/link";
import { PageHead } from "@/components/PageHead";

export default function NotFound() {
  return (
    <div className="shell">
      <PageHead title={<>Page not <em>found</em></>} />
      <div className="empty">
        <h2>That page does not exist</h2>
        <p>The link may be mistyped. Go back to this week&rsquo;s brief or the earlier weeks.</p>
        <div className="empty-actions">
          <Link href="/" className="btn btn-solid">
            This week&rsquo;s brief
          </Link>
          <Link href="/weeks" className="btn btn-ghost">
            Earlier weeks
          </Link>
        </div>
      </div>
    </div>
  );
}
