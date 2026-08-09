import type { Dispatch, SetStateAction } from "react";
import { AppShell } from "../../components/AppShell";
import type {
  MobileUploadSession,
  PhoneUploadTarget,
  Profile,
  Section,
} from "../../appShared";
import {
  FileDeleteModal,
  FileRenameModal,
  PhoneUploadModal,
  type FileDeleteTarget,
  type FileRenameTarget,
} from "../clients/FileActionModals";
import {
  AppMainSectionRenderer,
  type AppMainSectionRendererProps,
} from "./AppMainSectionRenderer";

export type AppAuthenticatedLayoutProps = AppMainSectionRendererProps & {
  isSidebarCollapsed: boolean;
  loading: boolean;
  profile: Profile | null;
  profileAvatarUrl: string;
  userEmail: string;
  selectedClientName: string | null;
  fileRenameTarget: FileRenameTarget | null;
  fileRenameInput: string;
  fileDeleteTarget: FileDeleteTarget | null;
  isPhoneUploadModalOpen: boolean;
  phoneUploadTarget: PhoneUploadTarget | null;
  phoneUploadSession: MobileUploadSession | null;
  isCreatingPhoneUploadSession: boolean;
  phoneUploadStatusMessage: string;
  phoneUploadQrCodeUrl: string;
  phoneUploadCopied: boolean;
  phoneUploadNow: number;
  setActiveSection: Dispatch<SetStateAction<Section>>;
  setIsSidebarCollapsed: Dispatch<SetStateAction<boolean>>;
  setFileRenameInput: Dispatch<SetStateAction<string>>;
  handleCloseFileRenameModal: () => void;
  handleConfirmFileRename: () => void | Promise<void>;
  handleCloseFileDeleteModal: () => void;
  handleConfirmFileDelete: () => void | Promise<void>;
  handleClosePhoneUpload: () => void;
  handleCopyPhoneUploadLink: () => void | Promise<void>;
  handleRefreshPhoneUpload: () => void | Promise<void>;
  handleLogout: () => void | Promise<void>;
};

export function AppAuthenticatedLayout({
  activeSection,
  dashboardProps,
  clientsProps,
  analyticsProps,
  careTeamProps,
  profileProps,
  settingsProps,
  aboutProps,
  isSidebarCollapsed,
  loading,
  profile,
  profileAvatarUrl,
  userEmail,
  selectedClientName,
  fileRenameTarget,
  fileRenameInput,
  fileDeleteTarget,
  isPhoneUploadModalOpen,
  phoneUploadTarget,
  phoneUploadSession,
  isCreatingPhoneUploadSession,
  phoneUploadStatusMessage,
  phoneUploadQrCodeUrl,
  phoneUploadCopied,
  phoneUploadNow,
  setActiveSection,
  setIsSidebarCollapsed,
  setFileRenameInput,
  handleCloseFileRenameModal,
  handleConfirmFileRename,
  handleCloseFileDeleteModal,
  handleConfirmFileDelete,
  handleClosePhoneUpload,
  handleCopyPhoneUploadLink,
  handleRefreshPhoneUpload,
  handleLogout,
}: AppAuthenticatedLayoutProps) {
  const isMfaEnrollmentRequired = profileProps.mfaEnrollmentRequired;
  const displayedSection: Section = isMfaEnrollmentRequired ? "profile" : activeSection;
  const handleSectionChange: Dispatch<SetStateAction<Section>> = (nextSection) => {
    if (isMfaEnrollmentRequired) {
      setActiveSection("profile");
      return;
    }

    setActiveSection(nextSection);
  };

  return (
    <AppShell
      activeSection={displayedSection}
      isSidebarCollapsed={isSidebarCollapsed}
      loading={loading}
      profile={profile}
      profileAvatarUrl={profileAvatarUrl}
      userEmail={userEmail}
      mainContent={
        <AppMainSectionRenderer
          activeSection={displayedSection}
          dashboardProps={dashboardProps}
          clientsProps={clientsProps}
          analyticsProps={analyticsProps}
          careTeamProps={careTeamProps}
          profileProps={profileProps}
          settingsProps={settingsProps}
          aboutProps={aboutProps}
        />
      }
      fileRenameModal={
        <FileRenameModal
          target={fileRenameTarget}
          inputValue={fileRenameInput}
          isSaving={loading}
          onInputChange={setFileRenameInput}
          onCancel={handleCloseFileRenameModal}
          onConfirm={handleConfirmFileRename}
        />
      }
      fileDeleteModal={
        <FileDeleteModal
          target={fileDeleteTarget}
          isDeleting={loading}
          onCancel={handleCloseFileDeleteModal}
          onConfirm={handleConfirmFileDelete}
        />
      }
      phoneUploadModal={
        <PhoneUploadModal
          isOpen={isPhoneUploadModalOpen}
          target={phoneUploadTarget}
          selectedClientName={selectedClientName}
          session={phoneUploadSession}
          isCreatingSession={isCreatingPhoneUploadSession}
          statusMessage={phoneUploadStatusMessage}
          qrCodeUrl={phoneUploadQrCodeUrl}
          copied={phoneUploadCopied}
          now={phoneUploadNow}
          onClose={handleClosePhoneUpload}
          onCopyLink={handleCopyPhoneUploadLink}
          onRefresh={handleRefreshPhoneUpload}
        />
      }
      setActiveSection={handleSectionChange}
      setIsSidebarCollapsed={setIsSidebarCollapsed}
      handleLogout={handleLogout}
    />
  );
}
