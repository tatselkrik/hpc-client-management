import { useCallback, useState } from "react";

import type { ChildForm, ClientForm } from "../../appShared";
import {
  buildSiblingOrder,
  emptyChildForm,
  emptyClientForm,
  parseSiblingOrder,
} from "../../appShared";

export function useClientForm() {
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm());
  const [childrenForms, setChildrenForms] = useState<ChildForm[]>([]);

  const resetClientForm = useCallback(() => {
    setClientForm(emptyClientForm());
    setChildrenForms([]);
  }, []);

  const updateClientForm = useCallback(
    <K extends keyof ClientForm>(field: K, value: ClientForm[K]) => {
      setClientForm((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const updateSiblingOrderPart = useCallback(
    (part: "position" | "total", rawValue: string) => {
      const cleanValue = rawValue.replace(/\D/g, "");
      const { position, total } = parseSiblingOrder(clientForm.sibling_order);

      updateClientForm(
        "sibling_order",
        buildSiblingOrder(
          part === "position" ? cleanValue : position,
          part === "total" ? cleanValue : total
        )
      );
    },
    [clientForm.sibling_order, updateClientForm]
  );

  const toggleCounsellingReason = useCallback((reason: string) => {
    setClientForm((prev) => {
      const isSelected = prev.counselling_reasons.includes(reason);

      return {
        ...prev,
        counselling_reasons: isSelected
          ? prev.counselling_reasons.filter((item) => item !== reason)
          : [...prev.counselling_reasons, reason],
      };
    });
  }, []);

  const addChildRow = useCallback(() => {
    setChildrenForms((prev) => [...prev, emptyChildForm()]);
  }, []);

  const updateChildRow = useCallback(
    <K extends keyof ChildForm>(index: number, field: K, value: ChildForm[K]) => {
      setChildrenForms((prev) =>
        prev.map((child, i) =>
          i === index ? { ...child, [field]: value } : child
        )
      );
    },
    []
  );

  const removeChildRow = useCallback((index: number) => {
    setChildrenForms((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    clientForm,
    setClientForm,
    childrenForms,
    setChildrenForms,
    resetClientForm,
    updateClientForm,
    updateSiblingOrderPart,
    toggleCounsellingReason,
    addChildRow,
    updateChildRow,
    removeChildRow,
  };
}
