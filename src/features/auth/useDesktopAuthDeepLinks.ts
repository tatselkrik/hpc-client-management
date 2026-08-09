import { isTauri } from "@tauri-apps/api/core";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useEffect } from "react";

import { supabase } from "../../lib/supabase";

const AUTH_DEEP_LINK_SCHEME =
  (import.meta.env.VITE_AUTH_DEEP_LINK_SCHEME || "hpc-client-management")
    .trim()
    .replace(/:$/, "");
const AUTH_DEEP_LINK_PROTOCOL = `${AUTH_DEEP_LINK_SCHEME}:`;
const AUTH_DEEP_LINK_HOST = "auth";
const INVITATION_PATH = "/invite";

export function isApprovedInvitationDeepLink(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return (
      url.protocol === AUTH_DEEP_LINK_PROTOCOL &&
      url.hostname === AUTH_DEEP_LINK_HOST &&
      url.pathname === INVITATION_PATH
    );
  } catch {
    return false;
  }
}

export async function acceptDesktopInvitationDeepLink(rawUrl: string) {
  if (!isApprovedInvitationDeepLink(rawUrl)) return false;

  const url = new URL(rawUrl);
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  const authorizationCode = url.searchParams.get("code");

  window.history.replaceState(
    null,
    document.title,
    `${window.location.pathname}${window.location.search}#account-invitation`
  );

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  if (authorizationCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
    return !error;
  }

  return false;
}

export function useDesktopAuthDeepLinks() {
  useEffect(() => {
    if (!isTauri()) return;

    let disposed = false;
    let stopListening: (() => void) | undefined;

    const processUrls = async (urls: string[] | null) => {
      if (!urls || disposed) return;

      for (const url of urls) {
        if (await acceptDesktopInvitationDeepLink(url)) break;
      }
    };

    void getCurrent().then(processUrls);
    void onOpenUrl((urls) => {
      void processUrls(urls);
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        stopListening = unlisten;
      }
    });

    return () => {
      disposed = true;
      stopListening?.();
    };
  }, []);
}
