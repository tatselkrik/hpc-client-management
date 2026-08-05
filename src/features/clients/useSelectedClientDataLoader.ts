import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

type ClientAccessRecord = {
  id: string;
  hpc_representative?: string | null;
};

type UseSelectedClientDataLoaderArgs = {
  selectedClientId: string;
  clients: ClientAccessRecord[];
  analyticsClients: ClientAccessRecord[];
  canCurrentProfileAccessClient: (client: ClientAccessRecord) => boolean;
  resetClientForm: () => void;
  clearClient4Ps: () => void;
  setClientOverviewBaselineSnapshot: Dispatch<SetStateAction<string>>;
  clearProgressNotes: () => void;
  clearClientFiles: () => void;
  setSelectedDocumentId: Dispatch<SetStateAction<string>>;
  setDocumentPreviewUrl: Dispatch<SetStateAction<string>>;
  setDocumentPreviewLoading: Dispatch<SetStateAction<boolean>>;
  setSelectedAssessmentId: Dispatch<SetStateAction<string>>;
  setAssessmentPreviewUrl: Dispatch<SetStateAction<string>>;
  setAssessmentPreviewLoading: Dispatch<SetStateAction<boolean>>;
  loadClientDetails: (
    clientId: string,
    isCurrentRequest?: () => boolean
  ) => Promise<void>;
  loadClient4Ps: (
    clientId: string,
    isCurrentRequest?: () => boolean
  ) => Promise<void>;
  loadProgressNotes: (
    clientId: string,
    isCurrentRequest?: () => boolean
  ) => Promise<void>;
  loadDocuments: (
    clientId: string,
    isCurrentRequest?: () => boolean
  ) => Promise<void>;
  loadAssessments: (
    clientId: string,
    isCurrentRequest?: () => boolean
  ) => Promise<void>;
  setClientMessage: Dispatch<SetStateAction<string>>;
};

export function useSelectedClientDataLoader({
  selectedClientId,
  clients,
  analyticsClients,
  canCurrentProfileAccessClient,
  resetClientForm,
  clearClient4Ps,
  setClientOverviewBaselineSnapshot,
  clearProgressNotes,
  clearClientFiles,
  setSelectedDocumentId,
  setDocumentPreviewUrl,
  setDocumentPreviewLoading,
  setSelectedAssessmentId,
  setAssessmentPreviewUrl,
  setAssessmentPreviewLoading,
  loadClientDetails,
  loadClient4Ps,
  loadProgressNotes,
  loadDocuments,
  loadAssessments,
  setClientMessage,
}: UseSelectedClientDataLoaderArgs) {
  const selectedClientLoadRequestRef = useRef(0);

  useEffect(() => {
    const requestId = ++selectedClientLoadRequestRef.current;
    const isCurrentRequest = () =>
      selectedClientLoadRequestRef.current === requestId;

    const clearSelectedClientViews = () => {
      resetClientForm();
      clearClient4Ps();
      setClientOverviewBaselineSnapshot("");
      clearProgressNotes();
      clearClientFiles();
      setSelectedDocumentId("");
      setDocumentPreviewUrl("");
      setDocumentPreviewLoading(false);
      setSelectedAssessmentId("");
      setAssessmentPreviewUrl("");
      setAssessmentPreviewLoading(false);
    };

    const run = async () => {
      if (!selectedClientId) {
        clearSelectedClientViews();
        return;
      }

      const selectedClientAccessRecord =
        clients.find((client) => client.id === selectedClientId) ??
        analyticsClients.find((client) => client.id === selectedClientId);

      if (
        selectedClientAccessRecord &&
        !canCurrentProfileAccessClient(selectedClientAccessRecord)
      ) {
        clearSelectedClientViews();
        setClientMessage(
          "This client is not assigned to your HPC Representative profile, so it cannot be opened."
        );
        return;
      }

      await Promise.all([
        loadClientDetails(selectedClientId, isCurrentRequest),
        loadClient4Ps(selectedClientId, isCurrentRequest),
        loadProgressNotes(selectedClientId, isCurrentRequest),
        loadDocuments(selectedClientId, isCurrentRequest),
        loadAssessments(selectedClientId, isCurrentRequest),
      ]);
    };

    void run();
  }, [
    analyticsClients,
    canCurrentProfileAccessClient,
    clearClient4Ps,
    clearClientFiles,
    clearProgressNotes,
    clients,
    loadAssessments,
    loadClient4Ps,
    loadClientDetails,
    loadDocuments,
    loadProgressNotes,
    resetClientForm,
    selectedClientId,
    setAssessmentPreviewLoading,
    setAssessmentPreviewUrl,
    setClientMessage,
    setClientOverviewBaselineSnapshot,
    setDocumentPreviewLoading,
    setDocumentPreviewUrl,
    setSelectedAssessmentId,
    setSelectedDocumentId,
  ]);
}
