import type { ReactNode } from "react";

import {
  classifyFeedbackMessage,
  type FeedbackTone,
} from "../lib/feedbackMessages";

type StatusMessageProps = {
  children?: ReactNode;
  className?: string;
  id?: string;
  message?: string | null;
  role?: "status" | "alert";
  tone?: FeedbackTone;
};

export function StatusMessage({
  children,
  className,
  id,
  message,
  role,
  tone,
}: StatusMessageProps) {
  const content = children ?? message;

  if (!content) {
    return null;
  }

  const textContent = typeof content === "string" ? content : "";
  const resolvedTone = tone ?? classifyFeedbackMessage(textContent);
  const resolvedRole = role ?? (resolvedTone === "error" ? "alert" : "status");
  const classNames = [
    "status-message",
    `status-message-${resolvedTone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p id={id} className={classNames} role={resolvedRole} aria-live="polite">
      {content}
    </p>
  );
}
