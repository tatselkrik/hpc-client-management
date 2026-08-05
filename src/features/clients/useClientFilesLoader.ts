import { useCallback, useState } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages } from "../../lib/feedbackMessages";
import { fetchSupabasePages } from "../../lib/supabasePagination";
import type { ClientAssessment, ClientDocument } from "../../appShared";
import { CLIENT_FILE_CONFIG, type ClientFileKind } from "./clientFileConfig";

type RequestGuard = () => boolean;

const loadClientFiles = async <FileRecord,>(
  kind: ClientFileKind,
  clientId: string,
  isCurrentRequest: RequestGuard
) => {
  const config = CLIENT_FILE_CONFIG[kind];

  const { data, error } = await fetchSupabasePages(() =>
    supabase
      .from(config.table)
      .select(config.selectColumns)
      .eq("client_id", clientId)
      .order("updated_at", { ascending: false })
  );

  if (!isCurrentRequest()) {
    return { data: null, error: null };
  }

  return {
    data: (data ?? []) as FileRecord[],
    error,
  };
};

export function useClientFilesLoader() {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [documentsMessage, setDocumentsMessage] = useState("");

  const [assessments, setAssessments] = useState<ClientAssessment[]>([]);
  const [assessmentsMessage, setAssessmentsMessage] = useState("");

  const loadDocuments = useCallback(async (clientId: string, isCurrentRequest: RequestGuard = () => true) => {
    if (!clientId) return;

    const { data, error } = await loadClientFiles<ClientDocument>(
      "document",
      clientId,
      isCurrentRequest
    );

    if (!data && !error) return;

    if (error) {
      setDocumentsMessage(feedbackMessages.loadFailed("documents", error.message));
      return;
    }

    setDocuments(data ?? []);
    setDocumentsMessage("");
  }, []);

  const loadAssessments = useCallback(async (clientId: string, isCurrentRequest: RequestGuard = () => true) => {
    if (!clientId) return;

    const { data, error } = await loadClientFiles<ClientAssessment>(
      "assessment",
      clientId,
      isCurrentRequest
    );

    if (!data && !error) return;

    if (error) {
      setAssessmentsMessage(feedbackMessages.loadFailed("assessments", error.message));
      return;
    }

    setAssessments(data ?? []);
    setAssessmentsMessage("");
  }, []);

  const clearClientFiles = useCallback(() => {
    setDocuments([]);
    setDocumentsMessage("");
    setAssessments([]);
    setAssessmentsMessage("");
  }, []);

  return {
    documents,
    documentsMessage,
    setDocumentsMessage,
    loadDocuments,
    assessments,
    assessmentsMessage,
    setAssessmentsMessage,
    loadAssessments,
    clearClientFiles,
  };
}
