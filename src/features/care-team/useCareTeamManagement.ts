import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { getSupabaseFunctionErrorMessage } from "../../lib/supabaseFunctionErrors";
import type {
  AuditLogFilterRange,
  CareTeamInviteForm,
  CareTeamMemberView,
  ClientListItem,
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

type CareTeamSavingAction = "role" | "remove" | "";

type UseCareTeamManagementOptions = {
  activeSection: Section;
  userEmail: string | null;
  profile: Profile | null;
  canManageCareTeam: boolean;
  clientRows: ClientListItem[];
  auditLogFilter: AuditLogFilterRange;
  loadAuditLogs: (range?: AuditLogFilterRange) => Promise<void>;
};

const emptyCareTeamInviteForm: CareTeamInviteForm = {
  full_name: "",
  email: "",
  role: "Staff",
  hpc_representative_name: "",
  temporary_password: "",
  confirm_temporary_password: "",
};

export function useCareTeamManagement({
  activeSection,
  userEmail,
  profile,
  canManageCareTeam,
  clientRows,
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
      .filter((member) => isRepresentativeAssignedRole(member.role))
      .map((member) => member.hpc_representative_name?.trim() ?? "")
      .filter((value) => value.trim() !== "");

    const clientRepresentativeNames = clientRows
      .map((client) => String(client.hpc_representative ?? "").trim())
      .filter((value) => value !== "" && value !== "Other");

    return mergeHpcRepresentativeOptions(
      careTeamRepresentativeNames,
      clientRepresentativeNames
    );
  }, [careTeamProfiles, clientRows]);

  const careTeamHpcRepresentativeOptions = useMemo(
    () => [...hpcRepresentativeOptions, "Other"],
    [hpcRepresentativeOptions]
  );

  const careTeamMembers = useMemo<CareTeamMemberView[]>(() => {
    const rolePriority = new Map<string, number>([
      ["Admin", 0],
      ["CEO", 1],
      ["Psychologist / Counselor", 2],
      ["Staff", 3],
      ["Intern", 4],
    ]);

    return careTeamProfiles
      .filter((member) => (member.role ?? "").trim() !== "")
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
    if (!userEmail || activeSection !== "careTeam") {
      return;
    }

    void loadCareTeamProfiles();
  }, [activeSection, loadCareTeamProfiles, userEmail]);

  const handleAddCareTeamMember = useCallback(async () => {
    if (!canManageCareTeam) {
      setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can invite care team members."));
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
    const temporaryPassword = careTeamInviteForm.temporary_password;
    const confirmTemporaryPassword = careTeamInviteForm.confirm_temporary_password;

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

    if (temporaryPassword.trim().length < 8) {
      setCareTeamStatus("Temporary password must be at least 8 characters.");
      return;
    }

    if (temporaryPassword !== confirmTemporaryPassword) {
      setCareTeamStatus("Temporary password and confirmation do not match.");
      return;
    }

    setIsInvitingCareTeam(true);
    setCareTeamStatus(feedbackMessages.loading(`Creating member account for ${trimmedEmail}`));

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
            temporary_password: temporaryPassword,
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
        `Account created for ${trimmedEmail}. Privately share the temporary password and ask them to change it in Profile.`
      );
    } finally {
      setIsInvitingCareTeam(false);
    }
  }, [
    auditLogFilter,
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
        setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can update care team roles."));
        return;
      }

      if (member.id === profile?.id) {
        setCareTeamStatus("You cannot change your own role.");
        return;
      }

      const nextDisplayRole = getProfileDisplayRole(nextRole);
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
      canManageCareTeam,
      loadAuditLogs,
      loadCareTeamProfiles,
      profile?.id,
    ]
  );

  const handleRemoveCareTeamMember = useCallback(
    async (member: CareTeamMemberView) => {
      if (!canManageCareTeam) {
        setCareTeamStatus(feedbackMessages.permissionDenied("Only an Admin or CEO account can remove care team members."));
        return;
      }

      if (member.id === profile?.id) {
        setCareTeamStatus("You cannot remove your own account.");
        return;
      }

      if (
        getProfileDisplayRole(profile?.role) === "CEO" &&
        getProfileDisplayRole(member.role) === "Admin"
      ) {
        setCareTeamStatus("CEO accounts cannot remove Admin members.");
        return;
      }

      setCareTeamSavingId(member.id);
      setCareTeamSavingAction("remove");
      setCareTeamStatus(feedbackMessages.loading(`Removing ${member.full_name} from the Care Team`));

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
          setCareTeamStatus(feedbackMessages.deleteFailed("Care Team member", message));
          return;
        }

        if (data?.error) {
          setCareTeamStatus(feedbackMessages.deleteFailed("Care Team member", String(data.error)));
          return;
        }

        const removedName =
          typeof data?.removed_name === "string" && data.removed_name.trim() !== ""
            ? data.removed_name
            : member.full_name;

        setCareTeamProfiles((current) =>
          current.filter((entry) => entry.id !== member.id)
        );

        await loadCareTeamProfiles();
        await loadAuditLogs(auditLogFilter);

        setCareTeamStatus(`${removedName} removed from the Care Team.`);
      } finally {
        setCareTeamSavingId("");
        setCareTeamSavingAction("");
      }
    },
    [
      auditLogFilter,
      canManageCareTeam,
      loadAuditLogs,
      loadCareTeamProfiles,
      profile?.id,
      profile?.role,
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
