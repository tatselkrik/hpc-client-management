import { SectionHeader } from "../../components/SectionHeader";
import type { Dispatch, SetStateAction } from "react";
import type { ThemeMode } from "../../appShared";

type SettingsAppearanceCardProps = {
  themeMode: ThemeMode;
  setThemeMode: Dispatch<SetStateAction<ThemeMode>>;
};

type ThemeOption = {
  value: ThemeMode;
  label: string;
  previewClassName: string;
};

const THEME_OPTIONS: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    previewClassName: "",
  },
  {
    value: "dark",
    label: "Dark",
    previewClassName: "settings-preview-card-dark",
  },
  {
    value: "clinic",
    label: "Clinic",
    previewClassName: "settings-preview-card-clinic",
  },
  {
    value: "clinic-dark",
    label: "Clinic Dark",
    previewClassName: "settings-preview-card-clinic-dark",
  },
];

const getThemeLabel = (value: ThemeMode) =>
  THEME_OPTIONS.find((option) => option.value === value)?.label ?? "Light";

export function SettingsAppearanceCard({
  themeMode,
  setThemeMode,
}: SettingsAppearanceCardProps) {
  return (
    <section className="settings-module-card settings-theme-card">
      <SectionHeader
        className="settings-module-header"
        kicker="Theme"
        title="Appearance"
        titleClassName="settings-module-title"
      />

      <div className="theme-toggle-group theme-toggle-grid" role="group" aria-label="Theme mode">
        {THEME_OPTIONS.map((option) => {
          const isActive = themeMode === option.value;

          return (
            <button
              type="button"
              key={option.value}
              className={isActive ? "theme-option active" : "theme-option"}
              onClick={() => setThemeMode(option.value)}
              aria-pressed={isActive}
            >
              <span className="theme-option-label">{option.label}</span>
              <div
                className={[
                  "settings-preview-card",
                  option.previewClassName,
                  isActive ? "active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-hidden="true"
              >
                <div className="settings-preview-window">
                  <span className="settings-preview-bar" />
                  <div className="settings-preview-body">
                    <span className="settings-preview-chip" />
                    <span className="settings-preview-chip short" />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="settings-module-inline-note">
        Active mode: <strong>{getThemeLabel(themeMode)}</strong>
      </p>

      <p className="settings-module-inline-note">
        Theme preference is saved on this device only.
      </p>
    </section>
  );
}
