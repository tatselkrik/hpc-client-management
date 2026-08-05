import { useCallback } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type { ProgressNote } from "../../appShared";
import { toNullableText } from "../../appShared";

type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseProgressNotesSaveOptions = {
  selectedClientId: string;
  selectedClientName: string | null;
  noteForm: ProgressNote;
  setLoading: (loading: boolean) => void;
  setNotesMessage: (message: string) => void;
  loadProgressNotes: (clientId: string) => Promise<void>;
  writeAuditLog: WriteAuditLog;
};

export function useProgressNotesSave({
  selectedClientId,
  selectedClientName,
  noteForm,
  setLoading,
  setNotesMessage,
  loadProgressNotes,
  writeAuditLog,
}: UseProgressNotesSaveOptions) {
  const handleSaveNote = useCallback(async () => {
    if (!selectedClientId) return;

    if (noteForm.note_content.trim() === "") {
      setNotesMessage(feedbackMessages.required("note content"));
      return;
    }

    setLoading(true);
    setNotesMessage(feedbackMessages.loading(noteForm.id ? "Updating note" : "Saving note"));

    try {
      let savedNoteId = noteForm.id || null;

      if (noteForm.id) {
        const { error } = await supabase
          .from("progress_notes")
          .update({
            session_label: toNullableText(noteForm.session_label),
            session_date: noteForm.session_date || null,
            note_content: noteForm.note_content.trim(),
          })
          .eq("id", noteForm.id);

        if (error) {
          setNotesMessage(feedbackMessages.saveFailed("progress note", error.message));
          return;
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
          .from("progress_notes")
          .insert({
            client_id: selectedClientId,
            session_label: toNullableText(noteForm.session_label),
            session_date: noteForm.session_date || null,
            note_content: noteForm.note_content.trim(),
            created_by: user?.id ?? null,
          })
          .select("id")
          .single();

        if (error) {
          setNotesMessage(feedbackMessages.saveFailed("progress note", error.message));
          return;
        }

        savedNoteId = data.id;
      }

      await loadProgressNotes(selectedClientId);
      await writeAuditLog(
        "Progress Notes",
        noteForm.id ? "Updated" : "Created",
        "progress_note",
        savedNoteId,
        noteForm.session_label.trim() ||
          selectedClientName ||
          "Progress note",
        {
          summary: noteForm.id
            ? "Updated a progress note."
            : "Created a progress note.",
          client_id: selectedClientId,
          client_name: selectedClientName,
          session_date: noteForm.session_date || null,
        }
      );

      setNotesMessage(feedbackMessages.saved("progress note"));
    } catch (error) {
      const message = getErrorDetail(error);
      setNotesMessage(feedbackMessages.saveFailed("progress note", message));
    } finally {
      setLoading(false);
    }
  }, [
    selectedClientId,
    selectedClientName,
    noteForm,
    setLoading,
    setNotesMessage,
    loadProgressNotes,
    writeAuditLog,
  ]);

  return { handleSaveNote };
}
