export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function cropImageToBlob(
  imageSrc: string,
  croppedAreaPixels: CropArea,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      const outputSize = 512;
      canvas.width = outputSize;
      canvas.height = outputSize;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        outputSize,
        outputSize,
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Canvas toBlob failed"));
          }
        },
        "image/webp",
        0.9,
      );
    };

    image.onerror = () => reject(new Error("Failed to load image for cropping"));
  });
}
