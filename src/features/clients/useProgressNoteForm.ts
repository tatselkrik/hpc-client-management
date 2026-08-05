import { useState } from "react";

import type { ProgressNote } from "../../appShared";
import { emptyProgressNoteForm } from "../../appShared";

export function useProgressNoteForm() {
  const [noteForm, setNoteForm] = useState<ProgressNote>(emptyProgressNoteForm());
  const [notesMessage, setNotesMessage] = useState("");

  const updateNoteForm = (field: keyof ProgressNote, value: string) => {
    setNoteForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditNote = (note: ProgressNote) => {
    setNoteForm({
      id: note.id,
      session_label: note.session_label,
      session_date: note.session_date,
      note_content: note.note_content,
      created_at: note.created_at,
      updated_at: note.updated_at,
    });
    setNotesMessage("Editing note.");
  };

  const handleCancelEditNote = () => {
    setNoteForm(emptyProgressNoteForm());
    setNotesMessage("");
  };

  return {
    noteForm,
    notesMessage,
    setNotesMessage,
    setNoteForm,
    updateNoteForm,
    handleEditNote,
    handleCancelEditNote,
  };
}
