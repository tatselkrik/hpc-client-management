import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
};

export function WorkspaceHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: WorkspaceHeaderProps) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-copy">
        <span className="workspace-header-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      {actions || meta ? (
        <div className="workspace-header-aside">
          {meta ? <div className="workspace-header-meta">{meta}</div> : null}
          {actions ? <div className="workspace-header-actions">{actions}</div> : null}
        </div>
      ) : null}
    </header>
  );
}
