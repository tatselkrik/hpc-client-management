import { useRef, useState } from "react";

export function useProfileAccountState() {
  const [profileNameInput, setProfileNameInput] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileEmailInput, setProfileEmailInput] = useState("");
  const [profileCurrentPasswordInput, setProfileCurrentPasswordInput] = useState("");
  const [profileEmailMessage, setProfileEmailMessage] = useState("");
  const [profilePasswordCurrentInput, setProfilePasswordCurrentInput] = useState("");
  const [profilePasswordNewInput, setProfilePasswordNewInput] = useState("");
  const [profilePasswordConfirmInput, setProfilePasswordConfirmInput] = useState("");
  const [profilePasswordMessage, setProfilePasswordMessage] = useState("");
  const [profileEmailMfaCodeInput, setProfileEmailMfaCodeInput] = useState("");
  const [profilePasswordMfaCodeInput, setProfilePasswordMfaCodeInput] = useState("");
  const [profilePictureMessage, setProfilePictureMessage] = useState("");

  const [isProfileSavingName, setIsProfileSavingName] = useState(false);
  const [isProfileSavingEmail, setIsProfileSavingEmail] = useState(false);
  const [isProfileSavingPassword, setIsProfileSavingPassword] = useState(false);
  const [isProfileSavingPicture, setIsProfileSavingPicture] = useState(false);

  const profilePictureInputRef = useRef<HTMLInputElement | null>(null);

  const resetProfileAccountState = () => {
    setProfileEmailInput("");
    setProfileCurrentPasswordInput("");
    setProfileEmailMessage("");
    setProfilePasswordCurrentInput("");
    setProfilePasswordNewInput("");
    setProfilePasswordConfirmInput("");
    setProfilePasswordMessage("");
    setProfileEmailMfaCodeInput("");
    setProfilePasswordMfaCodeInput("");
    setProfilePictureMessage("");
    setProfileMessage("");
    setIsProfileSavingName(false);
    setIsProfileSavingEmail(false);
    setIsProfileSavingPassword(false);
    setIsProfileSavingPicture(false);
  };

  return {
    profileNameInput,
    setProfileNameInput,
    profileMessage,
    setProfileMessage,
    profileEmailInput,
    setProfileEmailInput,
    profileCurrentPasswordInput,
    setProfileCurrentPasswordInput,
    profileEmailMessage,
    setProfileEmailMessage,
    profilePasswordCurrentInput,
    setProfilePasswordCurrentInput,
    profilePasswordNewInput,
    setProfilePasswordNewInput,
    profilePasswordConfirmInput,
    setProfilePasswordConfirmInput,
    profilePasswordMessage,
    setProfilePasswordMessage,
    profileEmailMfaCodeInput,
    setProfileEmailMfaCodeInput,
    profilePasswordMfaCodeInput,
    setProfilePasswordMfaCodeInput,
    profilePictureMessage,
    setProfilePictureMessage,
    isProfileSavingName,
    setIsProfileSavingName,
    isProfileSavingEmail,
    setIsProfileSavingEmail,
    isProfileSavingPassword,
    setIsProfileSavingPassword,
    isProfileSavingPicture,
    setIsProfileSavingPicture,
    profilePictureInputRef,
    resetProfileAccountState,
  };
}
