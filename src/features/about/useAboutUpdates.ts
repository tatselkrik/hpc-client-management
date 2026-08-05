import { useCallback, useState } from "react";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import { openUrl } from "@tauri-apps/plugin-opener";
import { APP_BUILD_INFO } from "../../appShared";

type UpdateManifest = {
  version?: string;
  latest_version?: string;
  release_url?: string;
  download_url?: string;
  notes_url?: string;
  notes?: string[] | string;
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

    if (currentPart < latestPart) {
      return -1;
    }

    if (currentPart > latestPart) {
      return 1;
    }
  }

  return 0;
};

const readManifestVersion = (manifest: UpdateManifest) =>
  manifest.latest_version ?? manifest.version ?? "";

const readManifestUrl = (manifest: UpdateManifest) =>
  manifest.release_url ?? manifest.download_url ?? manifest.notes_url ?? UPDATE_URL ?? "";

const formatManifestNotes = (notes: UpdateManifest["notes"]) => {
  if (Array.isArray(notes)) {
    return notes.filter(Boolean).slice(0, 3).join(" ");
  }

  return notes ?? "";
};

const openExternalUrl = async (url: string) => {
  try {
    await openUrl(url);
    return;
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

export function useAboutUpdates() {
  const [aboutMessage, setAboutMessage] = useState("");
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingForUpdates(true);

    try {
      if (UPDATE_MANIFEST_URL) {
        setAboutMessage(feedbackMessages.loading("Checking the configured update source"));

        const response = await fetch(UPDATE_MANIFEST_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Update check failed with status ${response.status}.`);
        }

        const manifest = (await response.json()) as UpdateManifest;
        const latestVersion = readManifestVersion(manifest);
        const updateUrl = readManifestUrl(manifest);
        const notes = formatManifestNotes(manifest.notes);

        if (!latestVersion) {
          throw new Error(
            "The update source did not include a version or latest_version value."
          );
        }

        const comparison = compareVersions(APP_BUILD_INFO.version, latestVersion);

        if (comparison < 0) {
          setAboutMessage(
            `Version ${latestVersion} is available. Installed version: ${APP_BUILD_INFO.version}.${
              updateUrl ? " Use the configured release page to install the update." : ""
            }${notes ? ` ${notes}` : ""}`
          );

          if (updateUrl) {
            await openExternalUrl(updateUrl);
          }

          return;
        }

        setAboutMessage(
          `This installation is up to date. Installed version: ${APP_BUILD_INFO.version}. Latest version: ${latestVersion}.`
        );
        return;
      }

      if (UPDATE_URL) {
        await openExternalUrl(UPDATE_URL);
        setAboutMessage(
          `Opened the configured update page. Installed version: ${APP_BUILD_INFO.version}.`
        );
        return;
      }

      setAboutMessage(
        "Update checking is not available yet. Please contact the developer to confirm whether a newer version is available."
      );
    } catch (error) {
      setAboutMessage(getErrorDetail(error, "Unable to check for updates right now."));
    } finally {
      setIsCheckingForUpdates(false);
    }
  }, []);

  return {
    aboutMessage,
    isCheckingForUpdates,
    checkForUpdates,
  };
}
