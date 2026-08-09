import type {
  ChangeEvent,
  Dispatch,
  RefObject,
  SetStateAction,
} from "react";
import type { ClientAssessment, UploadDateFilter } from "../../appShared";
import { ClientConfiguredFilesTab } from "./ClientConfiguredFilesTab";

type ClientAssessmentsTabProps = {
  selectedClientId: string;
  loading: boolean;
  isCreatingPhoneUploadSession: boolean;
  assessmentSearch: string;
  setAssessmentSearch: Dispatch<SetStateAction<string>>;
  assessmentUploadDateFilter: UploadDateFilter;
  setAssessmentUploadDateFilter: Dispatch<SetStateAction<UploadDateFilter>>;
  handleOpenAssessmentPicker: () => void;
  handleOpenPhoneUploadAssessment: () => void;
  selectedAssessment: ClientAssessment | null;
  handleDeleteAssessment: (assessment: ClientAssessment) => void;
  handleRenameAssessment: (assessment: ClientAssessment) => void;
  handleDownloadAssessment: (assessment: ClientAssessment) => void;
  assessmentInputRef: RefObject<HTMLInputElement | null>;
  handleUploadAssessment: (event: ChangeEvent<HTMLInputElement>) => void;
  assessmentsMessage: string;
  filteredAssessments: ClientAssessment[];
  selectedAssessmentId: string;
  setSelectedAssessmentId: Dispatch<SetStateAction<string>>;
  assessmentPreviewLoading: boolean;
  assessmentPreviewUrl: string;
  canManageAssessments?: boolean;
  canDeleteAssessments?: boolean;
};

export function ClientAssessmentsTab({
  selectedClientId,
  loading,
  isCreatingPhoneUploadSession,
  assessmentSearch,
  setAssessmentSearch,
  assessmentUploadDateFilter,
  setAssessmentUploadDateFilter,
  handleOpenAssessmentPicker,
  handleOpenPhoneUploadAssessment,
  selectedAssessment,
  handleDeleteAssessment,
  handleRenameAssessment,
  handleDownloadAssessment,
  assessmentInputRef,
  handleUploadAssessment,
  assessmentsMessage,
  filteredAssessments,
  selectedAssessmentId,
  setSelectedAssessmentId,
  assessmentPreviewLoading,
  assessmentPreviewUrl,
  canManageAssessments = true,
  canDeleteAssessments = canManageAssessments,
}: ClientAssessmentsTabProps) {
  return (
    <ClientConfiguredFilesTab
      kind="assessment"
      selectedClientId={selectedClientId}
      loading={loading}
      isCreatingPhoneUploadSession={isCreatingPhoneUploadSession}
      search={assessmentSearch}
      setSearch={setAssessmentSearch}
      uploadDateFilter={assessmentUploadDateFilter}
      setUploadDateFilter={setAssessmentUploadDateFilter}
      handleOpenFilePicker={handleOpenAssessmentPicker}
      handleOpenPhoneUpload={handleOpenPhoneUploadAssessment}
      selectedFile={selectedAssessment}
      handleDeleteFile={handleDeleteAssessment}
      handleRenameFile={handleRenameAssessment}
      handleDownloadFile={handleDownloadAssessment}
      fileInputRef={assessmentInputRef}
      handleUploadFile={handleUploadAssessment}
      message={assessmentsMessage}
      filteredFiles={filteredAssessments}
      selectedFileId={selectedAssessmentId}
      setSelectedFileId={setSelectedAssessmentId}
      previewLoading={assessmentPreviewLoading}
      previewUrl={assessmentPreviewUrl}
      canManageFiles={canManageAssessments}
      canDeleteFiles={canDeleteAssessments}
    />
  );
}
