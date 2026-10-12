/** Shown while a past brief is rendered for the first time (later visits are cached). */
export default function Loading() {
  return (
    <div className="shell" aria-busy="true">
      <p className="sub" role="status">
        Loading this brief…
      </p>
    </div>
  );
}
