import { StatusMessage } from "../../components/StatusMessage";
import { useState, type Dispatch, type SetStateAction } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import type {
  CareTeamInviteForm,
  CareTeamMemberView,
  Profile,
} from "../../appShared";
import {
  CARE_TEAM_ROLE_OPTIONS,
  getProfileDisplayRole,
  isRepresentativeAssignedRole,
} from "../../appShared";

export type CareTeamSectionProps = {
  careTeamMembers: CareTeamMemberView[];
  careTeamStatus: string;
  profile: Profile | null;
  canManageCareTeam: boolean;
  careTeamSavingId: string;
  careTeamSavingAction: "role" | "remove" | "";
  handleUpdateCareTeamRole: (
    member: CareTeamMemberView,
    nextRole: string,
    nextRepresentativeName?: string | null
  ) => Promise<void> | void;
  handleRemoveCareTeamMember: (member: CareTeamMemberView) => Promise<void> | void;
  careTeamInviteForm: CareTeamInviteForm;
  setCareTeamInviteForm: Dispatch<SetStateAction<CareTeamInviteForm>>;
  hpcRepresentativeOptions: string[];
  isInvitingCareTeam: boolean;
  handleAddCareTeamMember: () => Promise<void> | void;
};

function getMemberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "H";
}

type CareTeamRoleAssignmentDraft = {
  role: string;
  hpcRepresentativeName: string;
};

