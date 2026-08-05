/**
 * Desktop inspection shortcut locking is only a local deterrent.
 * Do not treat this as a security boundary; Supabase RLS, storage policies,
 * and Edge Function authorization are the real enforcement layers.
 */
const INSPECTOR_SHORTCUTS = new Set(["i", "j", "c", "u"]);

function isInspectorShortcut(event: KeyboardEvent) {
  if (event.key === "F12") return true;

  const key = event.key.toLowerCase();
  const usesCtrlOrMeta = event.ctrlKey || event.metaKey;

  if (event.shiftKey && usesCtrlOrMeta && INSPECTOR_SHORTCUTS.has(key)) {
    return true;
  }

  if (event.altKey && event.metaKey && key === "i") {
    return true;
  }

  return false;
}

export function lockAppInspectionShortcuts() {
  window.addEventListener(
    "contextmenu",
    (event) => {
      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (!isInspectorShortcut(event)) return;

      event.preventDefault();
      event.stopPropagation();
    },
    { capture: true },
  );
}