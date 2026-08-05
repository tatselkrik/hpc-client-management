import { useMemo, useState } from "react";

import type {
  ClientAssessment,
  ClientDocument,
  UploadDateFilter,
} from "../../appShared";

type UseFilePreviewArgs = {
  documents: ClientDocument[];
  assessments: ClientAssessment[];
};


const getUploadDateFilterStart = (filter: UploadDateFilter) => {
  const now = new Date();

  if (filter === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (filter === "last_7_days") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  if (filter === "this_month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (filter === "this_year") {
    return new Date(now.getFullYear(), 0, 1);
  }

  return null;
};

const matchesUploadDateFilter = (createdAt: string, filter: UploadDateFilter) => {
  const start = getUploadDateFilterStart(filter);
  if (!start) return true;

  const createdTime = new Date(createdAt).getTime();
  return Number.isFinite(createdTime) && createdTime >= start.getTime();
};

export function useFilePreview({
  documents,
  assessments,
}: UseFilePreviewArgs) {
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentUploadDateFilter, setDocumentUploadDateFilter] =
    useState<UploadDateFilter>("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const [assessmentSearch, setAssessmentSearch] = useState("");
  const [assessmentUploadDateFilter, setAssessmentUploadDateFilter] =
    useState<UploadDateFilter>("all");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const filteredDocuments = useMemo(() => {
    const search = documentSearch.trim().toLowerCase();

    const filtered = documents.filter((document) => {
      const documentName = document.document_name?.toLowerCase() ?? "";
      const originalName = document.original_file_name?.toLowerCase() ?? "";
      const matchesSearch = documentName.includes(search) || originalName.includes(search);
      return matchesSearch && matchesUploadDateFilter(document.created_at, documentUploadDateFilter);
    });

    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [documents, documentSearch, documentUploadDateFilter]);

  const filteredAssessments = useMemo(() => {
    const search = assessmentSearch.trim().toLowerCase();

    const filtered = assessments.filter((assessment) => {
      const assessmentName = assessment.assessment_name?.toLowerCase() ?? "";
      const originalName = assessment.original_file_name?.toLowerCase() ?? "";
      const matchesSearch = assessmentName.includes(search) || originalName.includes(search);
      return matchesSearch && matchesUploadDateFilter(assessment.created_at, assessmentUploadDateFilter);
    });

    return [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [assessments, assessmentSearch, assessmentUploadDateFilter]);

  return {
    documentSearch,
    setDocumentSearch,
    documentUploadDateFilter,
    setDocumentUploadDateFilter,
    selectedDocumentId,
    setSelectedDocumentId,
    filteredDocuments,
    assessmentSearch,
    setAssessmentSearch,
    assessmentUploadDateFilter,
    setAssessmentUploadDateFilter,
    selectedAssessmentId,
    setSelectedAssessmentId,
    filteredAssessments,
  };
}
