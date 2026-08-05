import { useCallback, useState } from "react";
import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { fetchSupabasePages } from "../../lib/supabasePagination";
import type { ClientListItem } from "../../appShared";

type UseClientsLoaderOptions = {
  setClientMessage: (message: string) => void;
};

export function useClientsLoader({ setClientMessage }: UseClientsLoaderOptions) {
  const [clients, setClients] = useState<ClientListItem[]>([]);

  const loadClients = useCallback(async () => {
    const { data, error } = await fetchSupabasePages(() =>
      supabase
        .from("clients")
        .select("id, client_name, age, sex, pre_existing_psychiatric_diagnosis, created_at, updated_at, intake_date, client_status, category_path, hpc_representative, counselling_reasons")
        .order("updated_at", { ascending: false })
    );

    if (error) {
      setClientMessage(feedbackMessages.loadFailed("client list", error.message));
      return;
    }

    setClients(data ?? []);
  }, [setClientMessage]);

  return {
    clients,
    setClients,
    loadClients,
  };
}
