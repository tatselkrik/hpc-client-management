import { useCallback, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

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
  url: string;
  notes: string;
};

const UPDATE_MANIFEST_URL = import.meta.env.VITE_APP_UPDATE_MANIFEST_URL ?? "";
const UPDATE_URL = import.meta.env.VITE_APP_UPDATE_URL ?? "";

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

export function useAboutUpdates() {
  const [aboutMessage, setAboutMessage] = useState("");
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<AvailableAppUpdate | null>(null);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true);
    setAvailableUpdate(null);
    setAboutMessage(feedbackMessages.loading("Checking the secure release channel"));

    try {
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
        setAvailableUpdate({ version: "Release page", url: UPDATE_URL, notes: "" });
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
        setAvailableUpdate({ version: latestVersion, url: updateUrl, notes });
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
  }, []);

  const openAvailableUpdate = useCallback(async () => {
    if (!availableUpdate?.url) {
      setAboutMessage(
        `Version ${availableUpdate?.version ?? "a newer release"} is available, but no download link has been published yet.`,
      );
      return;
    }

    try {
      await openExternalUrl(availableUpdate.url);
      setAboutMessage(`Opened the download page for version ${availableUpdate.version}.`);
    } catch (error) {
      setAboutMessage(getErrorDetail(error, "Unable to open the update download."));
    }
  }, [availableUpdate]);

  return {
    aboutMessage,
    isCheckingForUpdates,
    availableUpdate,
    checkForUpdates,
    openAvailableUpdate,
  };
}
