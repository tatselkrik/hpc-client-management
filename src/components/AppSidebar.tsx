import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import {
  AboutIcon,
  AnalyticsIcon,
  CalendarIcon,
  CareTeamIcon,
  ClientsIcon,
  CollapseIcon,
  DashboardIcon,
  SettingsIcon,
  SignOutIcon,
} from "./icons";
import type { Profile, Section } from "../appShared";
import {
  CLINIC_NAME,
  getProfileDisplayName,
  getProfileDisplayRole,
  getProfileInitial,
} from "../appShared";

type AppSidebarProps = {
  activeSection: Section;
  isSidebarCollapsed: boolean;
  loading: boolean;
  profile: Profile | null;
  profileAvatarUrl: string;
  userEmail: string;
  setActiveSection: Dispatch<SetStateAction<Section>>;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  handleLogout: () => void | Promise<void>;
};

const workspaceNavigationItems: Array<{
  section: Section;
  label: string;
  icon: ReactNode;
}> = [
  { section: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { section: "clients", label: "Clients", icon: <ClientsIcon /> },
  { section: "calendar", label: "Calendar", icon: <CalendarIcon /> },
  { section: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
  { section: "careTeam", label: "Care Team", icon: <CareTeamIcon /> },
];

const systemNavigationItems: Array<{
  section: Section;
  label: string;
  icon: ReactNode;
}> = [
  { section: "settings", label: "Settings", icon: <SettingsIcon /> },
  { section: "about", label: "About", icon: <AboutIcon className="nav-icon" /> },
];

export function AppSidebar({
  activeSection,
  isSidebarCollapsed,
  loading,
  profile,
  profileAvatarUrl,
  userEmail,
  setActiveSection,
  setIsSidebarCollapsed,
  handleLogout,
}: AppSidebarProps) {
  const [isNarrowLayout, setIsNarrowLayout] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 760
  );
  const isSidebarCompact = isSidebarCollapsed || isNarrowLayout;

  useEffect(() => {
    const handleWindowResize = () => setIsNarrowLayout(window.innerWidth <= 760);

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  return (
    <aside className={`sidebar ${isSidebarCompact ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="brand-block">
          <div className="brand-row">
            <button
              type="button"
              className={`brand-toggle ${isSidebarCompact ? "collapsed" : ""}`}
              onClick={() => {
                if (!isNarrowLayout) setIsSidebarCollapsed((value) => !value);
              }}
              aria-label={
                isNarrowLayout
                  ? "Navigation is compact at this window size"
                  : isSidebarCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
              title={
                isNarrowLayout
                  ? "Navigation is compact at this window size"
                  : isSidebarCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
            >
              <img
                src={isSidebarCompact ? "/clinic-icon.png" : "/clinic-logo.png"}
                alt={CLINIC_NAME}
                className={isSidebarCompact ? "brand-logo-icon" : "brand-logo"}
              />
            </button>

            {!isSidebarCompact && (
              <button
                type="button"
                className="collapse-button"
                onClick={() => setIsSidebarCollapsed(true)}
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <CollapseIcon collapsed={false} />
              </button>
            )}
          </div>

          {!isSidebarCompact && (
            <p className="sidebar-subtitle">We listen with the ears of our hearts</p>
          )}
        </div>

        <nav className="nav-menu" aria-label="Application navigation">
          <div className="nav-group">
            {!isSidebarCompact && <span className="nav-group-label">Workspace</span>}
            {workspaceNavigationItems.map((item) => (
              <button
                key={item.section}
                className={activeSection === item.section ? "nav-button active" : "nav-button"}
                onClick={() => setActiveSection(item.section)}
                title={item.label}
                aria-current={activeSection === item.section ? "page" : undefined}
              >
                <span className="nav-icon-wrap">{item.icon}</span>
                {!isSidebarCompact && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          <div className="nav-group nav-group-system">
            {!isSidebarCompact && <span className="nav-group-label">System</span>}
            {systemNavigationItems.map((item) => (
              <button
                key={item.section}
                className={activeSection === item.section ? "nav-button active" : "nav-button"}
                onClick={() => setActiveSection(item.section)}
                title={item.label}
                aria-current={activeSection === item.section ? "page" : undefined}
              >
                <span className="nav-icon-wrap">{item.icon}</span>
                {!isSidebarCompact && <span>{item.label}</span>}
              </button>
            ))}
          </div>
        </nav>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`profile-card ${activeSection === "profile" ? "active" : ""}`}
          onClick={() => setActiveSection("profile")}
          title="My Profile"
          aria-current={activeSection === "profile" ? "page" : undefined}
        >
          <div className="profile-avatar">
            {profileAvatarUrl ? (
              <img src={profileAvatarUrl} alt="" className="profile-avatar-image" />
            ) : (
              getProfileInitial(profile?.full_name, userEmail)
            )}
          </div>

          {!isSidebarCompact && (
            <div className="profile-card-copy">
              <strong>{getProfileDisplayName(profile?.full_name)}</strong>
              <span>{getProfileDisplayRole(profile?.role)}</span>
            </div>
          )}
        </button>

        <button
          type="button"
          className="nav-button sidebar-signout-button"
          onClick={() => void handleLogout()}
          disabled={loading}
          title="Sign Out"
        >
          <span className="nav-icon-wrap"><SignOutIcon /></span>
          {!isSidebarCompact && <span>{loading ? "Please wait..." : "Sign Out"}</span>}
        </button>
      </div>
    </aside>
  );
}
