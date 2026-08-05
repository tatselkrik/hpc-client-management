import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

import { supabase } from "../../lib/supabase";
import type { Profile } from "../../appShared";
import {
  PROFILE_PICTURES_BUCKET,
  PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS,
} from "../../appShared";

type UseAuthenticatedProfileBootstrapOptions = {
  setStatus: Dispatch<SetStateAction<string>>;
  setProfileNameInput: Dispatch<SetStateAction<string>>;
  setProfileEmailInput: Dispatch<SetStateAction<string>>;
};

export function useAuthenticatedProfileBootstrap({
  setStatus,
  setProfileNameInput,
  setProfileEmailInput,
}: UseAuthenticatedProfileBootstrapOptions) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");

  const clearAuthenticatedProfile = useCallback(() => {
    setUserEmail(null);
    setProfile(null);
    setProfileAvatarUrl("");
  }, []);

  const loadProfile = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setStatus(userError?.message ?? "No signed-in user found.");
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, avatar_path, hpc_representative_name, is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setStatus(`Profile load failed: ${error.message}`);
      setProfile(null);
      return false;
    }

    if (!data) {
      setStatus("Your account profile was not found. Please contact an administrator.");
      setProfile(null);
      setUserEmail(null);
      await supabase.auth.signOut();
      return false;
    }

    if (data.is_active === false) {
      setStatus("Your account has been deactivated. Please contact an administrator.");
      setProfile(null);
      setUserEmail(null);
      await supabase.auth.signOut();
      return false;
    }

    let nextAvatarUrl = "";

    if (data.avatar_path?.trim()) {
      const signedAvatar = await supabase.storage
        .from(PROFILE_PICTURES_BUCKET)
        .createSignedUrl(data.avatar_path, PROFILE_PICTURE_SIGNED_URL_TTL_SECONDS);

      if (!signedAvatar.error) {
        nextAvatarUrl = signedAvatar.data?.signedUrl ?? "";
      }
    }

    setProfile(data);
    setUserEmail(user.email ?? null);
    setProfileNameInput(data.full_name ?? "");
    setProfileEmailInput(user.email ?? "");
    setProfileAvatarUrl(nextAvatarUrl);
    setStatus("Profile loaded successfully.");
    return true;
  }, [setProfileEmailInput, setProfileNameInput, setStatus]);

  return {
    userEmail,
    setUserEmail,
    profile,
    profileAvatarUrl,
    loadProfile,
    clearAuthenticatedProfile,
  };
}
