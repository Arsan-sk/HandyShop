/**
 * Media optimization and compression helpers
 */

/**
 * Compress an image file using client-side HTML5 Canvas.
 * Resizes the image to fit maxWidth/maxHeight and compresses quality to 80%.
 */
export function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve) => {
    // If browser doesn't support canvas or it's not an image, return original
    if (typeof window === "undefined" || !file.type.startsWith("image/")) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Keep aspect ratio while resizing
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Create a new File from the blob
            const compressedFile = new File([blob], file.name, {
              type: file.type || "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          file.type || "image/jpeg",
          quality
        );
      };
      
      img.onerror = () => resolve(file);
    };
    
    reader.onerror = () => resolve(file);
  });
}

/**
 * Validate video length and format constraints.
 * Shows alerts or checks dimensions for QuickLook vertical video rules.
 */
export function validateVideoRequirements(
  file: File,
  maxDurationSeconds = 60
): Promise<{ valid: boolean; error?: string; duration?: number; isVertical?: boolean }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video/")) {
      return resolve({ valid: false, error: "Not a valid video format" });
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      const duration = video.duration;
      const isVertical = video.videoHeight > video.videoWidth;
      
      if (duration > maxDurationSeconds) {
        return resolve({
          valid: false,
          error: `Video exceeds the maximum limit of ${maxDurationSeconds} seconds.`,
          duration,
          isVertical
        });
      }
      
      resolve({
        valid: true,
        duration,
        isVertical
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve({ valid: false, error: "Failed to parse video metadata" });
    };
  });
}
