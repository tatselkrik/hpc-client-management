import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  AboutIcon,
  AnalyticsIcon,
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

const navigationItems: Array<{
  section: Section;
  label: string;
  icon: ReactNode;
}> = [
  { section: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { section: "clients", label: "Clients", icon: <ClientsIcon /> },
  { section: "analytics", label: "Analytics", icon: <AnalyticsIcon /> },
  { section: "careTeam", label: "Care Team", icon: <CareTeamIcon /> },
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
  return (
    <aside className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="brand-block">
          <div className="brand-row">
            <button
              type="button"
              className={`brand-toggle ${isSidebarCollapsed ? "collapsed" : ""}`}
              onClick={() => setIsSidebarCollapsed((value) => !value)}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <img
                src={isSidebarCollapsed ? "/clinic-icon.png" : "/clinic-logo.png"}
                alt={CLINIC_NAME}
                className={isSidebarCollapsed ? "brand-logo-icon" : "brand-logo"}
              />
            </button>

            {!isSidebarCollapsed && (
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

          {!isSidebarCollapsed && (
            <p className="sidebar-subtitle">We listen with the ears of our hearts</p>
          )}
        </div>

        <nav className="nav-menu">
          {navigationItems.map((item) => (
            <button
              key={item.section}
              className={activeSection === item.section ? "nav-button active" : "nav-button"}
              onClick={() => setActiveSection(item.section)}
              title={item.label}
            >
              {item.icon}
              {!isSidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}

          <button
            className="nav-button"
            onClick={() => void handleLogout()}
            disabled={loading}
            title="Sign Out"
          >
            <SignOutIcon />
            {!isSidebarCollapsed && <span>{loading ? "Please wait..." : "Sign Out"}</span>}
          </button>
        </nav>
      </div>

      <button
        type="button"
        className={`profile-card ${activeSection === "profile" ? "active" : ""}`}
        onClick={() => setActiveSection("profile")}
        title="My Profile"
      >
        <div className="profile-avatar">
          {profileAvatarUrl ? (
            <img src={profileAvatarUrl} alt="" className="profile-avatar-image" />
          ) : (
            getProfileInitial(profile?.full_name, userEmail)
          )}
        </div>

        {!isSidebarCollapsed && (
          <div className="profile-card-copy">
            <strong>{getProfileDisplayName(profile?.full_name)}</strong>
            <span>{getProfileDisplayRole(profile?.role)}</span>
          </div>
        )}
      </button>
    </aside>
  );
}
