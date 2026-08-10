import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useRef, useState } from "react";
import type { Update } from "@tauri-apps/plugin-updater";

import { APP_BUILD_INFO } from "../../appShared";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { supabase } from "../../lib/supabase";
import { getSupabaseFunctionErrorMessage } from "../../lib/supabaseFunctionErrors";

type UpdateManifest = {
  version?: string;
  latest_version?: string;
  release_url?: string;
  download_url?: string | null;
  notes_url?: string;
  notes?: string[] | string;
  release_notes?: string;
  published_at?: string;
};

export type AvailableAppUpdate = {
  version: string;
  url?: string;
  notes: string;
  installable: boolean;
};

const UPDATE_MANIFEST_URL = import.meta.env.VITE_APP_UPDATE_MANIFEST_URL ?? "";
const UPDATE_URL = import.meta.env.VITE_APP_UPDATE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

const normalizeVersion = (version: string) =>
  version
    .trim()
    .replace(/^v/i, "")
    .split("-")[0]
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isFinite(part) ? part : 0));

const compareVersions = (currentVersion: string, latestVersion: string) => {
  const currentParts = normalizeVersion(currentVersion);
  const latestParts = normalizeVersion(latestVersion);
  const maxLength = Math.max(currentParts.length, latestParts.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const currentPart = currentParts[index] ?? 0;
    const latestPart = latestParts[index] ?? 0;
    if (currentPart < latestPart) return -1;
    if (currentPart > latestPart) return 1;
  }

  return 0;
};

const readManifestVersion = (manifest: UpdateManifest) =>
  manifest.latest_version ?? manifest.version ?? "";

const readManifestUrl = (manifest: UpdateManifest) =>
  manifest.release_url ?? manifest.download_url ?? manifest.notes_url ?? UPDATE_URL ?? "";

const formatManifestNotes = (manifest: UpdateManifest) => {
  if (Array.isArray(manifest.notes)) return manifest.notes.filter(Boolean).slice(0, 3).join(" ");
  return manifest.notes ?? manifest.release_notes ?? "";
};

