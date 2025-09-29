


import React, { useState, useCallback, useEffect } from 'react';
import { ResultItem, ComparisonMode, PromptMode, BatchItem, AppMode, LoadedPreset, AspectRatio } from './types';
import { restorePhoto, animatePhoto, fillPhoto } from './services/geminiService';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
// Fix: Import IMAGINATION_PRESET_PROMPTS to correctly check against all preset prompts.
import { PRESET_PROMPTS, IMAGINATION_PRESET_PROMPTS, ANIMATION_PRESET_PROMPTS } from './constants';
import SettingsModal from './components/SettingsModal';
import UpscalingModal from './components/UpscalingModal';
import DownloadModal from './components/DownloadModal';
import WelcomeModal from './components/WelcomeModal';
import { useTranslations } from './hooks/useTranslations';

declare const piexif: any;

interface ImageState {
  dataUrl: string;
  mimeType: string;
}

const COOLDOWN_SECONDS = 60;

const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = (err) => {
          console.error("Failed to load image for dimension check", err);
          reject(new Error("Failed to get image dimensions."));
      }
      img.src = dataUrl;
    });
};

// Renamed from parseCsv to be more generic
const parsePromptFile = (fileText: string): LoadedPreset[] => {
    const rows: LoadedPreset[] = [];
    const lines = fileText.trim().replace(/\r/g, '').split('\n'); // Normalize line endings
    if (lines.length < 2) {
      if (!lines[0] || lines[0].trim() === '') return []; // Empty file
      // Otherwise, fall through to header check for single-line files
    }

    // Remove BOM (Byte Order Mark) if present, common in files from Excel
    if (lines[0].charCodeAt(0) === 0xFEFF) {
        lines[0] = lines[0].substring(1);
    }
    
    // Simple header parsing
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const idIndex = headers.indexOf('id');
    const promptIndex = headers.indexOf('prompt');
    const displayNameIndex = headers.indexOf('displayName');
    const categoryIndex = headers.indexOf('category');

    if (idIndex === -1 || promptIndex === -1 || displayNameIndex === -1 || categoryIndex === -1) {
        console.error("File headers are missing required columns. Found:", headers.join(', '));
        throw new Error("Headers must include 'category', 'id', 'displayName', and 'prompt'.");
    }

    for (let i = 1; i < lines.length; i++) {
        // This is a simple parser and may not handle all CSV edge cases (e.g., newlines within quotes).
        // It assumes a clean structure where prompts with commas are quoted.
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (values.length === 0) continue; // Skip empty lines

        const cleanValues = values.map(v => v.trim().replace(/^"|"$/g, ''));

        const rowObject: { [key: string]: string } = {};
        headers.forEach((header, index) => {
            rowObject[header] = cleanValues[index] || '';
        });

        const category = rowObject['category'] as PromptMode;
        const id = rowObject['id'];
        const prompt = rowObject['prompt'];
        const displayName = rowObject['displayName'];
        
        if(category && id && prompt && displayName) {
            rows.push({
                category,
                id,
                prompt,
                displayName,
            });
        }
    }
    return rows;
};


