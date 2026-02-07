import { atom } from "nanostores";

export const $isEditing = atom(false);
export const $editorContent = atom("");
export const $isDirty = atom(false);
export const $submitStatus = atom<"idle" | "submitting" | "success" | "error">("idle");
export const $submitMessage = atom("");
export const $submitRequested = atom(false);

const PREFIX = "playbook:";

export function restoreDraft(filePath: string, fallback: string): string {
  try {
    const saved = sessionStorage.getItem(PREFIX + "draft:" + filePath);
    if (saved !== null && saved !== fallback) {
      $isDirty.set(true);
      return saved;
    }
  } catch {}
  $isDirty.set(false);
  return fallback;
}

export function saveDraft(filePath: string, content: string): void {
  $editorContent.set(content);
  $isDirty.set(true);
  try {
    sessionStorage.setItem(PREFIX + "draft:" + filePath, content);
  } catch {}
}

export function clearDraft(filePath: string): void {
  $isDirty.set(false);
  try {
    sessionStorage.removeItem(PREFIX + "draft:" + filePath);
  } catch {}
}

export function markPendingSubmit(filePath: string): void {
  try {
    sessionStorage.setItem(PREFIX + "pending_submit", filePath);
  } catch {}
}

export function consumePendingSubmit(): string | null {
  try {
    const val = sessionStorage.getItem(PREFIX + "pending_submit");
    sessionStorage.removeItem(PREFIX + "pending_submit");
    return val;
  } catch {}
  return null;
}