const openExternalUrl = async (url: string) => {
  if (!/^https:\/\//i.test(url)) throw new Error("The configured update link is not secure.");

  try {
    await openUrl(url);
  } catch {
    if (typeof window !== "undefined") {
      const openedWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (openedWindow) {
        openedWindow.opener = null;
        return;
      }
    }
    throw new Error("Unable to open the update link from this environment.");
  }
};

const readConfiguredManifest = async (): Promise<UpdateManifest | null> => {
  if (!UPDATE_MANIFEST_URL) return null;

  const response = await fetch(UPDATE_MANIFEST_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Update check failed with status ${response.status}.`);
  return (await response.json()) as UpdateManifest;
};

const getUpdaterRequestHeaders = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Please sign in again before checking for updates.");
  if (!SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("This installation is missing its secure update configuration.");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    apikey: SUPABASE_PUBLISHABLE_KEY,
  };
};

export function useAboutUpdates() {
  const [aboutMessage, setAboutMessage] = useState("");
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);
  const pendingUpdateRef = useRef<Update | null>(null);

  const releasePendingUpdate = useCallback(async () => {
    const pendingUpdate = pendingUpdateRef.current;
    pendingUpdateRef.current = null;
    if (pendingUpdate) await pendingUpdate.close().catch(() => undefined);
  }, []);

  const checkNativeUpdater = useCallback(async () => {
    const headers = await getUpdaterRequestHeaders();
    const { check } = await import("@tauri-apps/plugin-updater");
    return check({ headers, timeout: 30_000 });
  }, []);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true);
    setAvailableUpdate(null);
    setAboutMessage(feedbackMessages.loading("Checking the secure release channel"));

    try {
      await releasePendingUpdate();

      if (isTauri()) {
        const update = await checkNativeUpdater();

        if (!update) {
          setAboutMessage(
            `This installation is up to date. Installed ${APP_BUILD_INFO.channel} version: ${APP_BUILD_INFO.version}.`,
          );
          return;
        }

        pendingUpdateRef.current = update;
        const notes = update.body?.trim() ?? "";
        setAvailableUpdate({
          version: update.version,
          notes,
          installable: true,
        });
        setAboutMessage(
          `Version ${update.version} is ready to install on the ${APP_BUILD_INFO.channel} channel. Installed version: ${update.currentVersion}.${
            notes ? ` ${notes}` : ""
          }`,
        );
        return;
      }

      let manifest: UpdateManifest | null = null;
      const { data, error } = await supabase.functions.invoke("check-app-update", {
        body: { channel: APP_BUILD_INFO.channel },
      });

      if (!error && data?.version) {
        manifest = data as UpdateManifest;
      } else if (UPDATE_MANIFEST_URL) {
        manifest = await readConfiguredManifest();
      } else if (error) {
        throw new Error(await getSupabaseFunctionErrorMessage(error));
      }

      if (!manifest && UPDATE_URL) {
        setAvailableUpdate({
          version: "Release page",
          url: UPDATE_URL,
          notes: "",
          installable: false,
        });
        setAboutMessage(
          `A release page is configured for this ${APP_BUILD_INFO.channel} installation.`,
        );
        return;
      }

      if (!manifest) throw new Error("No update source is configured for this installation.");

      const latestVersion = readManifestVersion(manifest);
      const updateUrl = readManifestUrl(manifest);
      const notes = formatManifestNotes(manifest);

      if (!latestVersion) throw new Error("The update source did not include a version.");

      const comparison = compareVersions(APP_BUILD_INFO.version, latestVersion);

      if (comparison < 0) {
        setAvailableUpdate({
          version: latestVersion,
          url: updateUrl,
          notes,
          installable: false,
        });
        setAboutMessage(
          `Version ${latestVersion} is available on the ${APP_BUILD_INFO.channel} channel. Installed version: ${APP_BUILD_INFO.version}.${
            notes ? ` ${notes}` : ""
          }`,
        );
        return;
      }

      setAboutMessage(
        `This installation is up to date. Installed version: ${APP_BUILD_INFO.version}. Latest ${APP_BUILD_INFO.channel} version: ${latestVersion}.`,
      );
    } catch (error) {
      setAboutMessage(getErrorDetail(error, "Unable to check for updates right now."));
    } finally {
      setIsCheckingForUpdates(false);
    }
  }, [checkNativeUpdater, releasePendingUpdate]);

  const installAvailableUpdate = useCallback(async () => {
    if (!availableUpdate) return;

    if (!availableUpdate.installable) {
      if (!availableUpdate.url) {
        setAboutMessage(
          `Version ${availableUpdate.version} is available, but no download link has been published yet.`,
        );
        return;
      }

      try {
        await openExternalUrl(availableUpdate.url);
        setAboutMessage(`Opened the download page for version ${availableUpdate.version}.`);
      } catch (error) {
        setAboutMessage(getErrorDetail(error, "Unable to open the update download."));
      }
      return;
    }

    const confirmed = window.confirm(
      `Install version ${availableUpdate.version} now? The application will close and restart when the signed update is ready.`,
    );
    if (!confirmed) return;

    setIsInstallingUpdate(true);

    try {
      const update = pendingUpdateRef.current ?? (await checkNativeUpdater());
      if (!update) {
        setAvailableUpdate(null);
        setAboutMessage("The update is no longer available. This installation is up to date.");
        return;
      }

      pendingUpdateRef.current = update;
      let downloadedBytes = 0;
      let totalBytes: number | undefined;

      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength;
          setAboutMessage(`Downloading signed version ${update.version}…`);
          return;
        }

        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes && totalBytes > 0) {
            const percent = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
            setAboutMessage(`Downloading signed version ${update.version}: ${percent}%`);
          }
          return;
        }

        setAboutMessage("Download complete. Verifying and installing the update…");
      });

      pendingUpdateRef.current = null;
      setAboutMessage("The signed update is installed. Restarting the application…");
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (error) {
      await releasePendingUpdate();
      setAboutMessage(getErrorDetail(error, "The signed update could not be installed."));
    } finally {
      setIsInstallingUpdate(false);
    }
  }, [availableUpdate, checkNativeUpdater, releasePendingUpdate]);

  return {
    aboutMessage,
    isCheckingForUpdates,
    isInstallingUpdate,
    availableUpdate,
    checkForUpdates,
    installAvailableUpdate,
  };
}
