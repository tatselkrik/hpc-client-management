import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { fetchSupabasePages } from "../../lib/supabasePagination";
import type { ProgressNote } from "../../appShared";
import {
  emptyProgressNoteForm,
  normalizeDate,
} from "../../appShared";

type ProgressNoteForm = ReturnType<typeof emptyProgressNoteForm>;

type UseProgressNotesLoaderOptions = {
  setNotesMessage: (message: string) => void;
  setNoteForm: (form: ProgressNoteForm) => void;
};

type RequestGuard = () => boolean;

export function useProgressNotesLoader({
  setNotesMessage,
  setNoteForm,
}: UseProgressNotesLoaderOptions) {
  const [progressNotes, setProgressNotes] = useState<ProgressNote[]>([]);

  const clearProgressNotes = useCallback(() => {
    setProgressNotes([]);
    setNoteForm(emptyProgressNoteForm());
  }, [setNoteForm]);

  const loadProgressNotes = useCallback(
    async (clientId: string, isCurrentRequest: RequestGuard = () => true) => {
      if (!clientId) {
        clearProgressNotes();
        return;
      }

      const { data, error } = await fetchSupabasePages(() =>
        supabase
          .from("progress_notes")
          .select(
            "id, session_label, session_date, note_content, created_at, updated_at"
          )
          .eq("client_id", clientId)
          .order("created_at", { ascending: true })
      );

      if (!isCurrentRequest()) return;

      if (error) {
        setNotesMessage(feedbackMessages.loadFailed("progress notes", error.message));
        return;
      }

      setProgressNotes(
        (data ?? []).map((note) => ({
          id: note.id,
          session_label: note.session_label ?? "",
          session_date: normalizeDate(note.session_date),
          note_content: note.note_content ?? "",
          created_at: note.created_at,
          updated_at: note.updated_at,
        }))
      );
      setNoteForm(emptyProgressNoteForm());
      setNotesMessage("");
    },
    [clearProgressNotes, setNoteForm, setNotesMessage]
  );

  return {
    progressNotes,
    loadProgressNotes,
    clearProgressNotes,
  };
}
