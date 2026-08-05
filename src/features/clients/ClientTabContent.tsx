import type { ComponentProps } from "react";

import type { ClientTab } from "../../appShared";
import { CssrsClinicTab } from "../cssrs/CssrsClinicTab";
import { Client4PsTab } from "./Client4PsTab";
import { ClientAssessmentsTab } from "./ClientAssessmentsTab";
import { ClientDocumentsTab } from "./ClientDocumentsTab";
import { ClientOverviewTab } from "./ClientOverviewTab";
import { ProgressNotesTab } from "./ProgressNotesTab";

type ClientOverviewTabProps = ComponentProps<typeof ClientOverviewTab>;
type ClientFourPsTabProps = Omit<
  ComponentProps<typeof Client4PsTab>,
  "isReadOnly"
>;
type ClientCssrsTabProps = Omit<
  ComponentProps<typeof CssrsClinicTab>,
  "clientId" | "clientName" | "isReadOnly" | "canEditProtectiveFactors"
>;
type ProgressNotesTabProps = ComponentProps<typeof ProgressNotesTab>;
type ClientDocumentsTabProps = ComponentProps<typeof ClientDocumentsTab>;
type ClientAssessmentsTabProps = ComponentProps<typeof ClientAssessmentsTab>;

export type ClientTabContentProps = ClientOverviewTabProps &
  ClientFourPsTabProps &
  ClientCssrsTabProps &
  ProgressNotesTabProps &
  ClientDocumentsTabProps &
  ClientAssessmentsTabProps & {
    activeClientTab: ClientTab;
    hasSuicidalIdeation: boolean;
    cssrsClientName: string | null;
    fourPsIsReadOnly: boolean;
    cssrsIsReadOnly: boolean;
    canEditCssrsProtectiveFactors: boolean;
  };

