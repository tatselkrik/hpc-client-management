import type { ReactNode } from "react";

type HeadingTag = "h2" | "h3" | "h4";

type SectionHeaderProps = {
  className: string;
  kicker?: ReactNode;
  kickerClassName?: string;
  title?: ReactNode;
  titleAs?: HeadingTag;
  titleClassName?: string;
  description?: ReactNode;
  descriptionClassName?: string;
  contentClassName?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

const countVisibleParts = (...parts: Array<ReactNode | undefined>) =>
  parts.filter((part) => part !== undefined && part !== null && part !== false).length;

export function SectionHeader({
  className,
  kicker,
  kickerClassName = "settings-clinic-kicker",
  title,
  titleAs = "h3",
  titleClassName,
  description,
  descriptionClassName,
  contentClassName,
  actions,
  children,
}: SectionHeaderProps) {
  const Heading = titleAs;
  const textPartCount = countVisibleParts(kicker, title, description, children);
  const shouldGroupText = Boolean(contentClassName) || textPartCount > 1;

  const textContent = (
    <>
      {kicker && <span className={kickerClassName}>{kicker}</span>}
      {title && <Heading className={titleClassName}>{title}</Heading>}
      {description && <p className={descriptionClassName}>{description}</p>}
      {children}
    </>
  );

  return (
    <header className={className}>
      {shouldGroupText ? (
        <hgroup className={contentClassName ? `header-copy ${contentClassName}` : "header-copy"}>
          {textContent}
        </hgroup>
      ) : (
        textContent
      )}
      {actions}
    </header>
  );
}
