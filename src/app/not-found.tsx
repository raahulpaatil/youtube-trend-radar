import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h2>That page does not exist</h2>
      <p>The brief you are looking for may have been mistyped. Go back to this week&rsquo;s brief or the earlier weeks.</p>
      <Link href="/" className="btn btn-primary">
        This week&rsquo;s brief
      </Link>
    </div>
  );
}
