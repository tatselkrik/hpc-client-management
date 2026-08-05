import {
  formatFileSize,
  MAX_PROFILE_PICTURE_BYTES,
  PROFILE_PICTURE_COMPRESSION_QUALITY,
  PROFILE_PICTURE_MAX_DIMENSION,
  PROFILE_PICTURE_OUTPUT_TYPE,
} from "../../appShared";

export type PreparedProfilePicture = {
  file: File;
  originalSize: number;
  uploadedSize: number;
  width: number;
  height: number;
  wasOptimized: boolean;
};

const loadImageElementFromFile = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected image."));
    };

    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to optimize the selected image."));
        }
      },
      type,
      quality
    );
  });

export const createOptimizedProfilePicture = async (
  file: File
): Promise<PreparedProfilePicture> => {
  const image = await loadImageElementFromFile(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  if (!sourceWidth || !sourceHeight) {
    throw new Error("Unable to read the selected image dimensions.");
  }

  const scale = Math.min(
    1,
    PROFILE_PICTURE_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight)
  );
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to prepare the selected image.");
  }

  context.drawImage(image, 0, 0, width, height);

  const qualitySteps = [PROFILE_PICTURE_COMPRESSION_QUALITY, 0.74, 0.66, 0.58];

  let optimizedBlob: Blob | null = null;

  for (const quality of qualitySteps) {
    const blob = await canvasToBlob(canvas, PROFILE_PICTURE_OUTPUT_TYPE, quality);
    optimizedBlob = blob;

    if (blob.size <= MAX_PROFILE_PICTURE_BYTES) {
      break;
    }
  }

  if (!optimizedBlob) {
    throw new Error("Unable to optimize the selected image.");
  }

  if (optimizedBlob.size > MAX_PROFILE_PICTURE_BYTES) {
    throw new Error(
      `The optimized profile picture is still larger than ${formatFileSize(
        MAX_PROFILE_PICTURE_BYTES
      )}. Choose a smaller image.`
    );
  }

  const safeBaseName =
    file.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "profile-picture";

  const outputType = optimizedBlob.type || PROFILE_PICTURE_OUTPUT_TYPE;
  const outputExtension =
    outputType === "image/png" ? "png" : outputType === "image/jpeg" ? "jpg" : "webp";
  const optimizedFile = new File([optimizedBlob], `${safeBaseName}.${outputExtension}`, {
    type: outputType,
    lastModified: Date.now(),
  });

  return {
    file: optimizedFile,
    originalSize: file.size,
    uploadedSize: optimizedBlob.size,
    width,
    height,
    wasOptimized:
      file.type !== outputType ||
      file.size !== optimizedBlob.size ||
      width !== sourceWidth ||
      height !== sourceHeight,
  };
};
