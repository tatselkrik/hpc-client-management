/// <reference types="vite/client" />

declare module "qrcode" {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: "low" | "medium" | "quartile" | "high" | "L" | "M" | "Q" | "H";
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
    type?: string;
    rendererOpts?: Record<string, unknown>;
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;
}
