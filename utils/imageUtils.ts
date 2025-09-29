/**
 * Takes an image data URL, identifies the background color(s) (handles solid and checkerboard),
 * and returns a new data URL for a PNG with those colors made transparent.
 * @param imageUrl The data URL of the image to process.
 * @param tolerance A value from 0-255 to determine how close a color needs to be to the background color to be removed.
 * @returns A promise that resolves with the data URL of the processed image.
 */
export function makeBackgroundTransparent(imageUrl: string, tolerance: number = 20): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context.'));
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // --- Color Identification ---
            const colorsToRemove: { r: number; g: number; b: number }[] = [];
            
            // 1. Get the top-left corner pixel color as the primary background color.
            const color1 = { r: data[0], g: data[1], b: data[2] };
            colorsToRemove.push(color1);

            // 2. Scan the top row to find a second, different color for checkerboard patterns.
            for (let i = 4; i < canvas.width * 4; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                if (Math.abs(r - color1.r) > tolerance || Math.abs(g - color1.g) > tolerance || Math.abs(b - color1.b) > tolerance) {
                    const color2 = { r, g, b };
                    colorsToRemove.push(color2);
                    break; 
                }
            }

            // --- Pixel Processing ---
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Check if the current pixel matches any of the identified background colors.
                for (const color of colorsToRemove) {
                    const distance = Math.sqrt(
                        Math.pow(r - color.r, 2) +
                        Math.pow(g - color.g, 2) +
                        Math.pow(b - color.b, 2)
                    );

                    if (distance < tolerance) {
                        data[i + 3] = 0; // Set alpha to 0 (transparent)
                        break; // Move to the next pixel
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            reject(new Error(`Failed to load image for transparency processing: ${err}`));
        };
        img.src = imageUrl;
    });
}
