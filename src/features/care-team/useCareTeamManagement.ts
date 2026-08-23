import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { getSupabaseFunctionErrorMessage } from "../../lib/supabaseFunctionErrors";
import type {
  AuditLogFilterRange,
  CareTeamInviteForm,
  CareTeamMemberView,
  Profile,
  Section,
} from "../../appShared";
import {
  PROFILE_PICTURES_BUCKET,
  PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS,
  getCareTeamMemberDisplayName,
  getProfileDisplayRole,
  isLikelyEmailAddress,
  isRepresentativeAssignedRole,
  mergeHpcRepresentativeOptions,
  normalizeCareTeamMemberEmail,
  normalizeHpcRepresentativeName,
} from "../../appShared";

type CareTeamSavingAction = "role" | "deactivate" | "";

type UseCareTeamManagementOptions = {
  activeSection: Section;
  userEmail: string | null;
  profile: Profile | null;
  canManageCareTeam: boolean;
  canManageAdminAccounts: boolean;
  auditLogFilter: AuditLogFilterRange;
  loadAuditLogs: (range?: AuditLogFilterRange) => Promise<void>;
};

const emptyCareTeamInviteForm: CareTeamInviteForm = {
  full_name: "",
  email: "",
  role: "Staff",
  hpc_representative_name: "",
};

