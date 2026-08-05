import { useProgressNoteForm } from "./useProgressNoteForm";
import { useProgressNotesLoader } from "./useProgressNotesLoader";
import { useProgressNotesSave } from "./useProgressNotesSave";
type WriteAuditLog = (
  module: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  targetLabel: string | null,
  details?: Record<string, unknown>
) => Promise<void>;

type UseProgressNotesManagementOptions = {
  selectedClientId: string;
  selectedClientName: string | null;
  setLoading: (loading: boolean) => void;
  writeAuditLog: WriteAuditLog;
};

export function useProgressNotesManagement({
  selectedClientId,
  selectedClientName,
  setLoading,
  writeAuditLog,
}: UseProgressNotesManagementOptions) {
  const {
    noteForm,
    notesMessage,
    setNotesMessage,
    setNoteForm,
    updateNoteForm,
    handleEditNote,
    handleCancelEditNote,
  } = useProgressNoteForm();

  const {
    progressNotes,
    loadProgressNotes,
    clearProgressNotes,
  } = useProgressNotesLoader({
    setNotesMessage,
    setNoteForm,
  });

  const { handleSaveNote } = useProgressNotesSave({
    selectedClientId,
    selectedClientName,
    noteForm,
    setLoading,
    setNotesMessage,
    loadProgressNotes,
    writeAuditLog,
  });

  return {
    noteForm,
    notesMessage,
    setNotesMessage,
    updateNoteForm,
    handleEditNote,
    handleCancelEditNote,
    progressNotes,
    loadProgressNotes,
    clearProgressNotes,
    handleSaveNote,
  };
}
