import { useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

import type { ClientTab } from "../../appShared";
import { feedbackMessages } from "../../lib/feedbackMessages";

type UseClientNavigationGuardsArgs = {
  activeClientTab: ClientTab;
  selectedClientId: string;
  isClientOverviewDirty: boolean;
  hasSuicidalIdeation: boolean;
  setSelectedClientId: Dispatch<SetStateAction<string>>;
  setActiveClientTab: Dispatch<SetStateAction<ClientTab>>;
};

export function useClientNavigationGuards({
  activeClientTab,
  selectedClientId,
  isClientOverviewDirty,
  hasSuicidalIdeation,
  setSelectedClientId,
  setActiveClientTab,
}: UseClientNavigationGuardsArgs) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isClientOverviewDirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isClientOverviewDirty]);

  useEffect(() => {
    if (activeClientTab === "cssrs" && !hasSuicidalIdeation) {
      setActiveClientTab("overview");
    }
  }, [activeClientTab, hasSuicidalIdeation, setActiveClientTab]);

  const confirmClientOverviewNavigation = useCallback(() => {
    if (!isClientOverviewDirty) return true;

    return window.confirm(
      `${feedbackMessages.leaveWithoutSavingTitle}\n\n${feedbackMessages.leaveWithoutSavingBody(
        "the client overview"
      )}`
    );
  }, [isClientOverviewDirty]);

  const handleSelectedClientChange = useCallback(
    (clientId: string) => {
      if (clientId === selectedClientId) return;
      if (!confirmClientOverviewNavigation()) return;

      setSelectedClientId(clientId);
    },
    [confirmClientOverviewNavigation, selectedClientId, setSelectedClientId]
  );

  const handleActiveClientTabChange = useCallback(
    (tab: ClientTab) => {
      if (tab === activeClientTab) return;
      if (activeClientTab === "overview" && !confirmClientOverviewNavigation()) {
        return;
      }

      setActiveClientTab(tab);
    },
    [activeClientTab, confirmClientOverviewNavigation, setActiveClientTab]
  );

  return {
    handleSelectedClientChange,
    handleActiveClientTabChange,
  };
}