export function ClientTabContent({
  activeClientTab,
  hasSuicidalIdeation,
  cssrsClientName,
  fourPsIsReadOnly,
  cssrsIsReadOnly,
  canEditCssrsProtectiveFactors,
  clientForm,
  categoryOptions,
  hpcRepresentativeOptions,
  isHpcRepresentativeLocked,
  lockedHpcRepresentativeName,
  childrenForms,
  clientMessage,
  loading,
  selectedClientId,
  isClientOverviewDirty,
  updateClientForm,
  updateSiblingOrderPart,
  toggleCounsellingReason,
  addChildRow,
  updateChildRow,
  removeChildRow,
  handleSaveClientOverview,
  client4PsForm,
  client4PsNarrativeReport,
  client4PsMessage,
  isSavingClient4Ps,
  isGeneratingClient4PsNarrative,
  updateClient4PsField,
  updateClient4PsNarrativeReport,
  handleGenerateClient4PsNarrative,
  handleSaveClient4Ps,
  writeAuditLog,
  onCssrsSaved,
  notesMessage,
  progressNotes,
  noteForm,
  updateNoteForm,
  handleEditNote,
  handleCancelEditNote,
  handleSaveNote,
  canEditProgressNotes,
  isCreatingPhoneUploadSession,
  documentSearch,
  setDocumentSearch,
  documentUploadDateFilter,
  setDocumentUploadDateFilter,
  handleOpenDocumentPicker,
  handleOpenPhoneUpload,
  selectedDocument,
  handleDeleteDocument,
  handleRenameDocument,
  handleDownloadDocument,
  documentInputRef,
  handleUploadDocument,
  documentsMessage,
  filteredDocuments,
  selectedDocumentId,
  setSelectedDocumentId,
  documentPreviewLoading,
  documentPreviewUrl,
  canManageDocuments,
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
  canManageAssessments,
}: ClientTabContentProps) {
  if (activeClientTab === "overview") {
    return (
      <ClientOverviewTab
        clientForm={clientForm}
        categoryOptions={categoryOptions}
        hpcRepresentativeOptions={hpcRepresentativeOptions}
        isHpcRepresentativeLocked={isHpcRepresentativeLocked}
        lockedHpcRepresentativeName={lockedHpcRepresentativeName}
        childrenForms={childrenForms}
        clientMessage={clientMessage}
        loading={loading}
        selectedClientId={selectedClientId}
        isClientOverviewDirty={isClientOverviewDirty}
        updateClientForm={updateClientForm}
        updateSiblingOrderPart={updateSiblingOrderPart}
        toggleCounsellingReason={toggleCounsellingReason}
        addChildRow={addChildRow}
        updateChildRow={updateChildRow}
        removeChildRow={removeChildRow}
        handleSaveClientOverview={handleSaveClientOverview}
      />
    );
  }

  if (activeClientTab === "fourPs") {
    return (
      <Client4PsTab
        client4PsForm={client4PsForm}
        client4PsNarrativeReport={client4PsNarrativeReport}
        client4PsMessage={client4PsMessage}
        loading={loading}
        isSavingClient4Ps={isSavingClient4Ps}
        isGeneratingClient4PsNarrative={isGeneratingClient4PsNarrative}
        selectedClientId={selectedClientId}
        updateClient4PsField={updateClient4PsField}
        updateClient4PsNarrativeReport={updateClient4PsNarrativeReport}
        handleGenerateClient4PsNarrative={handleGenerateClient4PsNarrative}
        handleSaveClient4Ps={handleSaveClient4Ps}
        isReadOnly={fourPsIsReadOnly}
      />
    );
  }

  if (activeClientTab === "cssrs" && hasSuicidalIdeation) {
    return (
      <CssrsClinicTab
        clientId={selectedClientId}
        clientName={cssrsClientName}
        writeAuditLog={writeAuditLog}
        onCssrsSaved={onCssrsSaved}
        isReadOnly={cssrsIsReadOnly}
        canEditProtectiveFactors={canEditCssrsProtectiveFactors}
      />
    );
  }

  if (activeClientTab === "notes") {
    return (
      <ProgressNotesTab
        notesMessage={notesMessage}
        progressNotes={progressNotes}
        noteForm={noteForm}
        updateNoteForm={updateNoteForm}
        handleEditNote={handleEditNote}
        handleCancelEditNote={handleCancelEditNote}
        handleSaveNote={handleSaveNote}
        loading={loading}
        selectedClientId={selectedClientId}
        canEditProgressNotes={canEditProgressNotes}
      />
    );
  }

  if (activeClientTab === "documents") {
    return (
      <ClientDocumentsTab
        selectedClientId={selectedClientId}
        loading={loading}
        isCreatingPhoneUploadSession={isCreatingPhoneUploadSession}
        documentSearch={documentSearch}
        setDocumentSearch={setDocumentSearch}
        documentUploadDateFilter={documentUploadDateFilter}
        setDocumentUploadDateFilter={setDocumentUploadDateFilter}
        handleOpenDocumentPicker={handleOpenDocumentPicker}
        handleOpenPhoneUpload={handleOpenPhoneUpload}
        selectedDocument={selectedDocument}
        handleDeleteDocument={handleDeleteDocument}
        handleRenameDocument={handleRenameDocument}
        handleDownloadDocument={handleDownloadDocument}
        documentInputRef={documentInputRef}
        handleUploadDocument={handleUploadDocument}
        documentsMessage={documentsMessage}
        filteredDocuments={filteredDocuments}
        selectedDocumentId={selectedDocumentId}
        setSelectedDocumentId={setSelectedDocumentId}
        documentPreviewLoading={documentPreviewLoading}
        documentPreviewUrl={documentPreviewUrl}
        canManageDocuments={canManageDocuments}
      />
    );
  }

  if (activeClientTab === "assessments") {
    return (
      <ClientAssessmentsTab
        selectedClientId={selectedClientId}
        loading={loading}
        isCreatingPhoneUploadSession={isCreatingPhoneUploadSession}
        assessmentSearch={assessmentSearch}
        setAssessmentSearch={setAssessmentSearch}
        assessmentUploadDateFilter={assessmentUploadDateFilter}
        setAssessmentUploadDateFilter={setAssessmentUploadDateFilter}
        handleOpenAssessmentPicker={handleOpenAssessmentPicker}
        handleOpenPhoneUploadAssessment={handleOpenPhoneUploadAssessment}
        selectedAssessment={selectedAssessment}
        handleDeleteAssessment={handleDeleteAssessment}
        handleRenameAssessment={handleRenameAssessment}
        handleDownloadAssessment={handleDownloadAssessment}
        assessmentInputRef={assessmentInputRef}
        handleUploadAssessment={handleUploadAssessment}
        assessmentsMessage={assessmentsMessage}
        filteredAssessments={filteredAssessments}
        selectedAssessmentId={selectedAssessmentId}
        setSelectedAssessmentId={setSelectedAssessmentId}
        assessmentPreviewLoading={assessmentPreviewLoading}
        assessmentPreviewUrl={assessmentPreviewUrl}
        canManageAssessments={canManageAssessments}
      />
    );
  }

  return null;
}
