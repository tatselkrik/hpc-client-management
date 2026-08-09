export type Profile = {
  id: string;
  full_name: string | null;
  role: string;
  email?: string | null;
  avatar_path?: string | null;
  avatar_url?: string | null;
  hpc_representative_name?: string | null;
  is_active?: boolean | null;
};

export type CareTeamInviteForm = {
  full_name: string;
  email: string;
  role: string;
  hpc_representative_name: string;
};

export type CareTeamMemberView = {
  id: string;
  full_name: string;
  email?: string | null;
  role: string;
  avatar_url?: string | null;
  hpc_representative_name?: string | null;
  is_main_admin?: boolean;
};

export type MfaFactor = {
  id: string;
  factor_type: string;
  status: string;
  friendly_name: string | null;
  phone: string | null;
  created_at: string | null;
};

export type MfaEnrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
  friendlyName: string;
};

export type AuthenticatorAssuranceLevel = "aal1" | "aal2" | null;

export type AuthenticatorAssuranceState = {
  currentLevel: AuthenticatorAssuranceLevel;
  nextLevel: AuthenticatorAssuranceLevel;
};
