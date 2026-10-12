import type { ReactNode } from "react";

/** Heading block for the inner pages: Inter headline with an italic serif accent word. */
export function PageHead({ title, sub, meta }: { title: ReactNode; sub?: ReactNode; meta?: ReactNode }) {
  return (
    <div className="page-head">
      <h1 className="title">{title}</h1>
      {sub && <p className="sub">{sub}</p>}
      {meta && <p className="meta">{meta}</p>}
    </div>
  );
}
