import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { Profile, Section } from "../appShared";
import { AppSidebar } from "./AppSidebar";

type AppShellProps = {
  activeSection: Section;
  isSidebarCollapsed: boolean;
  loading: boolean;
  profile: Profile | null;
  profileAvatarUrl: string;
  userEmail: string;
  mainContent: ReactNode;
  fileRenameModal: ReactNode;
  fileDeleteModal: ReactNode;
  phoneUploadModal: ReactNode;
  setActiveSection: Dispatch<SetStateAction<Section>>;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  handleLogout: () => void | Promise<void>;
};

export function AppShell({
  activeSection,
  isSidebarCollapsed,
  loading,
  profile,
  profileAvatarUrl,
  userEmail,
  mainContent,
  fileRenameModal,
  fileDeleteModal,
  phoneUploadModal,
  setActiveSection,
  setIsSidebarCollapsed,
  handleLogout,
}: AppShellProps) {
  return (
    <main className={`app-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <AppSidebar
        activeSection={activeSection}
        isSidebarCollapsed={isSidebarCollapsed}
        loading={loading}
        profile={profile}
        profileAvatarUrl={profileAvatarUrl}
        userEmail={userEmail}
        setActiveSection={setActiveSection}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        handleLogout={handleLogout}
      />

      <section className="main-area">{mainContent}</section>

      {fileRenameModal}
      {fileDeleteModal}
      {phoneUploadModal}
    </main>
  );
}
