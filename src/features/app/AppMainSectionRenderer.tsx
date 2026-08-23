import type { Section } from "../../appShared";
import {
  DashboardSection,
  type DashboardSectionProps,
} from "../dashboard/DashboardSection";
import {
  ClientsSection,
  type ClientsSectionProps,
} from "../clients/ClientsSection";
import {
  AnalyticsSectionShell,
  type AnalyticsSectionShellProps,
} from "../analytics/AnalyticsSectionShell";
import {
  CalendarSection,
  type CalendarSectionProps,
} from "../calendar/CalendarSection";
import {
  CareTeamSection,
  type CareTeamSectionProps,
} from "../care-team/CareTeamSection";
import {
  ProfileSection,
  type ProfileSectionProps,
} from "../profile/ProfileSection";
import {
  SettingsSection,
  type SettingsSectionProps,
} from "../settings/SettingsSection";
import {
  AboutSection,
  type AboutSectionProps,
} from "../about/AboutSection";

export type AppMainSectionRendererProps = {
  activeSection: Section;
  dashboardProps: DashboardSectionProps;
  clientsProps: ClientsSectionProps;
  calendarProps: CalendarSectionProps;
  analyticsProps: AnalyticsSectionShellProps;
  careTeamProps: CareTeamSectionProps;
  profileProps: ProfileSectionProps;
  settingsProps: SettingsSectionProps;
  aboutProps: AboutSectionProps;
};

export function AppMainSectionRenderer({
  activeSection,
  dashboardProps,
  clientsProps,
  calendarProps,
  analyticsProps,
  careTeamProps,
  profileProps,
  settingsProps,
  aboutProps,
}: AppMainSectionRendererProps) {
  if (activeSection === "dashboard") {
    return <DashboardSection {...dashboardProps} />;
  }

  if (activeSection === "clients") {
    return <ClientsSection {...clientsProps} />;
  }

  if (activeSection === "calendar") {
    return <CalendarSection {...calendarProps} />;
  }

  if (activeSection === "analytics") {
    return <AnalyticsSectionShell {...analyticsProps} />;
  }

  if (activeSection === "careTeam") {
    return <CareTeamSection {...careTeamProps} />;
  }

  if (activeSection === "profile") {
    return <ProfileSection {...profileProps} />;
  }

  if (activeSection === "settings") {
    return <SettingsSection {...settingsProps} />;
  }

  return <AboutSection {...aboutProps} />;
}
