import { GoogleGenAI, Modality } from "@google/genai";
import { PRESET_PROMPTS } from '../constants';
import { makeBackgroundTransparent } from "../utils/imageUtils";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

async function callGeminiForImage(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ imageUrl: string; mimeType: string } | null> {
  try {
    const config: {
        responseModalities: Modality[];
        systemInstruction?: string;
    } = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    };

    if (systemInstruction && systemInstruction.trim() !== '') {
        config.systemInstruction = systemInstruction;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: config,
    });

    // Handle cases where the prompt was blocked or no candidates were returned.
    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Request was blocked: ${response.promptFeedback.blockReason}. Please adjust your prompt or image.`);
      }
      throw new Error("The model did not return any content. Please try a different prompt.");
    }
    
    const candidate = response.candidates[0];
    const imagePart = candidate.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      const restoredBase64 = imagePart.inlineData.data;
      const restoredMimeType = imagePart.inlineData.mimeType;
      return {
        imageUrl: `data:${restoredMimeType};base64,${restoredBase64}`,
        mimeType: restoredMimeType,
      };
    }
    
    // If no image is found, check for a text response to provide a more specific error.
    const textResponse = response.text.trim();
    if (textResponse) {
      throw new Error(`Model returned text instead of an image: "${textResponse}"`);
    }

    // This is a fallback. The user will see the generic "did not return an image" message from App.tsx.
    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
             throw new Error(`QUOTA_EXCEEDED: You have exceeded your API quota. To prevent further errors, the process button will be disabled for 60 seconds.`);
        }
        // Let our custom, more informative errors pass through without being re-wrapped.
        if (error.message.startsWith('Request was blocked') || 
            error.message.startsWith('The model did not return') || 
            error.message.startsWith('Model returned text')) {
            throw error;
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}

export async function fillPhoto(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  base64MaskData: string,
  systemInstruction?: string
): Promise<{ imageUrl: string; mimeType: string } | null> {
  try {
    const maskDataOnly = base64MaskData.split(',')[1];

    // Create a more specific prompt for the inpainting task.
    // This guides the model to blend with surroundings rather than replacing objects.
    const inpaintingPrompt = `Inpaint the masked area based on the following instruction: "${prompt}". Blend the result seamlessly with the surrounding image, matching texture, lighting, and color. Focus on filling the area naturally, not adding new, distinct objects unless the prompt explicitly asks for them.`;
    
    const config: {
        responseModalities: Modality[];
        systemInstruction?: string;
    } = {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
    };

    if (systemInstruction && systemInstruction.trim() !== '') {
        config.systemInstruction = systemInstruction;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: inpaintingPrompt,
          },
          {
            inlineData: {
                data: maskDataOnly,
                mimeType: 'image/png',
            },
          }
        ],
      },
      config: config,
    });

    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
        throw new Error(`Request was blocked: ${response.promptFeedback.blockReason}. Please adjust your prompt or image.`);
      }
      throw new Error("The model did not return any content. Please try a different prompt.");
    }
    
    const candidate = response.candidates[0];
    const imagePart = candidate.content?.parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      const restoredBase64 = imagePart.inlineData.data;
      const restoredMimeType = imagePart.inlineData.mimeType;
      return {
        imageUrl: `data:${restoredMimeType};base64,${restoredBase64}`,
        mimeType: restoredMimeType,
      };
    }
    
    const textResponse = response.text.trim();
    if (textResponse) {
      throw new Error(`Model returned text instead of an image: "${textResponse}"`);
    }

    return null;

  } catch (error) {
    console.error("Error calling Gemini API for fill:", error);
    if (error instanceof Error) {
        if (error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
             throw new Error(`QUOTA_EXCEEDED: You have exceeded your API quota. To prevent further errors, the process button will be disabled for 60 seconds.`);
        }
        if (error.message.startsWith('Request was blocked') || 
            error.message.startsWith('The model did not return') || 
            error.message.startsWith('Model returned text')) {
            throw error;
        }
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the Gemini API.");
  }
}

export async function animatePhoto(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  onProgress: (message: string) => void,
  aspectRatio: string
): Promise<{ videoUrl: string; mimeType: string } | null> {
  onProgress("Initializing animation...");

  const MAX_ATTEMPTS = 3;
  let operation;

  // --- Phase 1: Initiate video generation with retries for quota errors ---
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      operation = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt,
        image: {
          imageBytes: base64ImageData,
          mimeType: mimeType,
        },
        config: {
          numberOfVideos: 1,
          aspectRatio: aspectRatio,
        },
      });
      // If successful, break the loop and proceed
      break;
    } catch (error: any) {
      const isQuotaError =
        error.message.includes('quota') ||
        error.message.includes('RESOURCE_EXHAUSTED');

      if (isQuotaError && attempt < MAX_ATTEMPTS) {
        onProgress(
          `API rate limit hit. Waiting 60s to retry... (${attempt}/${
            MAX_ATTEMPTS - 1
          })`
        );
        await new Promise((resolve) => setTimeout(resolve, 60000));
      } else {
        // Not a quota error or max attempts reached, rethrow to be handled by the UI
        console.error(`Error on attempt ${attempt} calling Gemini Video API:`, error);
        if (isQuotaError) {
          throw new Error(
            `QUOTA_EXCEEDED: Failed to start after ${MAX_ATTEMPTS} attempts due to API limits. Please wait a bit longer before trying again.`
          );
        }
        if (error instanceof Error) {
          throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error(
          'An unknown error occurred while communicating with the Gemini API.'
        );
      }
    }
  }

  if (!operation) {
    // This case should not be reached if the loop logic is correct, but it's a safeguard.
    throw new Error('Failed to initiate video generation after multiple attempts.');
  }

  // --- Phase 2: Poll for results and download the video ---
  try {
    onProgress('Your request is being processed. This can take several minutes...');
    let checks = 0;
    let pollDelay = 10000; // Start with 10 seconds

    while (!operation.done) {
      await new Promise((resolve) => setTimeout(resolve, pollDelay));

      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });

        // Polling was successful, slightly increase delay for next time to be conservative
        pollDelay = Math.min(pollDelay + 2000, 30000); // Increase by 2s, up to a max of 30s

        checks++;
        if (checks > 2 && checks < 7) {
          // After ~30s
          onProgress("Still working... High-quality video takes time.");
        } else if (checks >= 7) {
          onProgress("This is taking longer than usual, but we're still on it!");
        }
      } catch (error: any) {
        if (
          error.message.includes('quota') ||
          error.message.includes('RESOURCE_EXHAUSTED')
        ) {
          // Hit quota during polling, wait a full minute and try again.
          pollDelay = 60000;
          onProgress(
            'API rate limit reached during polling. Waiting for quota to reset before checking status again...'
          );
          // The loop will continue, and the next check will be after the new, longer delay.
        } else {
          // A different, non-recoverable error occurred during polling.
          throw error;
        }
      }
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error(
        'Video generation completed, but no video URL was returned.'
      );
    }

    onProgress('Finalizing video... Almost there!');
    const response = await fetch(`${downloadLink}&key=${API_KEY}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to download video: ${response.statusText}. Server said: ${errorText}`
      );
    }
    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);

    return {
      videoUrl: videoUrl,
      mimeType: 'video/mp4',
    };
  } catch (error) {
    console.error('Error during video polling/download:', error);
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while fetching the generated video.');
  }
}


export async function restorePhoto(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  systemInstruction?: string
): Promise<{ imageUrl: string; mimeType: string } | null> {
  const removeBgPrompt = PRESET_PROMPTS.find(p => p.id === 'retouch_remove_background')?.prompt;
  const isRemoveBg = prompt === removeBgPrompt;
  let effectiveSystemInstruction = systemInstruction;

  // For the specific task of removing the background, we use a highly specific system
  // instruction to ensure the model produces a PNG with a proper alpha channel,
  // overriding any user-defined general instructions that might conflict.
  if (isRemoveBg) {
    effectiveSystemInstruction = "Your function is to perform image segmentation. For the given image, identify the primary subject and isolate it. Your output must be a PNG image where the background is fully transparent (alpha channel value of 0). The subject's edges should be clean and anti-aliased against the transparency. Do not create a visual pattern like a checkerboard to represent transparency; the background pixels must be transparent.";
  }
  
  const result = await callGeminiForImage(base64ImageData, mimeType, prompt, effectiveSystemInstruction);

  if (result && isRemoveBg) {
    try {
        const transparentImageUrl = await makeBackgroundTransparent(result.imageUrl);
        return { ...result, imageUrl: transparentImageUrl };
    } catch (e) {
        console.error("Client-side transparency processing failed:", e);
        // Fallback to returning the original result from the model if post-processing fails
        return result;
    }
  }

  return result;
}