import { useMemo, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { StatusMessage } from "../../components/StatusMessage";
import type { ProgressNote } from "../../appShared";

type ProgressNotesTabProps = {
  notesMessage: string;
  progressNotes: ProgressNote[];
  noteForm: ProgressNote;
  updateNoteForm: (field: keyof ProgressNote, value: string) => void;
  handleEditNote: (note: ProgressNote) => void;
  handleCancelEditNote: () => void;
  handleSaveNote: () => void | Promise<void>;
  loading: boolean;
  selectedClientId: string;
  canEditProgressNotes?: boolean;
};

export function ProgressNotesTab({
  notesMessage,
  progressNotes,
  noteForm,
  updateNoteForm,
  handleEditNote,
  handleCancelEditNote,
  handleSaveNote,
  loading,
  selectedClientId,
  canEditProgressNotes = true,
}: ProgressNotesTabProps) {
  const [noteSortDirection, setNoteSortDirection] = useState<"newest" | "oldest">("newest");
  const sortedProgressNotes = useMemo(
    () =>
      [...progressNotes].sort((left, right) => {
        const leftDate = new Date(left.session_date || left.created_at || "").getTime();
        const rightDate = new Date(right.session_date || right.created_at || "").getTime();
        const safeLeft = Number.isFinite(leftDate) ? leftDate : 0;
        const safeRight = Number.isFinite(rightDate) ? rightDate : 0;
        return noteSortDirection === "newest" ? safeRight - safeLeft : safeLeft - safeRight;
      }),
    [noteSortDirection, progressNotes]
  );

  return (
    <div className="panel">
      <SectionHeader
        className="section-header notes-section-header"
        title="Progress Notes"
        actions={
          <div className="notes-header-controls">
            <select
              className="search-input compact-select notes-sort-select"
              aria-label="Sort progress notes"
              value={noteSortDirection}
              onChange={(event) =>
                setNoteSortDirection(event.target.value === "oldest" ? "oldest" : "newest")
              }
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        }
      />

      {!canEditProgressNotes ? (
        <StatusMessage
          className="dashboard-status-message"
          message="Your role can view progress notes, but cannot add or edit them."
        />
      ) : null}

      {sortedProgressNotes.length > 0 ? (
        <div className="notes-list">
          {sortedProgressNotes.map((note) => (
            <div key={note.id} className="note-card">
              <h4>{note.session_label || "Untitled Session"}</h4>
              <p className="note-date">
                {note.session_date
                  ? new Date(note.session_date).toLocaleDateString()
                  : "No session date"}
              </p>
              <p>{note.note_content}</p>

              {canEditProgressNotes ? (
                <div className="note-actions">
                  <button
                    className="small-button"
                    type="button"
                    onClick={() => handleEditNote(note)}
                  >
                    Edit
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {canEditProgressNotes ? (
        <div className="notes-editor">
          <div className="form-grid">
          <label className="form-label">
            Session Label
            <input
              className="search-input"
              type="text"
              placeholder="Example: Session 1"
              value={noteForm.session_label}
              onChange={(e) => updateNoteForm("session_label", e.target.value)}
            />
          </label>

          <label className="form-label">
            Session Date
            <input
              className="search-input"
              type="date"
              value={noteForm.session_date}
              onChange={(e) => updateNoteForm("session_date", e.target.value)}
            />
          </label>

          <label className="form-label form-label-full">
            Progress Note
            <textarea
              className="search-input textarea-input"
              rows={6}
              value={noteForm.note_content}
              onChange={(e) => updateNoteForm("note_content", e.target.value)}
            />
          </label>
        </div>

        <div className="note-actions notes-editor-actions">
          <StatusMessage
            className="notes-editor-status"
            message={notesMessage}
          />

          <div className="notes-editor-button-group">
            <button
              className="small-button"
              type="button"
              onClick={handleSaveNote}
              disabled={loading || !selectedClientId}
            >
              {loading ? "Saving…" : noteForm.id ? "Update Note" : "+ Add Note"}
            </button>

            {noteForm.id ? (
              <button
                className="small-button secondary-button"
                type="button"
                onClick={handleCancelEditNote}
                disabled={loading}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
          </div>
        </div>
      ) : null}

      {progressNotes.length === 0 ? <p>No progress notes yet.</p> : null}
    </div>
  );
}
