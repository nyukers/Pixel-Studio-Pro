import React, { useState, useCallback, useEffect } from 'react';
import { ResultItem, ComparisonMode, PromptMode, BatchItem, AppMode, LoadedPreset, AspectRatio, Action, AnalysisResult } from './types';
import { restorePhoto, animatePhoto, fillPhoto, analyzeImage, generateImage } from './services/geminiService';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import { PRESET_PROMPTS, IMAGINATION_PRESET_PROMPTS, ANIMATION_PRESET_PROMPTS, GENERATE_PRESET_PROMPTS } from './constants';
import SettingsModal from './components/SettingsModal';
import UpscalingModal from './components/UpscalingModal';
import DownloadModal from './components/DownloadModal';
import WelcomeModal from './components/WelcomeModal';
import { useTranslations } from './hooks/useTranslations';
import ActionEditorModal from './components/ActionEditorModal';

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

const parsePromptFile = (fileText: string): LoadedPreset[] => {
    const rows: LoadedPreset[] = [];
    const lines = fileText.trim().replace(/\r/g, '').split('\n');
    if (lines.length < 2) {
      if (!lines[0] || lines[0].trim() === '') return [];
    }

    if (lines[0].charCodeAt(0) === 0xFEFF) {
        lines[0] = lines[0].substring(1);
    }
    
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
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        if (values.length === 0) continue;

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
  const [promptMode, setPromptMode] = useState<PromptMode>('generate');
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
  const [loadedPresets, setLoadedPresets] = useState<Record<PromptMode, LoadedPreset[]>>({ retouch: [], imagination: [], animation: [], generate: [] });
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState<boolean>(false);
  const [animationAspectRatio, setAnimationAspectRatio] = useState<AspectRatio>('16:9');
  const [generateAspectRatio, setGenerateAspectRatio] = useState<AspectRatio>('1:1');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [actions, setActions] = useState<Action[]>([]);
  const [isActionEditorOpen, setIsActionEditorOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [removeBgTolerance, setRemoveBgTolerance] = useState<number>(20);

  const [customPrompts, setCustomPrompts] = useState(() => {
    try {
      const savedPrompts = localStorage.getItem('customPrompts');
      if (savedPrompts) {
        const parsed = JSON.parse(savedPrompts);
        if (Array.isArray(parsed)) {
          // Legacy format
          return { retouch: parsed, imagination: [], animation: [], generate: [] };
        } else {
          return { 
            retouch: parsed.retouch || [], 
            imagination: parsed.imagination || [],
            animation: parsed.animation || [],
            generate: parsed.generate || [],
          };
        }
      }
    } catch (e) {
      console.error("Failed to load custom prompts from localStorage", e);
    }
    return { retouch: [], imagination: [], animation: [], generate: [] };
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
    
    try {
      const savedInstruction = localStorage.getItem('systemInstruction');
      if (savedInstruction) {
        setSystemInstruction(savedInstruction);
      }
      const savedStylesUrl = localStorage.getItem('stylesUrl');
      if (savedStylesUrl) {
        setStylesUrl(savedStylesUrl);
      }
      const savedActions = localStorage.getItem('actions');
      if (savedActions) {
        setActions(JSON.parse(savedActions));
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
            generate: [],
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

  const saveCustomPrompts = (prompts: { [key in PromptMode]: string[] }) => {
    try {
      localStorage.setItem('customPrompts', JSON.stringify(prompts));
    } catch (e) {
      console.error("Failed to save custom prompts to localStorage", e);
    }
  };

  const addCustomPrompt = (newPrompt: string) => {
    const allPresetPrompts = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS, ...ANIMATION_PRESET_PROMPTS, ...GENERATE_PRESET_PROMPTS].map(p => p.prompt);
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
    setPromptMode('generate');
    setComparisonMode('slider');
    setQuotaCooldownEnd(null);
    setIsEditing(false);
    setIsMasking(false);
    setAnalysisResult(null);
  }, []);

  const handleImageUpload = async (imageDataUrl: string, mimeType: string) => {
    handleClearAll();
    setPromptMode('retouch'); // Switch to retouch mode after upload
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
    setAnalysisResult(null);
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
            const result = await restorePhoto(base64Data, item.mimeType, prompt, systemInstruction, removeBgTolerance);

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
              break;
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

  const handleGenerate = useCallback(async () => {
    if (isLoading || (quotaCooldownEnd && Date.now() < quotaCooldownEnd)) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage('Generating your masterpiece...');
    
    try {
      const results = await generateImage(prompt, generateAspectRatio, numberOfImages);
      
      if (results && results.length > 0) {
        const newResultItems: ResultItem[] = results.map((result, index) => ({
          id: `gen-${Date.now()}-${index}`,
          imageUrl: result.imageUrl,
          mimeType: result.mimeType,
          prompt: prompt,
          sourceImageUrl: null, 
        }));
        
        const firstResult = newResultItems[0];
        const imageState = { dataUrl: firstResult.imageUrl, mimeType: firstResult.mimeType };

        if (!originalImage) {
          setOriginalImage(imageState);
          setProcessingImage(imageState);
          const originalResult: ResultItem = {
            id: `original-${Date.now()}`,
            imageUrl: firstResult.imageUrl,
            mimeType: firstResult.mimeType,
            prompt: "Original Image",
            sourceImageUrl: firstResult.imageUrl,
          };
          setResults([originalResult, ...newResultItems.slice(1)]);
          await updateAndSelectResult(originalResult);
        } else {
          setResults(prev => [...newResultItems, ...prev]);
          await updateAndSelectResult(newResultItems[0]);
        }
        
        setPromptMode('retouch');

      } else {
        throw new Error('The model did not return any images. Please try a different prompt.');
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
    }
  }, [prompt, isLoading, quotaCooldownEnd, generateAspectRatio, numberOfImages, originalImage, updateAndSelectResult]);

  const handleRestore = useCallback(async () => {
    if (!processingImage || isLoading || (quotaCooldownEnd && Date.now() < quotaCooldownEnd)) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    try {
      const base64Data = processingImage.dataUrl.split(',')[1];
      
      if (promptMode === 'animation') {
        setLoadingMessage("Initializing animation...");
        const result = await animatePhoto(base64Data, processingImage.mimeType, prompt, setLoadingMessage, animationAspectRatio);

        if (result) {
          const newResult: ResultItem = {
            id: `res-${Date.now()}`,
            imageUrl: processingImage.dataUrl,
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

      } else {
        setLoadingMessage('');
        const result = await restorePhoto(base64Data, processingImage.mimeType, prompt, systemInstruction, removeBgTolerance);

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
      setError(errorMessage.replace('QUOTA_EXCEEDED: ', ''));
      console.error(err);
      if (errorMessage.startsWith('QUOTA_EXCEEDED:')) {
        setQuotaCooldownEnd(Date.now() + COOLDOWN_SECONDS * 1000);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [processingImage, prompt, isLoading, updateAndSelectResult, comparisonMode, quotaCooldownEnd, promptMode, systemInstruction, animationAspectRatio, removeBgTolerance]);
  
  const handleMask = useCallback(async (maskDataUrl: string) => {
    if (!processingImage || isLoading || (quotaCooldownEnd && Date.now() < quotaCooldownEnd)) return;

    setIsLoading(true);
    setError(null);
    setLoadingMessage('Applying targeted edit...');
    setAnalysisResult(null);

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
    setAnalysisResult(null);
    await updateAndSelectResult(result);
  };
  
  const handleResetToOriginal = async () => {
    if (originalImage) {
      setProcessingImage(originalImage);
      const originalResultItem = results.find(r => r.prompt === "Original Image");
      if (originalResultItem) {
          setAnalysisResult(null);
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
    setAnalysisResult(null);
    await updateAndSelectResult(newResult);
  };

  const handleDeleteResult = useCallback(async (resultToDelete: ResultItem) => {
    if (resultToDelete.prompt === 'Original Image') {
        return;
    }

    const newResults = results.filter(r => r.id !== resultToDelete.id);
    setResults(newResults);

    if (selectedResult?.id === resultToDelete.id) {
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
  
  const handleOpenActionEditor = (action: Action | null) => {
    setEditingAction(action);
    setIsActionEditorOpen(true);
  };
  
  const handleSaveAction = (action: Action) => {
    setActions(prev => {
        const existingIndex = prev.findIndex(a => a.id === action.id);
        const newActions = [...prev];
        if (existingIndex > -1) {
            newActions[existingIndex] = action;
        } else {
            newActions.push(action);
        }
        try {
            localStorage.setItem('actions', JSON.stringify(newActions));
        } catch(e) { console.error("Failed to save actions", e); }
        return newActions;
    });
    setIsActionEditorOpen(false);
  };
  
  const handleDeleteAction = (actionId: string) => {
    setActions(prev => {
        const newActions = prev.filter(a => a.id !== actionId);
        try {
            localStorage.setItem('actions', JSON.stringify(newActions));
        } catch(e) { console.error("Failed to save actions", e); }
        return newActions;
    });
  };

  const handleRunAction = async (action: Action) => {
    if (!processingImage || isLoading) return;

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    let currentImage = processingImage;
    const allPresets = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS, ...loadedPresets.retouch, ...loadedPresets.imagination];

    for (let i = 0; i < action.steps.length; i++) {
        const stepId = action.steps[i];
        const preset = allPresets.find(p => p.id === stepId);
        
        const presetDisplayName = PRESET_PROMPTS.find(p => p.id === stepId) ? t[stepId as keyof typeof t] : (IMAGINATION_PRESET_PROMPTS.find(p => p.id === stepId) ? t[stepId as keyof typeof t] : (loadedPresets.retouch.find(p => p.id === stepId)?.displayName || loadedPresets.imagination.find(p => p.id === stepId)?.displayName));

        if (!preset) {
            const errorMsg = `Action failed: Preset with ID "${stepId}" not found.`;
            setError(errorMsg);
            console.error(errorMsg);
            setIsLoading(false);
            return;
        }

        setLoadingMessage(t.runningActionStatus
            .replace('{actionName}', action.name)
            .replace('{step}', (i + 1).toString())
            .replace('{totalSteps}', action.steps.length.toString())
            .replace('{promptName}', presetDisplayName || preset.prompt)
        );

        try {
            const base64Data = currentImage.dataUrl.split(',')[1];
            const result = await restorePhoto(base64Data, currentImage.mimeType, preset.prompt, systemInstruction, removeBgTolerance);

            if (result) {
                const newResult: ResultItem = {
                    id: `res-action-${action.id}-${i}-${Date.now()}`,
                    imageUrl: result.imageUrl,
                    mimeType: result.mimeType,
                    prompt: `Action: ${action.name} - ${presetDisplayName || preset.prompt}`,
                    sourceImageUrl: currentImage.dataUrl,
                };
                
                setResults(prev => [newResult, ...prev]);
                currentImage = { dataUrl: newResult.imageUrl, mimeType: newResult.mimeType };
                setProcessingImage(currentImage);
                await updateAndSelectResult(newResult);
            } else {
                throw new Error(`Step ${i + 1} (${preset.prompt}) did not return an image.`);
            }

        } catch (err: any) {
            setError(`Error during action step ${i + 1}: ${err.message}`);
            console.error(err);
            setIsLoading(false);
            return;
        }
    }

    setLoadingMessage('');
    setIsLoading(false);
  };

  const handleAnalyzeImage = async () => {
      if (!processingImage || isAnalyzing || isLoading) return;
      
      setIsAnalyzing(true);
      setError(null);
      setLoadingMessage(t.analyzingMessage);

      try {
          const base64Data = processingImage.dataUrl.split(',')[1];
          const allPresets = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS];
          const presetIds = allPresets.map(p => p.id);
          
          const result = await analyzeImage(base64Data, processingImage.mimeType, presetIds);
          
          if (result) {
              setAnalysisResult(result);
          } else {
              throw new Error("Analysis did not return a valid result.");
          }

      } catch (err: any) {
          setError(err.message || 'An unexpected error occurred during analysis.');
          console.error(err);
      } finally {
          setIsAnalyzing(false);
          setLoadingMessage('');
      }
  };

  const handleDismissAnalysis = () => {
      setAnalysisResult(null);
  };

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
      <ActionEditorModal
        isOpen={isActionEditorOpen}
        onClose={() => setIsActionEditorOpen(false)}
        onSave={handleSaveAction}
        actionToEdit={editingAction}
        availablePresets={[...PRESET_PROMPTS.map(p => ({...p, displayName: t[p.id as keyof typeof t] || p.prompt, category: 'retouch' as PromptMode})), ...IMAGINATION_PRESET_PROMPTS.map(p => ({...p, displayName: t[p.id as keyof typeof t] || p.prompt, category: 'imagination' as PromptMode})), ...loadedPresets.retouch, ...loadedPresets.imagination]}
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
        onRestore={promptMode === 'generate' ? handleGenerate : handleRestore}
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
        generateAspectRatio={generateAspectRatio}
        setGenerateAspectRatio={setGenerateAspectRatio}
        numberOfImages={numberOfImages}
        setNumberOfImages={setNumberOfImages}
        actions={actions}
        onRunAction={handleRunAction}
        onOpenActionEditor={handleOpenActionEditor}
        onDeleteAction={handleDeleteAction}
        isAnalyzing={isAnalyzing}
        onAnalyzeImage={handleAnalyzeImage}
        analysisResult={analysisResult}
        onDismissAnalysis={handleDismissAnalysis}
        removeBgTolerance={removeBgTolerance}
        setRemoveBgTolerance={setRemoveBgTolerance}
      />
      <CenterPanel
        appMode={appMode}
        beforeImage={selectedResult?.prompt === 'Original Image' ? null : (selectedResult?.sourceImageUrl ?? originalImage?.dataUrl ?? null)}
        afterImage={selectedResult?.imageUrl ?? null}
        mimeType={selectedResult?.mimeType ?? originalImage?.mimeType ?? 'image/png'}
        comparisonMode={comparisonMode}
        setComparisonMode={setComparisonMode}
        isLoading={isLoading || isAnalyzing}
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