export function useCareTeamManagement({
  activeSection,
  userEmail,
  profile,
  canManageCareTeam,
  canManageAdminAccounts,
  auditLogFilter,
  loadAuditLogs,
}: UseCareTeamManagementOptions) {
  const [careTeamProfiles, setCareTeamProfiles] = useState<Profile[]>([]);
  const [careTeamInviteForm, setCareTeamInviteForm] =
    useState<CareTeamInviteForm>(emptyCareTeamInviteForm);
  const [careTeamStatus, setCareTeamStatus] = useState("");
  const [careTeamSavingId, setCareTeamSavingId] = useState("");
  const [careTeamSavingAction, setCareTeamSavingAction] =
    useState<CareTeamSavingAction>("");
  const [isInvitingCareTeam, setIsInvitingCareTeam] = useState(false);

  const hpcRepresentativeOptions = useMemo(() => {
    const careTeamRepresentativeNames = careTeamProfiles
      .filter(
        (member) =>
          member.is_active !== false && isRepresentativeAssignedRole(member.role)
      )
      .map((member) => member.hpc_representative_name?.trim() ?? "")
      .filter((value) => value.trim() !== "");

    return mergeHpcRepresentativeOptions(careTeamRepresentativeNames);
  }, [careTeamProfiles]);

  const careTeamHpcRepresentativeOptions = useMemo(
    () => [...hpcRepresentativeOptions, "Other"],
    [hpcRepresentativeOptions]
  );

  const careTeamMembers = useMemo<CareTeamMemberView[]>(() => {
    const rolePriority = new Map<string, number>([
      ["Admin", 0],
      ["Psychologist / Counselor", 1],
      ["Staff", 2],
    ]);

    return careTeamProfiles
      .filter(
        (member) =>
          member.is_active !== false &&
          ["Admin", "Psychologist / Counselor", "Staff"].includes(
            getProfileDisplayRole(member.role)
          )
      )
      .map((member) => {
        const normalizedEmail = normalizeCareTeamMemberEmail(member.email);

        return {
          id: member.id,
          full_name: getCareTeamMemberDisplayName(member.full_name, normalizedEmail),
          email: normalizedEmail || null,
          role: getProfileDisplayRole(member.role),
          hpc_representative_name: member.hpc_representative_name?.trim() || null,
          avatar_url: member.avatar_url ?? null,
        };
      })
      .sort((left, right) => {
        const roleRank =
          (rolePriority.get(left.role) ?? Number.MAX_SAFE_INTEGER) -
          (rolePriority.get(right.role) ?? Number.MAX_SAFE_INTEGER);

        return (
          roleRank ||
          left.full_name.localeCompare(right.full_name) ||
          (left.email ?? "").localeCompare(right.email ?? "")
        );
      });
  }, [careTeamProfiles]);

  const loadCareTeamProfiles = useCallback(async () => {
    const attachCareTeamAvatarUrls = async (members: Profile[]) => {
      return Promise.all(
        members.map(async (member) => {
          if (!member.avatar_path?.trim()) {
            return {
              ...member,
              avatar_url: null,
            };
          }

          const signedAvatar = await supabase.storage
            .from(PROFILE_PICTURES_BUCKET)
            .createSignedUrl(
              member.avatar_path,
              PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS
            );

          return {
            ...member,
            avatar_url: signedAvatar.error ? null : signedAvatar.data?.signedUrl ?? null,
          };
        })
      );
    };

    const { data: profileRowsWithEmail, error: profileRowsWithEmailError } =
      await supabase
        .from("profiles")
        .select("id, full_name, role, email, avatar_path, hpc_representative_name, is_active");

    if (profileRowsWithEmailError) {
      const { data: profileRows, error: profileRowsError } = await supabase
        .from("profiles")
        .select("id, full_name, role, avatar_path, hpc_representative_name, is_active");

      if (profileRowsError) {
        setCareTeamStatus(feedbackMessages.loadFailed("Care Team", profileRowsError.message));
        return;
      }

      const membersWithAvatars = await attachCareTeamAvatarUrls(
        (profileRows ?? []).map((member) => ({
          ...member,
          email: null,
        }))
      );

      setCareTeamProfiles(membersWithAvatars);
      setCareTeamStatus("");
      return;
    }

    const membersWithAvatars = await attachCareTeamAvatarUrls(
      profileRowsWithEmail ?? []
    );

    setCareTeamProfiles(membersWithAvatars);
    setCareTeamStatus("");
  }, []);

  useEffect(() => {
    if (
      !userEmail ||
      (activeSection !== "careTeam" &&
        activeSection !== "clients" &&
        activeSection !== "calendar")
    ) {
      return;
    }

    void loadCareTeamProfiles();
  }, [activeSection, loadCareTeamProfiles, userEmail]);

  const handleAddCareTeamMember = useCallback(async () => {
    if (!canManageCareTeam) {
      setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or Staff account can invite care team members."));
      return;
    }

    const trimmedName = careTeamInviteForm.full_name.trim();
    const trimmedEmail = careTeamInviteForm.email.trim().toLowerCase();
    const selectedRole = getProfileDisplayRole(careTeamInviteForm.role);
    const roleRequiresRepresentative = isRepresentativeAssignedRole(selectedRole);
    const trimmedRepresentativeName =
      roleRequiresRepresentative
        ? normalizeHpcRepresentativeName(careTeamInviteForm.hpc_representative_name)
        : "";

    if (selectedRole === "Admin" && !canManageAdminAccounts) {
      setCareTeamStatus("Staff accounts cannot create or promote Admin accounts.");
      return;
    }

    if (trimmedName === "") {
      setCareTeamStatus(feedbackMessages.required("member name"));
      return;
    }

    if (!isLikelyEmailAddress(trimmedEmail)) {
      setCareTeamStatus("A valid email address is required.");
      return;
    }

    if (
      roleRequiresRepresentative &&
      trimmedRepresentativeName === ""
    ) {
      setCareTeamStatus("Select or enter the HPC Representative name.");
      return;
    }

    setIsInvitingCareTeam(true);
    setCareTeamStatus(feedbackMessages.loading(`Sending an invitation to ${trimmedEmail}`));

    try {
      const { data, error } = await supabase.functions.invoke(
        "invite-care-team-member",
        {
          body: {
            full_name: trimmedName,
            email: trimmedEmail,
            role: selectedRole,
            hpc_representative_name:
              roleRequiresRepresentative ? trimmedRepresentativeName : null,
          },
        }
      );

      if (error) {
        const message = await getSupabaseFunctionErrorMessage(error);
        setCareTeamStatus(feedbackMessages.createFailed("member account", message));
        return;
      }

      if (data?.error) {
        setCareTeamStatus(feedbackMessages.createFailed("member account", String(data.error)));
        return;
      }

      await loadCareTeamProfiles();
      await loadAuditLogs(auditLogFilter);

      setCareTeamInviteForm(emptyCareTeamInviteForm);

      setCareTeamStatus(
        `Invitation sent to ${trimmedEmail}. They must set their own password and enroll in MFA before using the workspace.`
      );
    } finally {
      setIsInvitingCareTeam(false);
    }
  }, [
    auditLogFilter,
    canManageAdminAccounts,
    canManageCareTeam,
    careTeamInviteForm,
    loadAuditLogs,
    loadCareTeamProfiles,
  ]);

  const handleUpdateCareTeamRole = useCallback(
    async (
      member: CareTeamMemberView,
      nextRole: string,
      nextRepresentativeName?: string | null
    ) => {
      if (!canManageCareTeam) {
        setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or Staff account can update care team roles."));
        return;
      }

      if (member.id === profile?.id) {
        setCareTeamStatus("You cannot change your own role.");
        return;
      }

      const nextDisplayRole = getProfileDisplayRole(nextRole);

      if (
        !canManageAdminAccounts &&
        (getProfileDisplayRole(member.role) === "Admin" || nextDisplayRole === "Admin")
      ) {
        setCareTeamStatus("Staff accounts cannot create, edit, or affect Admin accounts.");
        return;
      }
      const currentRepresentativeName = normalizeHpcRepresentativeName(
        member.hpc_representative_name ?? ""
      );
      const nextNormalizedRepresentativeName =
        isRepresentativeAssignedRole(nextDisplayRole)
          ? normalizeHpcRepresentativeName(
              nextRepresentativeName ?? currentRepresentativeName
            )
          : "";
      const roleChanged = nextDisplayRole !== member.role;
      const representativeChanged =
        currentRepresentativeName !== nextNormalizedRepresentativeName;

      if (!roleChanged && !representativeChanged) {
        setCareTeamStatus(
          `${member.full_name} is already assigned as ${nextDisplayRole}${
            nextNormalizedRepresentativeName
              ? ` for ${nextNormalizedRepresentativeName}`
              : ""
          }.`
        );
        return;
      }

      setCareTeamSavingId(member.id);
      setCareTeamSavingAction("role");
      setCareTeamStatus(
        roleChanged
          ? `Changing ${member.full_name} from ${member.role} to ${nextDisplayRole}...`
          : `Updating ${member.full_name}'s HPC Representative assignment...`
      );

      try {
        const { data, error } = await supabase.functions.invoke(
          "update-care-team-member-role",
          {
            body: {
              target_profile_id: member.id,
              role: nextDisplayRole,
              hpc_representative_name:
                isRepresentativeAssignedRole(nextDisplayRole)
                  ? nextNormalizedRepresentativeName || null
                  : null,
            },
          }
        );

        if (error) {
          const message = await getSupabaseFunctionErrorMessage(error);
          setCareTeamStatus(feedbackMessages.updateFailed("Care Team role", message));
          return;
        }

        if (data?.error) {
          setCareTeamStatus(feedbackMessages.updateFailed("Care Team role", String(data.error)));
          return;
        }

        await loadCareTeamProfiles();
        await loadAuditLogs(auditLogFilter);

        setCareTeamStatus(
          isRepresentativeAssignedRole(nextDisplayRole)
            ? `${member.full_name} is now assigned to ${
                nextNormalizedRepresentativeName || "no HPC Representative"
              } as ${nextDisplayRole}.`
            : `${member.full_name}'s role was updated to ${nextDisplayRole}.`
        );
      } finally {
        setCareTeamSavingId("");
        setCareTeamSavingAction("");
      }
    },
    [
      auditLogFilter,
      canManageAdminAccounts,
      canManageCareTeam,
      loadAuditLogs,
      loadCareTeamProfiles,
      profile?.id,
    ]
  );

  const handleRemoveCareTeamMember = useCallback(
    async (member: CareTeamMemberView) => {
      if (!canManageCareTeam) {
        setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or Staff account can deactivate care team members."));
        return;
      }

      if (member.id === profile?.id) {
        setCareTeamStatus("You cannot deactivate your own account.");
        return;
      }

      if (!canManageAdminAccounts && getProfileDisplayRole(member.role) === "Admin") {
        setCareTeamStatus("Staff accounts cannot deactivate or affect Admin accounts.");
        return;
      }

      setCareTeamSavingId(member.id);
      setCareTeamSavingAction("deactivate");
      setCareTeamStatus(feedbackMessages.loading(`Deactivating ${member.full_name}`));

      try {
        const { data, error } = await supabase.functions.invoke(
          "remove-care-team-member",
          {
            body: {
              target_profile_id: member.id,
            },
          }
        );

        if (error) {
          const message = await getSupabaseFunctionErrorMessage(error);
          setCareTeamStatus(feedbackMessages.updateFailed("Care Team member", message));
          return;
        }

        if (data?.error) {
          setCareTeamStatus(feedbackMessages.updateFailed("Care Team member", String(data.error)));
          return;
        }

        const deactivatedName =
          typeof data?.deactivated_name === "string" && data.deactivated_name.trim() !== ""
            ? data.deactivated_name
            : member.full_name;

        setCareTeamProfiles((current) =>
          current.filter((entry) => entry.id !== member.id)
        );

        await loadCareTeamProfiles();
        await loadAuditLogs(auditLogFilter);

        setCareTeamStatus(`${deactivatedName}'s account has been deactivated.`);
      } finally {
        setCareTeamSavingId("");
        setCareTeamSavingAction("");
      }
    },
    [
      auditLogFilter,
      canManageAdminAccounts,
      canManageCareTeam,
      loadAuditLogs,
      loadCareTeamProfiles,
      profile?.id,
    ]
  );

  return {
    careTeamMembers,
    careTeamStatus,
    careTeamSavingId,
    careTeamSavingAction,
    careTeamInviteForm,
    setCareTeamInviteForm,
    hpcRepresentativeOptions,
    careTeamHpcRepresentativeOptions,
    isInvitingCareTeam,
    loadCareTeamProfiles,
    handleAddCareTeamMember,
    handleUpdateCareTeamRole,
    handleRemoveCareTeamMember,
  };
}

export type CareTeamManagementController = ReturnType<typeof useCareTeamManagement>;
