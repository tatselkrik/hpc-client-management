// Deployment artwork is injected at build time; public builds remain generic.
export const CLINIC_LOGO_URL = import.meta.env.VITE_CLINIC_LOGO_URL || "/hpc-logo.svg";
export const CLINIC_ICON_URL = import.meta.env.VITE_CLINIC_ICON_URL || "/hpc-icon.svg";
