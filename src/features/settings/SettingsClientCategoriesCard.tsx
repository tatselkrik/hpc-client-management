import { SectionHeader } from "../../components/SectionHeader";
import type {
  Dispatch,
  SetStateAction,
} from "react";

import type { ClientCategory } from "../../appShared";

type SettingsClientCategoriesCardProps = {
  canManageCareTeam: boolean;
  clientCategories: ClientCategory[];
  clientCategoryDraft: string;
  setClientCategoryDraft: Dispatch<SetStateAction<string>>;
  clientCategoryStatus: string;
  editingClientCategoryId: string;
  editingClientCategoryName: string;
  setEditingClientCategoryName: Dispatch<SetStateAction<string>>;
  handleAddClientCategory: () => void | Promise<void>;
  handleStartEditClientCategory: (category: ClientCategory) => void;
  handleCancelEditClientCategory: () => void;
  handleUpdateClientCategory: (category: ClientCategory) => void | Promise<void>;
  handleDeleteClientCategory: (category: ClientCategory) => void | Promise<void>;
};

export function SettingsClientCategoriesCard({
  canManageCareTeam,
  clientCategories,
  clientCategoryDraft,
  setClientCategoryDraft,
  clientCategoryStatus,
  editingClientCategoryId,
  editingClientCategoryName,
  setEditingClientCategoryName,
  handleAddClientCategory,
  handleStartEditClientCategory,
  handleCancelEditClientCategory,
  handleUpdateClientCategory,
  handleDeleteClientCategory,
}: SettingsClientCategoriesCardProps) {
  return (
    <section className="settings-module-card settings-client-categories-card">
      <SectionHeader
        className="settings-module-header"
        kicker="Client list"
        title="Client categories"
        titleClassName="settings-module-title"
        actions={
          <span className="settings-module-badge live">
            {clientCategories.length} saved
          </span>
        }
      />

      <p className="settings-module-copy">
        Add, rename, or delete the standard categories shown in the Clients tab.
        Existing client records keep their saved category even if a category is removed here.
      </p>

      {canManageCareTeam ? (
        <div className="settings-category-manager">
          <form
            className="settings-category-add-row"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddClientCategory();
            }}
          >
            <div className="settings-category-add-field">
              <span className="settings-category-label-text">New category</span>

              <div className="settings-category-add-control-row">
                <input
                  className="search-input"
                  type="text"
                  value={clientCategoryDraft}
                  onChange={(event) => setClientCategoryDraft(event.target.value)}
                  placeholder="Example: Clinic"
                  aria-label="New category"
                />

                <button
                  type="submit"
                  className="small-button settings-category-add-button"
                  disabled={clientCategoryDraft.trim() === ""}
                >
                  + Add Category
                </button>
              </div>
            </div>
          </form>

          <div className="settings-category-list">
            {clientCategories.length === 0 ? (
              <div className="empty-state">
                No standard categories are saved yet.
              </div>
            ) : (
              clientCategories.map((category) => {
                const isEditing = editingClientCategoryId === category.id;

                return (
                  <article className="settings-category-item" key={category.id}>
                    {isEditing ? (
                      <>
                        <input
                          className="search-input settings-category-edit-input"
                          value={editingClientCategoryName}
                          onChange={(event) =>
                            setEditingClientCategoryName(event.target.value)
                          }
                          aria-label={`Rename ${category.name}`}
                        />

                        <div className="settings-category-actions">
                          <button
                            type="button"
                            className="small-button"
                            onClick={() => void handleUpdateClientCategory(category)}
                            disabled={editingClientCategoryName.trim() === ""}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="small-button settings-announcement-secondary-button"
                            onClick={handleCancelEditClientCategory}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="settings-category-name">
                          <strong>{category.name}</strong>
                          <span>Available in the Clients category dropdown</span>
                        </div>

                        <div className="settings-category-actions">
                          <button
                            type="button"
                            className="small-button settings-announcement-secondary-button"
                            onClick={() => handleStartEditClientCategory(category)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="small-button settings-confirm-danger"
                            onClick={() => void handleDeleteClientCategory(category)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          Only admin accounts can manage client categories.
        </div>
      )}

      <p className="settings-announcement-status">
        {clientCategoryStatus || "Info: Client category changes apply to dropdowns and filters immediately after saving."}
      </p>
    </section>
  );
}