export function CareTeamSection({
  careTeamMembers,
  careTeamStatus,
  profile,
  canManageCareTeam,
  careTeamSavingId,
  careTeamSavingAction,
  handleUpdateCareTeamRole,
  handleRemoveCareTeamMember,
  careTeamInviteForm,
  setCareTeamInviteForm,
  hpcRepresentativeOptions,
  isInvitingCareTeam,
  handleAddCareTeamMember,
}: CareTeamSectionProps) {
  const [memberPendingRemoval, setMemberPendingRemoval] =
    useState<CareTeamMemberView | null>(null);
  const [roleAssignmentDrafts, setRoleAssignmentDrafts] = useState<
    Record<string, CareTeamRoleAssignmentDraft>
  >({});

  const representativeAssignmentOptions = hpcRepresentativeOptions.filter(
    (option) => option.trim() !== "" && option !== "Other"
  );
  const signedInRole = getProfileDisplayRole(profile?.role);

  const clearRoleAssignmentDraft = (memberId: string) => {
    setRoleAssignmentDrafts((current) => {
      if (!current[memberId]) return current;

      const next = { ...current };
      delete next[memberId];
      return next;
    });
  };

  const isRemovalModalBusy =
    memberPendingRemoval !== null &&
    careTeamSavingId === memberPendingRemoval.id &&
    careTeamSavingAction === "remove";

  const [usesCustomRepresentativeName, setUsesCustomRepresentativeName] =
    useState(false);

  const isInviteRepresentativeAssignedRole = isRepresentativeAssignedRole(
    careTeamInviteForm.role
  );

  const representativeSelectValue = usesCustomRepresentativeName
    ? "Other"
    : careTeamInviteForm.hpc_representative_name;

  const closeRemovalModal = () => {
    if (isRemovalModalBusy) return;
    setMemberPendingRemoval(null);
  };

  const confirmRemoveCareTeamMember = async () => {
    if (!memberPendingRemoval || isRemovalModalBusy) return;

    await handleRemoveCareTeamMember(memberPendingRemoval);
    setMemberPendingRemoval(null);
  };

  return (
    <div className="page-content care-team-page">
      <div className="care-team-header">
        <div>
          <h2>Care Team</h2>
          <p className="analytics-subtitle">
            View the care team roster and role assignments in one place.
          </p>
        </div>
      </div>

      <div className="care-team-layout">
        <section className="panel care-team-panel">
          <SectionHeader
            className="section-header care-team-section-header"
            title="Team roster"
            description={
              <>
                {careTeamMembers.length} member{careTeamMembers.length === 1 ? "" : "s"} listed
              </>
            }
            descriptionClassName="care-team-helper-copy"
          >
            <StatusMessage className="care-team-status" message={careTeamStatus} />
          </SectionHeader>

          <div className="care-team-list">
            {careTeamMembers.map((member) => {
              const isSignedInMember = member.id === profile?.id;
              const isAdminMember = getProfileDisplayRole(member.role) === "Admin";
              const canEditMemberRole = canManageCareTeam && !isSignedInMember;
              const canRemoveMember =
                canManageCareTeam &&
                !isSignedInMember &&
                !(signedInRole === "CEO" && isAdminMember);
              const roleAssignmentDraft = roleAssignmentDrafts[member.id];
              const selectedRole = roleAssignmentDraft?.role ?? member.role;
              const selectedRepresentativeName =
                roleAssignmentDraft?.hpcRepresentativeName ??
                member.hpc_representative_name ??
                "";
              const currentRepresentativeName = member.hpc_representative_name ?? "";
              const selectedRoleRequiresRepresentative = isRepresentativeAssignedRole(selectedRole);
              const roleHasPendingChange =
                selectedRole !== member.role ||
                selectedRepresentativeName.trim() !== currentRepresentativeName.trim();
              const showRepresentativeAssignmentEditor =
                canEditMemberRole && selectedRoleRequiresRepresentative;
              const canApplyPendingRoleAssignment =
                canEditMemberRole &&
                roleHasPendingChange &&
                (!selectedRoleRequiresRepresentative ||
                  selectedRepresentativeName.trim() !== "");
              const representativeOptionsForMember =
                selectedRepresentativeName.trim() !== "" &&
                !representativeAssignmentOptions.includes(selectedRepresentativeName)
                  ? [selectedRepresentativeName, ...representativeAssignmentOptions]
                  : representativeAssignmentOptions;

              return (
                <article
                  key={member.id}
                  className={`care-team-card${canRemoveMember ? " care-team-card-removable" : ""}`}
                >
                  <div className="care-team-card-header-row">
                    <div className="care-team-member-identity">
                      <div className="care-team-avatar" aria-hidden="true">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt=""
                            className="care-team-avatar-image"
                          />
                        ) : (
                          <span>{getMemberInitial(member.full_name)}</span>
                        )}
                      </div>

                      <div className="care-team-card-copy">
                        <div className="care-team-card-top">
                          <div>
                            <h4>{member.full_name}</h4>
                            {member.hpc_representative_name ? (
                              <p className="care-team-representative-label">
                                HPC Representative: {member.hpc_representative_name}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    {canRemoveMember && (
                      <button
                        type="button"
                        className="small-button danger-button care-team-remove-button"
                        onClick={() => setMemberPendingRemoval(member)}
                        disabled={careTeamSavingId === member.id}
                        aria-label={`Remove ${member.full_name}`}
                        title={`Remove ${member.full_name}`}
                      >
                        {careTeamSavingId === member.id && careTeamSavingAction === "remove"
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    )}
                  </div>

                  <div className="care-team-card-actions">
                    {canManageCareTeam ? (
                      <div
                        className={`care-team-role-control-stack${
                          showRepresentativeAssignmentEditor
                            ? " care-team-role-control-stack-paired"
                            : ""
                        }`}
                      >
                        {canEditMemberRole ? (
                          <label className="care-team-role-editor">
                            Role
                            <select
                              aria-label={`Change role for ${member.full_name}`}
                              value={selectedRole}
                              onChange={(event) => {
                                const nextRole = event.target.value;

                                if (isRepresentativeAssignedRole(nextRole)) {
                                  setRoleAssignmentDrafts((current) => ({
                                    ...current,
                                    [member.id]: {
                                      role: nextRole,
                                      hpcRepresentativeName:
                                        current[member.id]?.hpcRepresentativeName ??
                                        member.hpc_representative_name ??
                                        "",
                                    },
                                  }));
                                  return;
                                }

                                clearRoleAssignmentDraft(member.id);
                                void handleUpdateCareTeamRole(member, nextRole, null);
                              }}
                              disabled={careTeamSavingId === member.id}
                            >
                              {CARE_TEAM_ROLE_OPTIONS.map((roleOption) => (
                                <option key={roleOption} value={roleOption}>
                                  {roleOption}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : (
                          <div className="care-team-role-display">
                            <strong>{member.role}</strong>
                            <p className="care-team-role-lock-note">
                              You cannot change your own role.
                            </p>
                          </div>
                        )}

                        {showRepresentativeAssignmentEditor && (
                          <label className="care-team-assignment-editor">
                            Assigned HPC Representative
                            <select
                              aria-label={`Assign HPC Representative for ${member.full_name}`}
                              value={selectedRepresentativeName}
                              onChange={(event) => {
                                const nextRepresentativeName = event.target.value;

                                setRoleAssignmentDrafts((current) => ({
                                  ...current,
                                  [member.id]: {
                                    role: selectedRole,
                                    hpcRepresentativeName: nextRepresentativeName,
                                  },
                                }));
                              }}
                              disabled={careTeamSavingId === member.id}
                            >
                              <option value="">Select representative</option>
                              {representativeOptionsForMember.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            {selectedRepresentativeName.trim() === "" && (
                              <small className="field-hint">
                                Choose an HPC Representative before applying this role.
                              </small>
                            )}
                          </label>
                        )}

                        {roleAssignmentDraft && canEditMemberRole && (
                          <div className="care-team-assignment-actions">
                            <button
                              type="button"
                              className="small-button"
                              onClick={() => {
                                void (async () => {
                                  await handleUpdateCareTeamRole(
                                    member,
                                    selectedRole,
                                    selectedRoleRequiresRepresentative
                                      ? selectedRepresentativeName
                                      : null
                                  );
                                  clearRoleAssignmentDraft(member.id);
                                })();
                              }}
                              disabled={
                                careTeamSavingId === member.id ||
                                !canApplyPendingRoleAssignment
                              }
                            >
                              {careTeamSavingId === member.id &&
                              careTeamSavingAction === "role"
                                ? "Applying..."
                                : "Apply role"}
                            </button>
                            <button
                              type="button"
                              className="small-button secondary-button"
                              onClick={() => clearRoleAssignmentDraft(member.id)}
                              disabled={careTeamSavingId === member.id}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="care-team-role-display">
                        <strong>{member.role}</strong>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {canManageCareTeam && (
          <section className="panel care-team-panel care-team-panel-side">
            <SectionHeader
              className="section-header care-team-section-header"
              title="Create member account"
            />

            <div className="care-team-admin-stack">
              <form
                className="care-team-invite-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAddCareTeamMember();
                }}
              >
                <div className="form-grid">
                  <label className="form-label">
                    Member name
                    <input
                      className="search-input"
                      type="text"
                      value={careTeamInviteForm.full_name}
                      onChange={(event) =>
                        setCareTeamInviteForm((current) => ({
                          ...current,
                          full_name: event.target.value,
                        }))
                      }
                      placeholder="Enter staff member name"
                    />
                  </label>

                  <label className="form-label">
                    Member email
                    <input
                      className="search-input"
                      type="email"
                      value={careTeamInviteForm.email}
                      onChange={(event) =>
                        setCareTeamInviteForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="Enter staff member email"
                    />
                  </label>

                  <label className="form-label">
                    Role
                    <select
                      value={careTeamInviteForm.role}
                      onChange={(event) => {
                        const nextRole = event.target.value;

                        setUsesCustomRepresentativeName(false);
                        setCareTeamInviteForm((current) => ({
                          ...current,
                          role: nextRole,
                          hpc_representative_name:
                            isRepresentativeAssignedRole(nextRole)
                              ? current.hpc_representative_name
                              : "",
                        }));
                      }}
                    >
                      {CARE_TEAM_ROLE_OPTIONS.map((roleOption) => (
                        <option key={roleOption} value={roleOption}>
                          {roleOption}
                        </option>
                      ))}
                    </select>
                  </label>

                  {isInviteRepresentativeAssignedRole && (
                    <>
                      <label className="form-label">
                        HPC Representative
                        <select
                          className="search-input"
                          value={representativeSelectValue}
                          onChange={(event) => {
                            const nextValue = event.target.value;

                            if (nextValue === "Other") {
                              setUsesCustomRepresentativeName(true);
                              setCareTeamInviteForm((current) => ({
                                ...current,
                                hpc_representative_name: "",
                              }));
                              return;
                            }

                            setUsesCustomRepresentativeName(false);
                            setCareTeamInviteForm((current) => ({
                              ...current,
                              hpc_representative_name: nextValue,
                            }));
                          }}
                        >
                          <option value="">Select representative</option>
                          {hpcRepresentativeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <small className="field-hint">
                          This name is added to the Client Overview HPC Representative dropdown.
                        </small>
                      </label>

                      {usesCustomRepresentativeName && (
                        <label className="form-label">
                          New HPC Representative
                          <input
                            className="search-input"
                            type="text"
                            value={careTeamInviteForm.hpc_representative_name}
                            onChange={(event) =>
                              setCareTeamInviteForm((current) => ({
                                ...current,
                                hpc_representative_name: event.target.value,
                              }))
                            }
                            placeholder="Type representative name"
                          />
                        </label>
                      )}
                    </>
                  )}

                  <label className="form-label">
                    Temporary password
                    <input
                      className="search-input"
                      type="password"
                      value={careTeamInviteForm.temporary_password}
                      onChange={(event) =>
                        setCareTeamInviteForm((current) => ({
                          ...current,
                          temporary_password: event.target.value,
                        }))
                      }
                      placeholder="Enter temporary password"
                    />
                    <small className="field-hint">
                      Share this privately with the staff member. They should change it in Profile after signing in.
                    </small>
                  </label>

                  <label className="form-label">
                    Confirm temporary password
                    <input
                      className="search-input"
                      type="password"
                      value={careTeamInviteForm.confirm_temporary_password}
                      onChange={(event) =>
                        setCareTeamInviteForm((current) => ({
                          ...current,
                          confirm_temporary_password: event.target.value,
                        }))
                      }
                      placeholder="Re-enter temporary password"
                    />
                  </label>
                </div>

                <div className="overview-actions">
                  <button
                    type="submit"
                    className="small-button"
                    disabled={isInvitingCareTeam}
                  >
                    {isInvitingCareTeam ? "Creating Account..." : "+ Create Member Account"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>

      {memberPendingRemoval && (
        <div className="care-team-confirm-overlay" role="presentation">
          <div
            className="care-team-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="care-team-remove-title"
            aria-describedby="care-team-remove-description"
          >
            <div className="care-team-confirm-copy">
              <span className="care-team-confirm-kicker">Permanent removal</span>
              <h3 id="care-team-remove-title">Remove this Care Team member?</h3>
              <p id="care-team-remove-description">
                Are you sure you want to permanently remove{" "}
                <strong>{memberPendingRemoval.full_name}</strong>? This will delete their
                account access and cannot be undone from the app.
              </p>
              <div className="care-team-confirm-details">
                <span>{memberPendingRemoval.email ?? "No email on file"}</span>
                <span>{memberPendingRemoval.role}</span>
              </div>
            </div>

            <div className="care-team-confirm-actions">
              <button
                type="button"
                className="small-button care-team-confirm-secondary"
                onClick={closeRemovalModal}
                disabled={isRemovalModalBusy}
              >
                No, keep member
              </button>
              <button
                type="button"
                className="small-button care-team-confirm-danger"
                onClick={() => void confirmRemoveCareTeamMember()}
                disabled={isRemovalModalBusy}
              >
                {isRemovalModalBusy ? "Removing..." : "Yes, remove account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
