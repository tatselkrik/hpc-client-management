import { subscribeClinicalSession } from "./clinicalSession";
// This passphrase is used only in memory; never send it to the backend or save it.
export function requestBackupPassphrase(mode: "encrypt" | "decrypt"): Promise<string | null> {
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("aria-label", mode === "encrypt" ? "Protect backup" : "Unlock backup");
    dialog.className = "backup-passphrase-dialog";
    const form = document.createElement("form");
    const title = document.createElement("h2"); title.textContent = mode === "encrypt" ? "Protect this backup" : "Unlock this backup";
    const help = document.createElement("p"); help.textContent = mode === "encrypt" ? "Use at least 12 characters. Keep this passphrase separately in a safe place. It is required to restore this backup and cannot be recovered." : "Enter the passphrase used when this backup was created.";
    const firstLabel = document.createElement("label"); firstLabel.textContent = "Backup passphrase ";
    const first = document.createElement("input"); first.type = "password"; first.required = true; first.autocomplete = mode === "encrypt" ? "new-password" : "current-password";
    firstLabel.append(first);
    const secondLabel = document.createElement("label"); secondLabel.textContent = "Confirm passphrase ";
    const second = document.createElement("input"); second.type = "password"; second.autocomplete = "new-password"; second.required = mode === "encrypt";
    secondLabel.append(second);
    const error = document.createElement("p"); error.setAttribute("role", "alert");
    const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "Cancel";
    const submit = document.createElement("button"); submit.type = "submit"; submit.textContent = mode === "encrypt" ? "Encrypt backup" : "Unlock backup";
    form.append(title, help, firstLabel); if (mode === "encrypt") form.append(secondLabel);
    form.append(error, cancel, submit); dialog.append(form); document.body.append(dialog);
    let settled = false;
    const finish = (value: string | null) => { if (settled) return; settled = true; unsubscribe(); first.value = ""; second.value = ""; dialog.close(); dialog.remove(); resolve(value); };
    const unsubscribe = subscribeClinicalSession(() => finish(null));
    cancel.onclick = () => finish(null);
    dialog.oncancel = (event) => { event.preventDefault(); finish(null); };
    form.onsubmit = (event) => {
      event.preventDefault();
      if (mode === "encrypt" && (first.value.length < 12 || first.value !== second.value)) { error.textContent = "Use at least 12 characters and enter the same passphrase twice."; return; }
      finish(first.value);
    };
    dialog.showModal(); first.focus();
  });
}
