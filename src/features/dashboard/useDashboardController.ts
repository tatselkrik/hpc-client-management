import type {
  ClientListItem,
  ClientTab,
  DashboardAnnouncement,
  Section,
} from "../../appShared";
import type {
  AnalyticsDashboardInputs,
  AnalyticsViewModel,
} from "../analytics/useAnalyticsViewModel";
import type { DashboardSectionProps } from "./DashboardSection";
import { useDashboardAnnouncementView } from "./useDashboardAnnouncementView";
import { useDashboardInsights } from "./useDashboardInsights";

type ClientAccessLookupRecord = {
  id: string;
  hpc_representative?: string | null;
};

type ClientAccessRecord = {
  hpc_representative?: string | null;
};

type UseDashboardControllerOptions = {
  analyticsDashboardInputs: AnalyticsDashboardInputs;
  analyticsViewModel: AnalyticsViewModel;
  clients: ClientAccessLookupRecord[];
  selectedClient: Pick<ClientListItem, "client_name" | "category_path" | "client_status"> | null;
  selectedClientId: string;
  canCurrentProfileAccessClient: (client: ClientAccessRecord) => boolean;
  setSelectedClientId: (clientId: string) => void;
  setActiveClientTab: (tab: ClientTab) => void;
  setActiveSection: (section: Section) => void;
  setClientMessage: (message: string) => void;
  dashboardAnnouncement: DashboardAnnouncement;
  dismissedAnnouncementKey: string;
  handleDismissDashboardAnnouncement: (signature: string) => void;
  clientMessage: string;
  notesMessage: string;
  documentsMessage: string;
  assessmentsMessage: string;
};

export function useDashboardController({
  analyticsDashboardInputs,
  analyticsViewModel,
  clients,
  selectedClient,
  selectedClientId,
  canCurrentProfileAccessClient,
  setSelectedClientId,
  setActiveClientTab,
  setActiveSection,
  setClientMessage,
  dashboardAnnouncement,
  dismissedAnnouncementKey,
  handleDismissDashboardAnnouncement,
  clientMessage,
  notesMessage,
  documentsMessage,
  assessmentsMessage,
}: UseDashboardControllerOptions) {
  const {
    dashboardActiveClientCount,
    dashboardNewClientsThisWeekCount,
    dashboardNotesThisWeekCount,
    dashboardFilesThisWeekCount,
    dashboardAttentionItems,
    dashboardRecentActivity,
    openClientFromDashboard,
    openSelectedClientFromDashboard,
    formatDashboardDateLabel,
  } = useDashboardInsights({
    ...analyticsDashboardInputs,
    clients,
    selectedClientId,
    canCurrentProfileAccessClient,
    setSelectedClientId,
    setActiveClientTab,
    setActiveSection,
    setClientMessage,
  });

  const {
    announcementSignature,
    shouldShowDashboardAnnouncement,
    dashboardAnnouncementExpiryLabel,
  } = useDashboardAnnouncementView({
    dashboardAnnouncement,
    dismissedAnnouncementKey,
  });

  const dashboardProps: DashboardSectionProps = {
    analyticsLoading: analyticsViewModel.analyticsLoading,
    analyticsClientCount: analyticsDashboardInputs.analyticsClientRows.length,
    dashboardActiveClientCount,
    dashboardNewClientsThisWeekCount,
    dashboardRecentActivity,
    dashboardNotesThisWeekCount,
    dashboardFilesThisWeekCount,
    selectedClient,
    selectedClientId,
    openSelectedClientFromDashboard,
    shouldShowDashboardAnnouncement,
    dashboardAnnouncement,
    announcementSignature,
    handleDismissDashboardAnnouncement,
    dashboardAnnouncementExpiryLabel,
    dashboardAttentionItems,
    openClientFromDashboard,
    formatDashboardDateLabel,
    clientMessage,
    notesMessage,
    documentsMessage,
    assessmentsMessage,
    analyticsMessage: analyticsViewModel.analyticsMessage,
  };

  return {
    dashboardProps,
  };
}