const App: React.FC = () => {
  const t = useTranslations();
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [processingImage, setProcessingImage] = useState<ImageState | null>(null);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isUpscaling, setIsUpscaling] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('slider');
  const [error, setError] = useState<string | null>(null);
  const [promptMode, setPromptMode] = useState<PromptMode>('retouch');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [beforeImageDimensions, setBeforeImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [afterImageDimensions, setAfterImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isMasking, setIsMasking] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [quotaCooldownEnd, setQuotaCooldownEnd] = useState<number | null>(null);
  const [timeNow, setTimeNow] = useState(() => Date.now());
  const [downloadModalState, setDownloadModalState] = useState<{
    isOpen: boolean;
    result: ResultItem | null;
    isUpscaling: boolean;
  }>({ isOpen: false, result: null, isUpscaling: false });
  const [appMode, setAppMode] = useState<AppMode>('single');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [loadedPresets, setLoadedPresets] = useState<Record<PromptMode, LoadedPreset[]>>({ retouch: [], imagination: [], animation: [] });
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [animationAspectRatio, setAnimationAspectRatio] = useState<AspectRatio>('16:9');

  const [customPrompts, setCustomPrompts] = useState(() => {
    try {
      const savedPrompts = localStorage.getItem('customPrompts');
      if (savedPrompts) {
        const parsed = JSON.parse(savedPrompts);
        if (Array.isArray(parsed)) {
          return { retouch: parsed, imagination: [], animation: [] };
        } else {
          return { 
            retouch: parsed.retouch || [], 
            imagination: parsed.imagination || parsed.reimagine || [],
            animation: parsed.animation || [] 
          };
        }
      }
    } catch (e) {
      console.error("Failed to load custom prompts from localStorage", e);
    }
    return { retouch: [], imagination: [], animation: [] };
  });

  const [systemInstruction, setSystemInstruction] = useState<string>('');
  const [stylesUrl, setStylesUrl] = useState<string>('');


  useEffect(() => {
    try {
      const hasSeenWelcome = localStorage.getItem('hasSeenWelcomeModal');
      if (!hasSeenWelcome) {
        setIsWelcomeModalOpen(true);
      }
    } catch (e) {
      console.error("Failed to check for welcome modal status in localStorage", e);
    }
    
    // Load persisted state once on mount
    try {
      const savedInstruction = localStorage.getItem('systemInstruction');
      if (savedInstruction) {
        setSystemInstruction(savedInstruction);
      }
      const savedStylesUrl = localStorage.getItem('stylesUrl');
      if (savedStylesUrl) {
        setStylesUrl(savedStylesUrl);
      }
    } catch(e) {
      console.error("Failed to load persisted settings from localStorage", e);
    }

  }, []);
  
  useEffect(() => {
    let timer: number | undefined;
    if (quotaCooldownEnd && timeNow < quotaCooldownEnd) {
      timer = setInterval(() => setTimeNow(Date.now()), 1000) as unknown as number;
    } else if (quotaCooldownEnd && timeNow >= quotaCooldownEnd) {
      // Cooldown is over, reset it.
      setQuotaCooldownEnd(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [quotaCooldownEnd, timeNow]);

  useEffect(() => {
    try {
      localStorage.setItem('systemInstruction', systemInstruction);
    } catch (e) {
      console.error("Failed to save system instruction to localStorage", e);
    }
  }, [systemInstruction]);
  
  useEffect(() => {
    try {
      localStorage.setItem('stylesUrl', stylesUrl);
    } catch (e) {
      console.error("Failed to save styles URL to localStorage", e);
    }
  }, [stylesUrl]);

  const handleSystemInstructionChange = (value: string) => {
    setSystemInstruction(value);
  };

  const handleStylesUrlChange = (value: string) => {
    setStylesUrl(value);
  };

  const handleLoadStyles = async () => {
    if (!stylesUrl || stylesUrl.trim() === '') {
        setError("Please set a valid Prompts File URL in the Settings.");
        setIsSettingsOpen(true);
        return;
    }
    setIsLoading(true);
    setLoadingMessage("Loading external prompts...");
    setError(null);

    try {
        const response = await fetch(stylesUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file. Status: ${response.status}. Please check the URL and permissions.`);
        }
        const fileText = await response.text();

        if (fileText.trim().toLowerCase().startsWith('<!doctype html') || fileText.trim().startsWith('<html')) {
            throw new Error("The URL returned a web page, not a raw file. Please use a direct link to the file content. For Google Sheets, use the 'File > Share > Publish to the web' option.");
        }
        
        const parsedData = parsePromptFile(fileText);

        const categorizedPresets: Record<PromptMode, LoadedPreset[]> = {
            retouch: [],
            imagination: [],
            animation: [],
        };

        parsedData.forEach(item => {
            const category = item.category;
            if (categorizedPresets[category]) {
                categorizedPresets[category].push(item);
            }
        });
        
        setLoadedPresets(categorizedPresets);
        alert(t.promptsLoadedSuccess.replace('{count}', parsedData.length.toString()));

    } catch (e: any) {
        console.error("Failed to load or parse prompts file:", e);
        let errorMessage = `Could not load prompts. ${e.message || 'Check the URL, file format, and sharing permissions.'}`;
        
        // This specific error indicates a CORS problem, which is common with incorrect Google Drive links.
        if (e instanceof TypeError && e.message === 'Failed to fetch') {
            errorMessage = "Failed to fetch the URL due to browser security policies (CORS). The server must allow cross-origin requests. Please use a direct 'raw' file link. For Google Drive/Sheets, the only reliable method is to use 'File > Share > Publish to the web' and use the generated link.";
        }
        
        setError(errorMessage);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const updateAndSelectResult = useCallback(async (result: ResultItem | null) => {
      setSelectedResult(result);
      
      if (!result) {
          setBeforeImageDimensions(null);
          setAfterImageDimensions(null);
          setImageDimensions(null);
          return;
      }
      
      const beforeUrl = result.sourceImageUrl ?? originalImage?.dataUrl ?? null;
      const afterUrl = result.imageUrl;

      try {
          const beforeDims = beforeUrl ? await getImageDimensions(beforeUrl) : null;
          // For videos, the 'after' dimensions are the same as the source thumbnail.
          const afterDims = (afterUrl && !result.videoUrl) ? await getImageDimensions(afterUrl) : beforeDims;
          setBeforeImageDimensions(beforeDims);
          setAfterImageDimensions(afterDims);
          setImageDimensions(afterDims ?? beforeDims);
      } catch (e) {
          setError("Could not load image properties.");
          setBeforeImageDimensions(null);
          setAfterImageDimensions(null);
          setImageDimensions(null);
      }
  }, [originalImage?.dataUrl]);

  const saveCustomPrompts = (prompts: { retouch: string[], imagination: string[], animation: string[] }) => {
    try {
      localStorage.setItem('customPrompts', JSON.stringify(prompts));
    } catch (e) {
      console.error("Failed to save custom prompts to localStorage", e);
    }
  };

  const addCustomPrompt = (newPrompt: string) => {
    // Fix: Correctly check if the new prompt is already in the preset prompts by mapping the presets to strings.
    const allPresetPrompts = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS, ...ANIMATION_PRESET_PROMPTS].map(p => p.prompt);
    if (newPrompt && !customPrompts[promptMode].includes(newPrompt) && !allPresetPrompts.includes(newPrompt)) {
      const updatedPrompts = {
        ...customPrompts,
        [promptMode]: [...customPrompts[promptMode], newPrompt]
      };
      setCustomPrompts(updatedPrompts);
      saveCustomPrompts(updatedPrompts);
    }
  };

  const deleteCustomPrompt = (promptToDelete: string) => {
    const updatedPrompts = {
      ...customPrompts,
      [promptMode]: customPrompts[promptMode].filter(p => p !== promptToDelete)
    };
    setCustomPrompts(updatedPrompts);
    saveCustomPrompts(updatedPrompts);
  };
  
  const handleClearAll = useCallback(() => {
    setOriginalImage(null);
    setProcessingImage(null);
    setResults([]);
    setSelectedResult(null);
    setError(null);
    setPrompt('');
    setImageDimensions(null);
    setBeforeImageDimensions(null);
    setAfterImageDimensions(null);
    setPromptMode('retouch');
    setComparisonMode('slider');
    setQuotaCooldownEnd(null);
    setIsEditing(false);
    setIsMasking(false);
  }, []);

  const handleImageUpload = async (imageDataUrl: string, mimeType: string) => {
    handleClearAll();
    const imageState = { dataUrl: imageDataUrl, mimeType };
    setOriginalImage(imageState);
    setProcessingImage(imageState);
    
    const originalResult: ResultItem = {
        id: `original-${Date.now()}`,
        imageUrl: imageDataUrl,
        mimeType: mimeType,
        prompt: "Original Image",
        sourceImageUrl: imageDataUrl,
    };
    setResults([originalResult]);
    await updateAndSelectResult(originalResult);
  };

  const handleFilesSelected = async (files: File[]) => {
    if (appMode === 'single') {
        if (!files.length) return;
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            handleImageUpload(result, file.type);
        };
        reader.readAsDataURL(file);
    } else {
        const newBatchItems: BatchItem[] = await Promise.all(
            files.map(async (file, index) => {
                const dataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                return {
                    id: `batch-${Date.now()}-${index}`,
                    file: file,
                    originalDataUrl: dataUrl,
                    mimeType: file.type,
                    processedDataUrl: null,
                    status: 'pending',
                };
            })
        );
        setBatchItems(prev => [...prev, ...newBatchItems]);
    }
  };
  
  const handleStartBatch = async () => {
    if (isBatchProcessing || !batchItems.some(item => item.status === 'pending')) return;

    setIsBatchProcessing(true);
    setError(null);
    
    const itemsToProcess = batchItems.filter(item => item.status === 'pending');

    for (const item of itemsToProcess) {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));
        
        try {
            const base64Data = item.originalDataUrl.split(',')[1];
            const result = await restorePhoto(base64Data, item.mimeType, prompt, systemInstruction);

            if (result) {
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'completed', processedDataUrl: result.imageUrl } : i));
            } else {
                throw new Error('The model did not return an image.');
            }
        } catch (err: any) {
            console.error(`Error processing ${item.file.name}:`, err);
            const errorMessage = (err.message || 'Unknown error').replace('QUOTA_EXCEEDED: ', '');
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: errorMessage } : i));
            if (err.message.startsWith('QUOTA_EXCEEDED:')) {
              setQuotaCooldownEnd(Date.now() + COOLDOWN_SECONDS * 1000);
              break; // Stop batch on quota error
            }
        }
    }

    setIsBatchProcessing(false);
  };

  const handleRemoveBatchItem = (id: string) => {
    setBatchItems(prev => prev.filter(item => item.id !== id));
  };
  
  const handleClearBatch = () => {
      setBatchItems([]);
      setIsBatchProcessing(false);
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadBatchResults = () => {
    const completedItems = batchItems.filter(item => item.status === 'completed' && item.processedDataUrl);
    if (!completedItems.length) return;

    completedItems.forEach(item => {
        if (item.processedDataUrl) {
            const originalName = item.file.name.split('.').slice(0, -1).join('.');
            const extension = item.mimeType.split('/')[1] || 'png';
            const newFilename = `${originalName}-restored.${extension}`;
            downloadDataUrl(item.processedDataUrl, newFilename);
        }
    });
  };

  const handleRestore = useCallback(async () => {
    if (!processingImage || isLoading || (quotaCooldownEnd && Date.now() < quotaCooldownEnd)) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const base64Data = processingImage.dataUrl.split(',')[1];
      
      if (promptMode === 'animation') {
        setLoadingMessage("Initializing animation...");
        const result = await animatePhoto(base64Data, processingImage.mimeType, prompt, setLoadingMessage, animationAspectRatio);

        if (result) {
          const newResult: ResultItem = {
            id: `res-${Date.now()}`,
            imageUrl: processingImage.dataUrl, // Use source image as thumbnail
            videoUrl: result.videoUrl,
            mimeType: result.mimeType,
            prompt: prompt,
            sourceImageUrl: processingImage.dataUrl,
          };
          setResults(prev => [newResult, ...prev]);
          await updateAndSelectResult(newResult);
        } else {
          throw new Error('The model did not return a video. Please try a different prompt.');
        }

      } else { // Retouch or Imagination
        setLoadingMessage(''); // Reset for image processing.
        const result = await restorePhoto(base64Data, processingImage.mimeType, prompt, systemInstruction);

        if (result) {
          const newResult: ResultItem = {
            id: `res-${Date.now()}`,
            imageUrl: result.imageUrl,
            mimeType: result.mimeType,
            prompt: prompt,
            sourceImageUrl: processingImage.dataUrl,
          };
          
          setResults(prev => {
              const updatedResults = [newResult, ...prev];
              return updatedResults.length > 15 ? updatedResults.slice(0, 15) : updatedResults;
          });
          setProcessingImage({ dataUrl: newResult.imageUrl, mimeType: newResult.mimeType });
          await updateAndSelectResult(newResult);

        } else {
          throw new Error('The model did not return an image. Please try a different prompt.');
        }
      }
      
      if (comparisonMode === 'single') {
          setComparisonMode('slider');
      }

    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred.';
      // Display the user-facing part of the error, and trigger cooldown if it's a quota error.
      setError(errorMessage.replace('QUOTA_EXCEEDED: ', ''));
      console.error(err);
      if (errorMessage.startsWith('QUOTA_EXCEEDED:')) {
        setQuotaCooldownEnd(Date.now() + COOLDOWN_SECONDS * 1000);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [processingImage, prompt, isLoading, updateAndSelectResult, comparisonMode, quotaCooldownEnd, promptMode, systemInstruction, animationAspectRatio]);
  
  const handleMask = useCallback(async (maskDataUrl: string) => {
    if (!processingImage || isLoading || (quotaCooldownEnd && Date.now() < quotaCooldownEnd)) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage('Applying targeted edit...');

    try {
        const base64Data = processingImage.dataUrl.split(',')[1];
        const result = await fillPhoto(base64Data, processingImage.mimeType, prompt, maskDataUrl, systemInstruction);

        if (result) {
            const newResult: ResultItem = {
                id: `mask-${Date.now()}`,
                imageUrl: result.imageUrl,
                mimeType: result.mimeType,
                prompt: prompt,
                sourceImageUrl: processingImage.dataUrl,
            };
            
            setResults(prev => {
                const updatedResults = [newResult, ...prev];
                return updatedResults.length > 15 ? updatedResults.slice(0, 15) : updatedResults;
            });
            setProcessingImage({ dataUrl: newResult.imageUrl, mimeType: newResult.mimeType });
            await updateAndSelectResult(newResult);

        } else {
            throw new Error('The model did not return an image for the fill operation.');
        }
        
        if (comparisonMode === 'single') {
            setComparisonMode('slider');
        }

    } catch (err: any) {
        const errorMessage = err.message || 'An unexpected error occurred.';
        setError(errorMessage.replace('QUOTA_EXCEEDED: ', ''));
        console.error(err);
        if (errorMessage.startsWith('QUOTA_EXCEEDED:')) {
            setQuotaCooldownEnd(Date.now() + COOLDOWN_SECONDS * 1000);
        }
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
        setIsMasking(false);
    }
  }, [processingImage, prompt, isLoading, updateAndSelectResult, comparisonMode, quotaCooldownEnd, systemInstruction]);

  const handleUseResultAsSource = async (result: ResultItem) => {
    setProcessingImage({ dataUrl: result.imageUrl, mimeType: result.mimeType });
    await updateAndSelectResult(result);
  };
  
  const handleResetToOriginal = async () => {
    if (originalImage) {
      setProcessingImage(originalImage);
      const originalResultItem = results.find(r => r.prompt === "Original Image");
      if (originalResultItem) {
          await updateAndSelectResult(originalResultItem);
      }
    }
  };
  
  const handleSelectResultForView = async (result: ResultItem) => {
    if (result.prompt === 'Image Edited' || result.videoUrl) {
        setComparisonMode('single');
    } else if (comparisonMode === 'single') {
        setComparisonMode('slider');
    }
    await updateAndSelectResult(result);
  }

  const handleImageEdited = async (editedDataUrl: string, mimeType: string) => {
    const newResult: ResultItem = {
      id: `edit-${Date.now()}`,
      imageUrl: editedDataUrl,
      mimeType: mimeType,
      prompt: "Image Edited",
      sourceImageUrl: processingImage?.dataUrl,
    };
    
    setResults(prev => [newResult, ...prev]);
    setProcessingImage({ dataUrl: newResult.imageUrl, mimeType: newResult.mimeType });
    setComparisonMode('single');
    await updateAndSelectResult(newResult);
  };

  const handleDeleteResult = useCallback(async (resultToDelete: ResultItem) => {
    // Prevent deleting the original image as it's the root of the session.
    // The user can use "Clear All" to start over.
    if (resultToDelete.prompt === 'Original Image') {
        return;
    }

    const newResults = results.filter(r => r.id !== resultToDelete.id);
    setResults(newResults);

    // If the deleted result was the selected one, select a new one.
    if (selectedResult?.id === resultToDelete.id) {
        // Default to the first item (which is either the newest or the original)
        const nextResult = newResults[0] ?? null;
        await updateAndSelectResult(nextResult);
    }
  }, [results, selectedResult, updateAndSelectResult]);

  const handleOpenDownloadModal = (result: ResultItem, isUpscaling: boolean) => {
    setDownloadModalState({ isOpen: true, result, isUpscaling });
  };

  const handleCloseDownloadModal = () => {
      setDownloadModalState({ isOpen: false, result: null, isUpscaling: false });
  };

  const handleConfirmDownload = (format: 'png' | 'jpeg', quality: number, metadataComment: string) => {
    const { result, isUpscaling } = downloadModalState;
    if (!result) return;

    if (result.videoUrl) {
      downloadDataUrl(result.videoUrl, `animated-${result.id}.mp4`);
      handleCloseDownloadModal();
      return;
    }

    if (isUpscaling) {
      setIsUpscaling(true);
    }
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setError("Could not create canvas context for download.");
            if (isUpscaling) setIsUpscaling(false);
            return;
        }

        const scale = isUpscaling ? 2 : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        if (isUpscaling) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.filter = 'contrast(105%) saturate(105%) brightness(102%)';
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        if (isUpscaling) {
            ctx.filter = 'none';
        }

        const mimeType = `image/${format}`;
        let dataUrl = canvas.toDataURL(mimeType, format === 'jpeg' ? quality / 100 : undefined);
        
        if (format === 'jpeg' && metadataComment.trim() !== '' && typeof piexif !== 'undefined') {
          try {
            const exifObj = {"0th": {[piexif.ImageIFD.ImageDescription]: metadataComment}};
            const exifBytes = piexif.dump(exifObj);
            dataUrl = piexif.insert(exifBytes, dataUrl);
          } catch (e) {
            console.error("Failed to write EXIF data:", e);
            // Non-fatal error, proceed with download without EXIF
          }
        }
        
        const link = document.createElement('a');
        link.href = dataUrl;
        
        const suffix = isUpscaling ? `-2x` : '';
        link.download = `restored-${result.id}${suffix}.${format}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        if (isUpscaling) setIsUpscaling(false);
        handleCloseDownloadModal();
    };
    img.onerror = () => {
        setError("Failed to load image for download.");
        if (isUpscaling) setIsUpscaling(false);
        handleCloseDownloadModal();
    }
    img.src = result.imageUrl;
  };

  const handleCloseWelcomeModal = () => {
    localStorage.setItem('hasSeenWelcomeModal', 'true');
    setIsWelcomeModalOpen(false);
  };

  const handleExportVideoFrame = useCallback(async (result: ResultItem) => {
    if (!result.videoUrl) return;

    setIsLoading(true);
    setLoadingMessage(t.exportingFrameMessage);
    setError(null);

    try {
      const frameDataUrl = await new Promise<string>((resolve, reject) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        
        const cleanup = () => {
            URL.revokeObjectURL(video.src);
            video.onloadedmetadata = null;
            video.onseeked = null;
            video.onerror = null;
        };

        video.onloadedmetadata = () => {
          video.currentTime = video.duration - 0.01; 
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            reject(new Error("Could not create canvas context."));
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
          cleanup();
        };

        video.onerror = (e) => {
          cleanup();
          console.error("Video error:", e);
          reject(new Error("Failed to load video for frame export."));
        };

        video.src = result.videoUrl;
        video.load();
      });

      const newResult: ResultItem = {
        id: `frame-${Date.now()}`,
        imageUrl: frameDataUrl,
        mimeType: 'image/png',
        prompt: t.lastFrameFromVideo,
        sourceImageUrl: result.imageUrl,
      };

      setResults(prev => [newResult, ...prev]);
      await updateAndSelectResult(newResult);

    } catch (e: any) {
      setError(e.message || "Failed to export video frame.");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, [t, updateAndSelectResult]);

  const cooldownRemaining = quotaCooldownEnd ? Math.max(0, Math.ceil((quotaCooldownEnd - timeNow) / 1000)) : 0;
  const isQuotaLimited = cooldownRemaining > 0;

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
      <WelcomeModal isOpen={isWelcomeModalOpen} onClose={handleCloseWelcomeModal} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        systemInstruction={systemInstruction}
        onSystemInstructionChange={handleSystemInstructionChange}
        stylesUrl={stylesUrl}
        onStylesUrlChange={handleStylesUrlChange}
      />
      <UpscalingModal isOpen={isUpscaling} />
      <DownloadModal 
        isOpen={downloadModalState.isOpen}
        onClose={handleCloseDownloadModal}
        result={downloadModalState.result}
        isUpscaling={downloadModalState.isUpscaling}
        onConfirmDownload={handleConfirmDownload}
      />
      <LeftPanel
        onFilesSelected={handleFilesSelected}
        processingImageUrl={processingImage?.dataUrl}
        prompt={prompt}
        setPrompt={setPrompt}
        onRestore={handleRestore}
        isLoading={isLoading}
        hasImage={!!originalImage}
        onReset={handleResetToOriginal}
        isProcessingOriginal={originalImage?.dataUrl === processingImage?.dataUrl}
        customPrompts={customPrompts[promptMode]}
        onAddCustomPrompt={addCustomPrompt}
        onDeleteCustomPrompt={deleteCustomPrompt}
        promptMode={promptMode}
        setPromptMode={setPromptMode}
        isEditing={isEditing}
        isMasking={isMasking}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isQuotaLimited={isQuotaLimited}
        quotaCooldownRemaining={cooldownRemaining}
        appMode={appMode}
        setAppMode={setAppMode}
        batchItems={batchItems}
        isBatchProcessing={isBatchProcessing}
        onStartBatch={handleStartBatch}
        onClearBatch={handleClearBatch}
        onRemoveBatchItem={handleRemoveBatchItem}
        onDownloadBatch={handleDownloadBatchResults}
        onLoadStyles={handleLoadStyles}
        loadedPresets={loadedPresets}
        animationAspectRatio={animationAspectRatio}
        setAnimationAspectRatio={setAnimationAspectRatio}
      />
      <CenterPanel
        appMode={appMode}
        beforeImage={selectedResult?.prompt === 'Original Image' ? null : (selectedResult?.sourceImageUrl ?? originalImage?.dataUrl ?? null)}
        afterImage={selectedResult?.imageUrl ?? null}
        mimeType={selectedResult?.mimeType ?? originalImage?.mimeType ?? 'image/png'}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        isLoading={isLoading}
        loadingMessage={loadingMessage}
        error={error}
        hasImage={!!originalImage}
        imageDimensions={imageDimensions}
        beforeImageDimensions={beforeImageDimensions}
        afterImageDimensions={afterImageDimensions}
        onImageEdited={handleImageEdited}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isMasking={isMasking}
        setIsMasking={setIsMasking}
        onImageMasked={handleMask}
        promptMode={promptMode}
        selectedResult={selectedResult}
        animationAspectRatio={animationAspectRatio}
      />
      {appMode === 'single' && (
        <RightPanel
          results={results}
          selectedResultId={selectedResult?.id ?? null}
          onSelectResult={handleSelectResultForView}
          onUseAsSource={handleUseResultAsSource}
          onDownloadResult={(result) => handleOpenDownloadModal(result, false)}
          onUpscaleAndDownload={(result) => handleOpenDownloadModal(result, true)}
          onDeleteResult={handleDeleteResult}
          onClearAll={handleClearAll}
          isLoading={isLoading}
          onExportFrame={handleExportVideoFrame}
        />
      )}
    </div>
  );
};

export default App;