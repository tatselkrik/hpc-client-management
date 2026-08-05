import { useCallback, useEffect, useRef, useState } from "react";

import { supabase } from "../../lib/supabase";
import { feedbackMessages, getErrorDetail } from "../../lib/feedbackMessages";
import type {
  MobileUploadSession,
  MobileUploadSessionStatus,
  PhoneUploadTarget,
} from "../../appShared";
import {
  buildPhoneUploadMobileUrl,
  createPhoneUploadToken,
  formatPhoneUploadTargetLabel,
  hashPhoneUploadToken,
  MOBILE_UPLOAD_BASE_URL,
  MOBILE_UPLOAD_SESSION_EXPIRY_MS,
  MOBILE_UPLOAD_SESSION_POLL_MS,
} from "../../appShared";

type UsePhoneUploadSessionOptions = {
  selectedClientId: string;
  loadDocuments: (clientId: string) => Promise<void>;
  loadAssessments: (clientId: string) => Promise<void>;
  setSelectedDocumentId: (documentId: string) => void;
  setSelectedAssessmentId: (assessmentId: string) => void;
  setDocumentsMessage: (message: string) => void;
  setAssessmentsMessage: (message: string) => void;
};

export function usePhoneUploadSession({
  selectedClientId,
  loadDocuments,
  loadAssessments,
  setSelectedDocumentId,
  setSelectedAssessmentId,
  setDocumentsMessage,
  setAssessmentsMessage,
}: UsePhoneUploadSessionOptions) {
  const [isPhoneUploadModalOpen, setIsPhoneUploadModalOpen] = useState(false);
  const [phoneUploadTarget, setPhoneUploadTarget] = useState<PhoneUploadTarget | null>(null);
  const [phoneUploadSession, setPhoneUploadSession] = useState<MobileUploadSession | null>(null);
  const [isCreatingPhoneUploadSession, setIsCreatingPhoneUploadSession] = useState(false);
  const [phoneUploadStatusMessage, setPhoneUploadStatusMessage] = useState("");
  const [phoneUploadQrCodeUrl, setPhoneUploadQrCodeUrl] = useState("");
  const [phoneUploadCopied, setPhoneUploadCopied] = useState(false);
  const [phoneUploadNow, setPhoneUploadNow] = useState(Date.now());
  const phoneUploadPollTimerRef = useRef<number | null>(null);

  const stopPhoneUploadPolling = useCallback(() => {
    if (phoneUploadPollTimerRef.current !== null) {
      window.clearInterval(phoneUploadPollTimerRef.current);
      phoneUploadPollTimerRef.current = null;
    }
  }, []);

  const resetPhoneUploadState = useCallback(() => {
    stopPhoneUploadPolling();
    setPhoneUploadSession(null);
    setPhoneUploadQrCodeUrl("");
    setPhoneUploadStatusMessage("");
    setPhoneUploadCopied(false);
    setPhoneUploadNow(Date.now());
    setIsCreatingPhoneUploadSession(false);
  }, [stopPhoneUploadPolling]);

  const handlePhoneUploadCompleted = useCallback(
    async (target: PhoneUploadTarget, session: MobileUploadSession) => {
      if (!selectedClientId) return;

      if (target === "document") {
        await loadDocuments(selectedClientId);

        if (session.storage_path) {
          const { data } = await supabase
            .from("client_documents")
            .select("id")
            .eq("client_id", selectedClientId)
            .eq("storage_path", session.storage_path)
            .maybeSingle();

          if (data?.id) {
            setSelectedDocumentId(data.id);
          }
        }

        setDocumentsMessage("Document uploaded from phone.");
        return;
      }

      await loadAssessments(selectedClientId);

      if (session.storage_path) {
        const { data } = await supabase
          .from("client_assessments")
          .select("id")
          .eq("client_id", selectedClientId)
          .eq("storage_path", session.storage_path)
          .maybeSingle();

        if (data?.id) {
          setSelectedAssessmentId(data.id);
        }
      }

      setAssessmentsMessage("Assessment uploaded from phone.");
    },
    [
      loadAssessments,
      loadDocuments,
      selectedClientId,
      setAssessmentsMessage,
      setDocumentsMessage,
      setSelectedAssessmentId,
      setSelectedDocumentId,
    ]
  );

  const handleOpenPhoneUpload = useCallback(
    async (target: PhoneUploadTarget) => {
      if (!selectedClientId) {
        return;
      }

      const mobileUrlBase = MOBILE_UPLOAD_BASE_URL.trim();

      if (!mobileUrlBase) {
        const message =
          "Set VITE_MOBILE_UPLOAD_BASE_URL first so the QR code can open the phone upload page.";
        setPhoneUploadStatusMessage(message);

        if (target === "document") {
          setDocumentsMessage(message);
        } else {
          setAssessmentsMessage(message);
        }

        return;
      }

      setPhoneUploadTarget(target);
      setPhoneUploadSession(null);
      setPhoneUploadQrCodeUrl("");
      setPhoneUploadStatusMessage(feedbackMessages.loading("Creating secure upload session"));
      setPhoneUploadCopied(false);
      setPhoneUploadNow(Date.now());
      setIsPhoneUploadModalOpen(true);
      setIsCreatingPhoneUploadSession(true);

      try {
        const rawToken = createPhoneUploadToken();
        const tokenHash = await hashPhoneUploadToken(rawToken);
        const expiresAt = new Date(Date.now() + MOBILE_UPLOAD_SESSION_EXPIRY_MS).toISOString();
        const mobileUrl = buildPhoneUploadMobileUrl(rawToken);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const insertResult = await supabase
          .from("mobile_upload_sessions")
          .insert({
            token_hash: tokenHash,
            client_id: selectedClientId,
            target_type: target,
            created_by: user?.id ?? null,
            status: "pending",
            expires_at: expiresAt,
          })
          .select("id, client_id, target_type, status, expires_at")
          .single();

        if (insertResult.error || !insertResult.data) {
          throw new Error(insertResult.error?.message ?? "Unable to create upload session.");
        }

        setPhoneUploadSession({
          id: insertResult.data.id,
          client_id: insertResult.data.client_id,
          target_type: insertResult.data.target_type as PhoneUploadTarget,
          status: insertResult.data.status as MobileUploadSessionStatus,
          expires_at: insertResult.data.expires_at,
          token: rawToken,
          mobile_url: mobileUrl,
        });
        setPhoneUploadStatusMessage(
          `Scan this QR code to upload a ${formatPhoneUploadTargetLabel(target).toLowerCase()} from your phone.`
        );
      } catch (error) {
        const message =
          getErrorDetail(error, "Unable to create phone upload session.");
        setPhoneUploadStatusMessage(message);

        if (target === "document") {
          setDocumentsMessage(message);
        } else {
          setAssessmentsMessage(message);
        }
      } finally {
        setIsCreatingPhoneUploadSession(false);
      }
    },
    [selectedClientId, setAssessmentsMessage, setDocumentsMessage]
  );

  const handleClosePhoneUpload = useCallback(() => {
    if (phoneUploadSession?.id && phoneUploadSession.status === "pending") {
      void supabase
        .from("mobile_upload_sessions")
        .update({ status: "cancelled" })
        .eq("id", phoneUploadSession.id)
        .eq("status", "pending");
    }

    setIsPhoneUploadModalOpen(false);
    setPhoneUploadTarget(null);
    resetPhoneUploadState();
  }, [phoneUploadSession?.id, phoneUploadSession?.status, resetPhoneUploadState]);

  const handleRefreshPhoneUpload = useCallback(async () => {
    if (!phoneUploadTarget) {
      return;
    }

    await handleOpenPhoneUpload(phoneUploadTarget);
  }, [handleOpenPhoneUpload, phoneUploadTarget]);

  const handleCopyPhoneUploadLink = useCallback(async () => {
    if (!phoneUploadSession?.mobile_url) {
      return;
    }

    try {
      await navigator.clipboard.writeText(phoneUploadSession.mobile_url);
      setPhoneUploadCopied(true);
    } catch (error) {
      setPhoneUploadStatusMessage(
        getErrorDetail(error, "Unable to copy the phone upload link.")
      );
    }
  }, [phoneUploadSession?.mobile_url]);

  useEffect(() => {
    if (!phoneUploadSession?.mobile_url) {
      setPhoneUploadQrCodeUrl("");
      return;
    }

    let isCancelled = false;

    const generateQrCode = async () => {
      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(phoneUploadSession.mobile_url, {
          width: 280,
          margin: 1,
          color: { dark: "#1f2733", light: "#ffffff" },
        });

        if (!isCancelled) {
          setPhoneUploadQrCodeUrl(url);
        }
      } catch (error) {
        if (!isCancelled) {
          setPhoneUploadQrCodeUrl("");
          setPhoneUploadStatusMessage(
            getErrorDetail(error, "Unable to generate the QR code.")
          );
        }
      }
    };

    void generateQrCode();

    return () => {
      isCancelled = true;
    };
  }, [phoneUploadSession?.mobile_url]);

  useEffect(() => {
    if (!isPhoneUploadModalOpen || !phoneUploadSession?.id || !phoneUploadTarget) {
      stopPhoneUploadPolling();
      return;
    }

    const pollSession = async () => {
      setPhoneUploadNow(Date.now());

      const { data, error } = await supabase
        .from("mobile_upload_sessions")
        .select("id, status, expires_at, storage_path, uploaded_file_name")
        .eq("id", phoneUploadSession.id)
        .single();

      if (error) {
        setPhoneUploadStatusMessage(feedbackMessages.error("We could not refresh the phone upload session.", error.message));
        return;
      }

      const nextSession: MobileUploadSession = {
        ...phoneUploadSession,
        status: data.status as MobileUploadSessionStatus,
        expires_at: data.expires_at,
        storage_path: data.storage_path ?? null,
        uploaded_file_name: data.uploaded_file_name ?? null,
      };

      setPhoneUploadSession(nextSession);

      if (nextSession.status === "completed") {
        stopPhoneUploadPolling();
        setPhoneUploadStatusMessage(
          `${formatPhoneUploadTargetLabel(phoneUploadTarget)} uploaded. Refreshing list…`
        );
        await handlePhoneUploadCompleted(phoneUploadTarget, nextSession);
        window.setTimeout(() => {
          setIsPhoneUploadModalOpen(false);
          setPhoneUploadTarget(null);
          resetPhoneUploadState();
        }, 900);
        return;
      }

      if (
        nextSession.status === "expired" ||
        nextSession.status === "cancelled" ||
        new Date(nextSession.expires_at).getTime() <= Date.now()
      ) {
        stopPhoneUploadPolling();
        setPhoneUploadStatusMessage("This phone upload session has expired. Generate a new QR code.");
      }
    };

    void pollSession();
    phoneUploadPollTimerRef.current = window.setInterval(
      () => void pollSession(),
      MOBILE_UPLOAD_SESSION_POLL_MS
    );

    return () => {
      stopPhoneUploadPolling();
    };
  }, [
    handlePhoneUploadCompleted,
    isPhoneUploadModalOpen,
    phoneUploadSession,
    phoneUploadTarget,
    resetPhoneUploadState,
    stopPhoneUploadPolling,
  ]);

  return {
    isPhoneUploadModalOpen,
    phoneUploadTarget,
    phoneUploadSession,
    isCreatingPhoneUploadSession,
    phoneUploadStatusMessage,
    phoneUploadQrCodeUrl,
    phoneUploadCopied,
    phoneUploadNow,
    handleClosePhoneUpload,
    handleOpenPhoneUpload,
    handleRefreshPhoneUpload,
    handleCopyPhoneUploadLink,
  };
}
