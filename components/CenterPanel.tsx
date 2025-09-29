

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ComparisonMode, Pan, ResultItem, AppMode, FilterState, FilterType, EditState, CropBox, PromptMode, AspectRatio } from '../types';
import ComparisonSlider from './ComparisonSlider';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ImageIcon } from './icons/ImageIcon';
import { useTranslations } from '../hooks/useTranslations';
import { EditIcon } from './icons/EditIcon';
import { RotateLeft90Icon } from './icons/RotateLeft90Icon';
import { RotateRight90Icon } from './icons/RotateRight90Icon';
import { FlipIcon } from './icons/FlipIcon';
import { CropIcon } from './icons/CropIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { PlusIconCircle } from './icons/PlusIconCircle';
import { MinusIconCircle } from './icons/MinusIconCircle';
import { ResetIcon } from './icons/ResetIcon';
import { UndoIcon } from './icons/UndoIcon';
import { RedoIcon } from './icons/RedoIcon';
import { BatchIcon } from './icons/BatchIcon';
import { FilterIcon } from './icons/FilterIcon';
import HistoryPanel from './HistoryPanel';
import { BrushIcon } from './icons/BrushIcon';
import { ClearIcon } from './icons/ClearIcon';

interface CenterPanelProps {
  appMode: AppMode;
  beforeImage: string | null;
  afterImage: string | null;
  mimeType: string;
  comparisonMode: ComparisonMode;
  setComparisonMode: (mode: ComparisonMode) => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  hasImage: boolean;
  imageDimensions: { width: number; height: number } | null;
  beforeImageDimensions: { width: number; height: number } | null;
  afterImageDimensions: { width: number; height: number } | null;
  onImageEdited: (editedDataUrl: string, mimeType: string) => void;
  onImageMasked: (maskDataUrl: string) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  isMasking: boolean;
  setIsMasking: (isMasking: boolean) => void;
  promptMode: PromptMode;
  selectedResult: ResultItem | null;
  animationAspectRatio: AspectRatio;
}

interface CropPreview {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

const CenterPanel: React.FC<CenterPanelProps> = ({
  appMode,
  beforeImage,
  afterImage,
  mimeType,
  comparisonMode,
  setComparisonMode,
  isLoading,
  loadingMessage,
  error,
  hasImage,
  imageDimensions,
  beforeImageDimensions,
  afterImageDimensions,
  onImageEdited,
  onImageMasked,
  isEditing,
  setIsEditing,
  isMasking,
  setIsMasking,
  promptMode,
  selectedResult,
  animationAspectRatio,
}) => {
  const t = useTranslations();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState<Pan>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const prevIsEditing = useRef(isEditing);
  const prevIsMasking = useRef(isMasking);

  // Edit mode state with History
  const [history, setHistory] = useState<EditState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const currentEditState = history[historyIndex];
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Box Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);
  const [drawingCropBox, setDrawingCropBox] = useState<CropBox | null>(null);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);

  // Fill (masking) state
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [customCursorPos, setCustomCursorPos] = useState({ x: -100, y: -100 });
  const [isMouseInPanel, setIsMouseInPanel] = useState(false);
  const [cropPreview, setCropPreview] = useState<CropPreview | null>(null);


  const createInitialState = (): EditState => ({
      actionKey: 'initialState',
      rotation: 0,
      scaleX: 1,
      straightenAngle: 0,
      editZoom: 1,
      editPan: { x: 0, y: 0 },
      cropBox: null,
      filter: { type: 'none', intensity: 100 },
  });

  const getCssFilterString = (filter: FilterState | undefined): string => {
    if (!filter || filter.type === 'none') return 'none';
    const intensity = filter.intensity / 100;
    switch (filter.type) {
        case 'sepia':
            return `sepia(${intensity})`;
        case 'grayscale':
            return `grayscale(${intensity})`;
        case 'vintage':
            // A combination for vintage effect. Intensity affects sepia.
            return `sepia(${intensity * 0.6}) contrast(1.1) brightness(0.95) saturate(1.2)`;
        default:
            return 'none';
    }
  };

  const fitAll = useCallback(() => {
    const masterDimensions = afterImageDimensions || beforeImageDimensions || imageDimensions;
    if (!masterDimensions || !containerRef.current) {
        setZoom(1);
        setPan({ x: 0, y: 0 });
        return;
    }
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    
    if (containerWidth <= 0 || containerHeight <= 0) return;

    let { width: imgWidth, height: imgHeight } = masterDimensions;
    
    if (comparisonMode === 'side' && beforeImage && afterImage && !isEditing && !isMasking) {
        imgWidth *= 2;
    }

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    
    const newZoom = Math.min(scaleX, scaleY) * 0.95;

    setZoom(newZoom > 0 ? newZoom : 1);
    setPan({ x: 0, y: 0 });
  }, [
    afterImageDimensions, 
    beforeImageDimensions, 
    imageDimensions, 
    comparisonMode, 
    beforeImage, 
    afterImage,
    isEditing,
    isMasking
  ]);

  const fitToHeight = useCallback(() => {
    const masterDimensions = afterImageDimensions || imageDimensions;
    if (!masterDimensions || !containerRef.current) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const containerHeight = containerRef.current.clientHeight;
    if (containerHeight <= 0) return;
    const { height: imgHeight } = masterDimensions;
    const scaleY = containerHeight / imgHeight;
    setZoom(scaleY > 0 ? scaleY : 1);
    setPan({ x: 0, y: 0 });
  }, [afterImageDimensions, imageDimensions]);

  const fitAllForEditing = useCallback(() => {
    const dims = afterImageDimensions || imageDimensions;
    if (!dims || !containerRef.current || history.length === 0) {
      return;
    }

    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    if (containerWidth <= 0 || containerHeight <= 0) return;

    const { width: imgWidth, height: imgHeight } = dims;
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const newZoom = Math.min(scaleX, scaleY) * 0.95;

    setHistory(prev => {
        if (prev.length === 0) return prev;
        const newHistory = [...prev];
        const updatedState = { ...newHistory[0], editZoom: newZoom > 0 ? newZoom : 1, editPan: {x: 0, y: 0} };
        newHistory[0] = updatedState;
        return newHistory;
    });
    setHistoryIndex(0);
  }, [afterImageDimensions, imageDimensions, history.length]);
  
  const setZoomAndCenter = (newZoom: number) => {
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }

  const recordHistory = (actionKey: string, newState: Partial<Omit<EditState, 'actionKey'>>) => {
    if (!currentEditState) return;
    
    const newHistory = history.slice(0, historyIndex + 1);
    const lastEntry = newHistory[newHistory.length - 1];

    const continuousActions = ['actionZoom', 'actionStraighten', 'actionPan', 'actionFilter'];
    const shouldCoalesce = lastEntry && lastEntry.actionKey === actionKey && continuousActions.includes(actionKey);

    if (shouldCoalesce) {
        const updatedState = { ...lastEntry, ...newState };
        newHistory[newHistory.length - 1] = updatedState;
        setHistory(newHistory);
    } else {
        const nextState: EditState = {
            ...currentEditState,
            ...newState,
            actionKey,
        };
        newHistory.push(nextState);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }
  };
  
  useEffect(() => {
    if (hasImage && !isEditing && !isMasking) {
        const timer = setTimeout(() => fitAll(), 50);
        return () => clearTimeout(timer);
    }
  }, [hasImage, afterImage, afterImageDimensions, comparisonMode, isEditing, isMasking, fitAll]);

  useEffect(() => {
    if (!hasImage) return;
    const handleResize = () => {
        if (isEditing) {
            fitAllForEditing();
        } else {
            fitAll();
        }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasImage, isEditing, fitAll, fitAllForEditing]);
  
  useEffect(() => {
    if (isEditing && !prevIsEditing.current) {
        setIsMasking(false);
        setHistory([createInitialState()]);
        setHistoryIndex(0);
        const timer = setTimeout(() => fitAllForEditing(), 50);
        return () => clearTimeout(timer);
    } else if (!isEditing && prevIsEditing.current) {
      fitAll();
    }
    prevIsEditing.current = isEditing;
  }, [isEditing, fitAll, fitAllForEditing, setIsMasking]);

  useEffect(() => {
    if(isMasking && !prevIsMasking.current) {
        setIsEditing(false);
        fitAll(); // Fit view for drawing
    }
    prevIsMasking.current = isMasking;
  }, [isMasking, setIsEditing, fitAll]);
  
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
      } else if (e.key === 'Escape') {
        if (isDrawingCrop) {
          setIsDrawingCrop(false);
          setDrawingCropBox(null); 
        } else if (isCropping) {
          setIsCropping(false);
        } else if (showFiltersPanel) {
          setShowFiltersPanel(false);
        } else {
          handleCancelEdits();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, isCropping, isDrawingCrop, historyIndex, history.length, showFiltersPanel]);
  
  useEffect(() => {
    if (appMode === 'single' && promptMode === 'animation' && hasImage && imageDimensions) {
        const [targetW, targetH] = animationAspectRatio.split(':').map(Number);
        const targetRatio = targetW / targetH;

        const { width: imgW, height: imgH } = imageDimensions;
        const imgRatio = imgW / imgH;

        if (Math.abs(imgRatio - targetRatio) < 0.01) {
            setCropPreview(null);
            return;
        }

        let top = 0, bottom = 0, left = 0, right = 0;

        if (imgRatio > targetRatio) { // Wider image, crop sides
            const newWidth = imgH * targetRatio;
            const margin = (imgW - newWidth) / 2;
            left = (margin / imgW) * 100;
            right = (margin / imgW) * 100;
        } else { // Taller image, crop top/bottom
            const newHeight = imgW / targetRatio;
            const margin = (imgH - newHeight) / 2;
            top = (margin / imgH) * 100;
            bottom = (margin / imgH) * 100;
        }

        setCropPreview({ top, right, bottom, left });

    } else {
        setCropPreview(null);
    }
  }, [appMode, promptMode, hasImage, imageDimensions, animationAspectRatio]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!hasImage || isCropping || isMasking) return;
    e.preventDefault();
    const scaleAmount = 0.1;
    const currentZoom = isEditing ? currentEditState?.editZoom : zoom;
    const newZoom = Math.min(Math.max(0.1, currentZoom * (1 - e.deltaY * scaleAmount * 0.1)), 10);
    
    if (isEditing) {
        recordHistory('actionZoom', { editZoom: newZoom });
    } else {
        setZoom(newZoom);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!hasImage || appMode === 'batch' || isMasking) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (isCropping) return;
    
    e.preventDefault();
    setIsPanning(true);
    if (isEditing && currentEditState) {
        setStartPan({ x: e.clientX - currentEditState.editPan.x, y: e.clientY - currentEditState.editPan.y });
    } else {
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isMasking) {
        setCustomCursorPos({ x: e.clientX, y: e.clientY });
    }
    if (!isPanning || isCropping || isMasking) return;
    e.preventDefault();
    const newPan = { x: e.clientX - startPan.x, y: e.clientY - startPan.y };
    if (isEditing) {
        setHistory(prev => {
            const newHistory = [...prev];
            newHistory[historyIndex] = { ...newHistory[historyIndex], editPan: newPan };
            return newHistory;
        });
    } else {
        setPan(newPan);
    }
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent) => {
    e.preventDefault();
    if(isPanning && isEditing) {
        recordHistory('actionPan', { editPan: history[historyIndex].editPan });
    }
    setIsPanning(false);
  };
  
  const handleApplyEdits = () => {
    const imageToEdit = afterImage;
    if (!imageToEdit || !currentEditState) return;
  
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
  
      const transformedCanvas = document.createElement('canvas');
      const transformedCtx = transformedCanvas.getContext('2d');
      if (!transformedCtx) return;
  
      const straightenRad = currentEditState.straightenAngle * (Math.PI / 180);
      const angle = (currentEditState.rotation * Math.PI / 180) + straightenRad;
  
      const { width: w, height: h } = img;
      const absCos = Math.abs(Math.cos(angle));
      const absSin = Math.abs(Math.sin(angle));
      const newWidth = w * absCos + h * absSin;
      const newHeight = w * absSin + h * absCos;
  
      transformedCanvas.width = newWidth;
      transformedCanvas.height = newHeight;
  
      transformedCtx.translate(newWidth / 2, newHeight / 2);
      transformedCtx.rotate(angle);
      transformedCtx.scale(currentEditState.scaleX, 1);
      transformedCtx.drawImage(img, -w / 2, -h / 2);
  
      let sx, sy, sWidth, sHeight;
  
      if (isCropping && currentEditState.cropBox && imageRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const displayedWidth = imageRef.current.clientWidth * currentEditState.editZoom;
        const displayedHeight = imageRef.current.clientHeight * currentEditState.editZoom;
        const displayedX = (containerRect.width - displayedWidth) / 2 + currentEditState.editPan.x;
        const displayedY = (containerRect.height - displayedHeight) / 2 + currentEditState.editPan.y;

        const cropBox = currentEditState.cropBox;
        const normCropX = Math.min(cropBox.startX, cropBox.endX) - containerRect.left;
        const normCropY = Math.min(cropBox.startY, cropBox.endY) - containerRect.top;
        const normCropWidth = Math.abs(cropBox.endX - cropBox.startX);
        const normCropHeight = Math.abs(cropBox.endY - cropBox.startY);
  
        sx = ((normCropX - displayedX) / displayedWidth) * newWidth;
        sy = ((normCropY - displayedY) / displayedHeight) * newHeight;
        sWidth = (normCropWidth / displayedWidth) * newWidth;
        sHeight = (normCropHeight / displayedHeight) * newHeight;
  
      } else {
        if (!containerRef.current) return;
        const { clientWidth: containerW, clientHeight: containerH } = containerRef.current;
  
        sWidth = containerW / currentEditState.editZoom;
        sHeight = containerH / currentEditState.editZoom;
        sx = (newWidth - sWidth) / 2 - (currentEditState.editPan.x / currentEditState.editZoom);
        sy = (newHeight - sHeight) / 2 - (currentEditState.editPan.y / currentEditState.editZoom);
      }
      
      sWidth = Math.max(1, sWidth);
      sHeight = Math.max(1, sHeight);
  
      canvas.width = Math.round(sWidth);
      canvas.height = Math.round(sHeight);
      
      const filterString = getCssFilterString(currentEditState.filter);
      ctx.filter = filterString;
  
      ctx.drawImage(
        transformedCanvas,
        sx, sy, sWidth, sHeight,
        0, 0, canvas.width, canvas.height
      );
      
      ctx.filter = 'none';
  
      onImageEdited(canvas.toDataURL(mimeType), mimeType);
      handleCancelEdits();
    };
    img.src = imageToEdit;
  };
  
  const handleUndo = () => canUndo && setHistoryIndex(i => i - 1);
  const handleRedo = () => canRedo && setHistoryIndex(i => i + 1);

  const resetEditState = () => {
      const initialState = createInitialState();
      recordHistory('actionReset', {
        rotation: initialState.rotation,
        scaleX: initialState.scaleX,
        straightenAngle: initialState.straightenAngle,
        editZoom: initialState.editZoom,
        editPan: initialState.editPan,
        cropBox: initialState.cropBox,
        filter: initialState.filter,
      });
      setIsCropping(false);
      setDrawingCropBox(null);
      setShowFiltersPanel(false);
  };
  
  const handleCancelEdits = () => {
      setIsEditing(false);
      setIsCropping(false);
      setDrawingCropBox(null);
      setHistory([]);
      setHistoryIndex(-1);
      setShowFiltersPanel(false);
  };
  
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (!isCropping) return;
    setIsDrawingCrop(true);
    setDrawingCropBox({ startX: e.clientX, startY: e.clientY, endX: e.clientX, endY: e.clientY });
  };
  
  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingCrop || !drawingCropBox) return;
    setDrawingCropBox({ ...drawingCropBox, endX: e.clientX, endY: e.clientY });
  };
  
  const handleCropMouseUp = () => {
    if(isDrawingCrop) {
        recordHistory('actionCrop', { cropBox: drawingCropBox });
        setDrawingCropBox(null);
    }
    setIsDrawingCrop(false);
  };

  const handleFilterChange = (filter: FilterState, actionKey: string) => {
    recordHistory(actionKey, { filter });
  };

  const getRelativeCoords = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleMaskMouseDown = (e: React.MouseEvent) => {
    if (!isMasking) return;
    const coords = getRelativeCoords(e);
    if (!coords) return;
    setIsDrawingMask(true);
    lastPointRef.current = coords;
  };

  const handleMaskMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingMask) return;
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const currentPoint = getRelativeCoords(e);
    if (!ctx || !currentPoint || !lastPointRef.current) return;
    
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.6)';
    ctx.lineWidth = brushSize / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();

    lastPointRef.current = currentPoint;
  };

  const handleMaskMouseUp = () => {
    setIsDrawingMask(false);
    lastPointRef.current = null;
  };
  
  const handleClearMask = () => {
    const canvas = maskCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleCancelMask = () => {
    handleClearMask();
    setIsMasking(false);
  };
  
  const handleApplyMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = maskCanvas.width;
    tempCanvas.height = maskCanvas.height;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    const originalCtx = maskCanvas.getContext('2d');
    if (!originalCtx) return;

    const imageData = originalCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const data = imageData.data;

    // The inpainting model requires a specific mask format to determine which parts of the image to edit.
    // Based on empirical testing with the model:
    // - The area the user draws on (to be filled) must be BLACK.
    // - The area to be kept untouched must be WHITE.
    for (let i = 0; i < data.length; i += 4) {
      // Check the alpha channel of the visual drawing canvas to see if a pixel was drawn on.
      if (data[i + 3] > 0) { // This is the user-drawn area.
        // Set to BLACK to indicate "fill this area".
        data[i] = 0;     // R
        data[i + 1] = 0; // G
        data[i + 2] = 0; // B
      } else { // This is the untouched background.
        // Set to WHITE to indicate "keep this area".
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      }
      // Ensure the final mask is fully opaque for the API.
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const maskDataUrl = tempCanvas.toDataURL('image/png');
    onImageMasked(maskDataUrl);
    handleClearMask();
  };

  const getCropBoxStyle = (): React.CSSProperties => {
    const boxToDraw = drawingCropBox || currentEditState?.cropBox;
    if (!boxToDraw) return { display: 'none' };

    const left = Math.min(boxToDraw.startX, boxToDraw.endX);
    const top = Math.min(boxToDraw.startY, boxToDraw.endY);
    const width = Math.abs(boxToDraw.endX - boxToDraw.startX);
    const height = Math.abs(boxToDraw.endY - boxToDraw.startY);

    return {
        position: 'fixed',
        left,
        top,
        width,
        height,
        border: `2px dashed #facc15`,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none',
        zIndex: 45,
    };
  };

  const singleImage = afterImage || beforeImage;
  const isComparisonDisabled = selectedResult?.prompt === 'Image Edited' || !!selectedResult?.videoUrl;
  const isVideoResult = !!selectedResult?.videoUrl;
  const inSpecialMode = isEditing || isMasking;

  const renderContent = () => {
    if (appMode === 'batch') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
          <BatchIcon className="h-24 w-24 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-300">{t.batchPlaceholderTitle}</h2>
          <p className="text-center">{t.batchPlaceholderSubtitle}</p>
        </div>
      );
    }
    
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
          <SpinnerIcon className="h-16 w-16 animate-spin text-yellow-400" />
          <p className="mt-4 text-lg">{t.processingMessage}</p>
          <p className="text-sm text-center">{loadingMessage || t.processingSubMessage}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-900/20 p-8 rounded-lg">
          <p className="font-bold text-lg mb-2">{t.errorTitle}</p>
          <p className="text-center">{error}</p>
        </div>
      );
    }

    if (!hasImage) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <ImageIcon className="h-24 w-24 mb-4" />
          <h2 className="text-2xl font-semibold text-gray-300">{t.uploadPromptTitle}</h2>
          <p>{t.uploadPromptSubtitle}</p>
        </div>
      );
    }
    
    if (beforeImage && afterImage && comparisonMode === 'slider' && !inSpecialMode) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <ComparisonSlider 
            before={beforeImage} 
            after={afterImage} 
            zoom={zoom} 
            pan={pan}
            beforeImageDimensions={beforeImageDimensions}
            afterImageDimensions={afterImageDimensions}
            onPanMouseDown={handleMouseDown}
            isPanning={isPanning}
          />
        </div>
      );
    }
    
    if (beforeImage && afterImage && comparisonMode === 'side' && !inSpecialMode) {
      const scaleCorrection = (beforeImageDimensions && afterImageDimensions && beforeImageDimensions.width > 0)
        ? afterImageDimensions.width / beforeImageDimensions.width
        : 1;

      const baseTransform = `translate(${pan.x}px, ${pan.y}px)`;
      const baseStyle: Omit<React.CSSProperties, 'transform'> = {
          transition: isPanning ? 'none' : 'transform 0.1s',
          maxWidth: 'none',
          maxHeight: 'none',
          width: 'auto',
          height: 'auto',
      };

      const beforeTransformStyle: React.CSSProperties = {
          ...baseStyle,
          transform: `${baseTransform} scale(${zoom * scaleCorrection})`,
      };
      
      const afterTransformStyle: React.CSSProperties = {
          ...baseStyle,
          transform: `${baseTransform} scale(${zoom})`,
      };

      return (
        <div className="grid grid-cols-2 gap-4 w-full h-full p-4">
          <div className="flex flex-col items-center justify-start overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute top-2 left-2 z-10 bg-black/50 text-gray-100 text-sm px-2 py-1 rounded-md pointer-events-none">
                <h3 className="font-semibold">{t.beforeLabel}</h3>
                {beforeImageDimensions && (
                    <p className="text-xs text-gray-300">{`${beforeImageDimensions.width} x ${beforeImageDimensions.height} px`}</p>
                )}
              </div>
              <img key={beforeImage} src={beforeImage} alt={t.beforeLabel} style={beforeTransformStyle} className="object-contain rounded-lg shadow-md" />
            </div>
          </div>
          <div className="flex flex-col items-center justify-start overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center">
              <div className="absolute top-2 left-2 z-10 bg-black/50 text-sm px-2 py-1 rounded-md pointer-events-none">
                <h3 className="font-semibold text-yellow-300">{t.afterLabel}</h3>
                 {afterImageDimensions && (
                    <p className="text-xs text-gray-100">{`${afterImageDimensions.width} x ${afterImageDimensions.height} px`}</p>
                 )}
              </div>
              <img key={afterImage} src={afterImage} alt={t.afterLabel} style={afterTransformStyle} className="object-contain rounded-lg shadow-md" />
            </div>
          </div>
        </div>
      )
    }
    
    if (selectedResult?.videoUrl) {
      return (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
            <video 
                key={selectedResult.videoUrl} 
                src={selectedResult.videoUrl}
                controls 
                autoPlay 
                loop 
                muted
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isPanning ? 'none' : 'transform 0.1s',
                }}
            />
        </div>
      );
    }


    if (singleImage) {
        const staticTransform = currentEditState ? `rotate(${currentEditState.rotation}deg) scaleX(${currentEditState.scaleX}) rotate(${currentEditState.straightenAngle}deg)` : '';
        const viewTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
        const editViewTransform = currentEditState ? `translate(${currentEditState.editPan.x}px, ${currentEditState.editPan.y}px) scale(${currentEditState.editZoom})` : '';

        const transformString = isEditing ? `${editViewTransform} ${staticTransform}` : viewTransform;
        
        const wrapperTransformStyle: React.CSSProperties = {
            transform: transformString,
            transition: (isPanning || isDrawingCrop) ? 'none' : 'transform 0.1s',
            display: 'inline-block', // Make wrapper fit content
        };

        const imageStyle: React.CSSProperties = {
            filter: isEditing ? getCssFilterString(currentEditState?.filter) : 'none',
            maxWidth: 'none',
            maxHeight: 'none',
            width: 'auto',
            height: 'auto',
            touchAction: 'none',
            display: 'block',
        };

        return (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
                <div style={wrapperTransformStyle}>
                    <div className="relative"> {/* Container for image and overlays */}
                        <img ref={imageRef} src={singleImage} alt="Display" style={imageStyle} className="object-contain rounded-lg shadow-lg"/>
                        {isMasking && afterImageDimensions && (
                            <canvas
                                ref={maskCanvasRef}
                                width={afterImageDimensions.width}
                                height={afterImageDimensions.height}
                                className="absolute inset-0 w-full h-full"
                                onMouseDown={handleMaskMouseDown}
                                onMouseMove={handleMaskMouseMove}
                                onMouseUp={handleMaskMouseUp}
                                onMouseLeave={handleMaskMouseUp}
                            />
                        )}
                        {cropPreview && !inSpecialMode && (
                            <>
                                {/* Top */}
                                <div className="absolute left-0 right-0 bg-black/60 pointer-events-none" style={{ top: 0, height: `${cropPreview.top}%` }}></div>
                                {/* Bottom */}
                                <div className="absolute left-0 right-0 bg-black/60 pointer-events-none" style={{ bottom: 0, height: `${cropPreview.bottom}%` }}></div>
                                {/* Left */}
                                <div className="absolute left-0 bg-black/60 pointer-events-none" style={{ top: `${cropPreview.top}%`, bottom: `${cropPreview.bottom}%`, width: `${cropPreview.left}%` }}></div>
                                {/* Right */}
                                <div className="absolute right-0 bg-black/60 pointer-events-none" style={{ top: `${cropPreview.top}%`, bottom: `${cropPreview.bottom}%`, width: `${cropPreview.right}%` }}></div>
                                
                                {/* Dashed line for the crop box itself */}
                                <div 
                                    className="absolute border-2 border-dashed border-yellow-400 pointer-events-none" 
                                    style={{
                                        top: `${cropPreview.top}%`,
                                        right: `${cropPreview.right}%`,
                                        bottom: `${cropPreview.bottom}%`,
                                        left: `${cropPreview.left}%`,
                                    }}
                                >
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                        {t.animationCropPreviewLabel.replace('{ratio}', animationAspectRatio)}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
  };

  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4 bg-gray-900 relative">
      {isMasking && isMouseInPanel && (
          <div
              className="pointer-events-none fixed z-[9999] rounded-full bg-yellow-400/50 border-2 border-yellow-500 -translate-x-1/2 -translate-y-1/2"
              style={{
                  left: customCursorPos.x,
                  top: customCursorPos.y,
                  width: brushSize,
                  height: brushSize,
              }}
          />
      )}
      {(isCropping || drawingCropBox) && <div style={getCropBoxStyle()}></div>}
      {isEditing && currentEditState && (
         <>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2">
                {/* Filters Panel */}
                {showFiltersPanel && (
                    <div className="p-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700 w-full max-w-xl flex flex-col items-center gap-3">
                        <div className="flex justify-center items-center flex-wrap gap-2">
                            <button onClick={() => handleFilterChange({ type: 'none', intensity: 100 }, 'filterNone')} className={`py-1.5 px-3 text-sm rounded-md font-semibold transition ${currentEditState.filter.type === 'none' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}`}>{t.filterNone}</button>
                            <button onClick={() => handleFilterChange({ type: 'sepia', intensity: currentEditState.filter.type === 'sepia' ? currentEditState.filter.intensity : 80 }, 'filterSepia')} className={`py-1.5 px-3 text-sm rounded-md font-semibold transition ${currentEditState.filter.type === 'sepia' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}`}>{t.filterSepia}</button>
                            <button onClick={() => handleFilterChange({ type: 'grayscale', intensity: currentEditState.filter.type === 'grayscale' ? currentEditState.filter.intensity : 100 }, 'filterGrayscale')} className={`py-1.5 px-3 text-sm rounded-md font-semibold transition ${currentEditState.filter.type === 'grayscale' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}`}>{t.filterGrayscale}</button>
                            <button onClick={() => handleFilterChange({ type: 'vintage', intensity: currentEditState.filter.type === 'vintage' ? currentEditState.filter.intensity : 100 }, 'filterVintage')} className={`py-1.5 px-3 text-sm rounded-md font-semibold transition ${currentEditState.filter.type === 'vintage' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-100 hover:bg-gray-600'}`}>{t.filterVintage}</button>
                        </div>
                        {currentEditState.filter.type !== 'none' && (
                            <div className="w-full max-w-sm pt-2">
                                <label htmlFor="filter-intensity" className="block text-xs font-medium text-gray-300 mb-2">{t.filterIntensityLabel} ({currentEditState.filter.intensity}%)</label>
                                <input
                                    id="filter-intensity"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={currentEditState.filter.intensity}
                                    onChange={e => handleFilterChange({ ...currentEditState.filter, intensity: parseInt(e.target.value, 10) }, 'actionFilter')}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                                />
                            </div>
                        )}
                    </div>
                )}
                
                {/* Main Toolbar */}
                <div className="p-2 flex justify-center items-center flex-wrap gap-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
                    <button title={t.undoTitle} onClick={handleUndo} disabled={!canUndo} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5"/></button>
                    <button title={t.redoTitle} onClick={handleRedo} disabled={!canRedo} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5"/></button>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <button title={t.rotateLeft90Title} onClick={() => recordHistory('actionRotate', { rotation: (currentEditState.rotation - 90 + 360) % 360 })} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><RotateLeft90Icon className="w-5 h-5"/></button>
                    <button title={t.rotateRight90Title} onClick={() => recordHistory('actionRotate', { rotation: (currentEditState.rotation + 90) % 360 })} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><RotateRight90Icon className="w-5 h-5"/></button>
                    <button title={t.flipTitle} onClick={() => recordHistory('actionFlip', { scaleX: currentEditState.scaleX * -1 })} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><FlipIcon className="w-5 h-5"/></button>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <button title={t.zoomOutTitle} onClick={() => recordHistory('actionZoom', { editZoom: Math.max(0.1, currentEditState.editZoom / 1.1) })} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><MinusIconCircle className="w-5 h-5"/></button>
                    <button title={t.zoomInTitle} onClick={() => recordHistory('actionZoom', { editZoom: Math.min(10, currentEditState.editZoom * 1.1) })} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><PlusIconCircle className="w-5 h-5"/></button>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="straighten" className="text-sm text-gray-300">{t.straightenLabel}</label>
                        <input type="range" id="straighten" min="-15" max="15" step="0.5" value={currentEditState.straightenAngle} onChange={e => recordHistory('actionStraighten', { straightenAngle: parseFloat(e.target.value) })} className="w-32"/>
                        <span className="text-xs w-12 text-gray-400 text-center">{currentEditState.straightenAngle.toFixed(1)}°</span>
                    </div>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <button title={t.filtersTitle} onClick={() => setShowFiltersPanel(s => !s)} className={`p-2 rounded-md transition ${showFiltersPanel ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-gray-100'}`}><FilterIcon className="w-5 h-5"/></button>
                    <button title={t.cropTitle} onClick={() => setIsCropping(c => !c)} className={`p-2 rounded-md transition ${isCropping ? 'bg-yellow-400 text-gray-900' : 'text-gray-300 bg-gray-700 hover:bg-gray-600 hover:text-gray-100'}`}><CropIcon className="w-5 h-5"/></button>
                    <div className="w-px h-6 bg-gray-600"></div>
                    <button title={t.resetEditsTitle} onClick={resetEditState} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><ResetIcon className="w-5 h-5"/></button>
                    <button title={t.cancelEditsTitle} onClick={handleCancelEdits} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-red-500 hover:text-white transition"><XIcon className="w-5 h-5"/></button>
                    <button title={t.applyEditsTitle} onClick={handleApplyEdits} className="p-2 text-gray-900 bg-yellow-400 rounded-md hover:bg-yellow-300 transition"><CheckIcon className="w-5 h-5"/></button>
                </div>
            </div>
            <HistoryPanel history={history} currentIndex={historyIndex} onJump={setHistoryIndex} />
         </>
      )}
      {isMasking && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 p-2 flex justify-center items-center flex-wrap gap-3 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
            <span className='text-sm font-medium text-gray-300 whitespace-nowrap'>{t.brushSizeLabel}:</span>
            <input type="range" min="5" max="150" value={brushSize} onChange={e => setBrushSize(parseInt(e.target.value, 10))} className="w-32 accent-yellow-400"/>
            <span className="text-xs w-10 text-gray-400">{brushSize}px</span>
            <div className="w-px h-6 bg-gray-600"></div>
            <button onClick={handleClearMask} title={t.clearMaskBtn} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-gray-100 transition"><ClearIcon className="w-5 h-5"/></button>
            <button onClick={handleCancelMask} title={t.cancelMaskBtn} className="p-2 text-gray-300 bg-gray-700 rounded-md hover:bg-red-500 hover:text-white transition"><XIcon className="w-5 h-5"/></button>
            <button onClick={handleApplyMask} title={t.applyMaskBtn} className="p-2 text-gray-900 bg-yellow-400 rounded-md hover:bg-yellow-300 transition"><CheckIcon className="w-5 h-5"/></button>
        </div>
      )}
      <div 
        ref={containerRef}
        className={`w-full flex-grow bg-black/20 rounded-lg flex items-center justify-center overflow-hidden shadow-2xl relative ${hasImage && appMode === 'single' ? (isMasking ? 'cursor-none' : (isCropping ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab'))) : 'cursor-default'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseEnter={() => { if(isMasking) setIsMouseInPanel(true); }}
        onMouseLeave={(e) => {
            handleMouseUpOrLeave(e);
            if(isMasking) setIsMouseInPanel(false);
        }}
      >
        {isCropping && (
            <div 
                className="absolute inset-0 z-40"
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
            />
        )}
        {renderContent()}
      </div>
      {hasImage && !inSpecialMode && appMode === 'single' && (
        <div 
            className="flex-shrink-0 mt-4 z-10 p-2 flex justify-center items-center flex-wrap gap-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700"
        >
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsEditing(true)} disabled={isVideoResult} className={`px-3 py-1 text-sm rounded-md transition whitespace-nowrap bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed`}>
            <EditIcon className="w-4 h-4" />
            <span>{t.editBtn}</span>
          </button>
           <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setIsMasking(true)} disabled={isVideoResult || promptMode !== 'retouch'} className={`px-3 py-1 text-sm rounded-md transition whitespace-nowrap bg-gray-700 text-gray-300 hover:bg-gray-600 flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed`}>
            <BrushIcon className="w-4 h-4" />
            <span>{t.maskBtn}</span>
          </button>
          <div className="w-px h-5 bg-gray-600 mx-1"></div>
          <span className='text-sm font-medium text-gray-300 whitespace-nowrap'>{t.viewLabel}:</span>
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => setComparisonMode('slider')} 
            disabled={isComparisonDisabled}
            className={`px-3 py-1 text-sm rounded-md transition whitespace-nowrap ${comparisonMode === 'slider' && !isComparisonDisabled ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >{t.sliderBtn}</button>
          <button 
            onMouseDown={(e) => e.stopPropagation()} 
            onClick={() => setComparisonMode('side')} 
            disabled={isComparisonDisabled}
            className={`px-3 py-1 text-sm rounded-md transition whitespace-nowrap ${comparisonMode === 'side' && !isComparisonDisabled ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
            >{t.sideBySideBtn}</button>
          <div className="w-px h-5 bg-gray-600 mx-1"></div>
          <span className='text-sm font-medium text-gray-300 whitespace-nowrap'>{t.zoomLabel}:</span>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={fitAll} className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap">{t.fitBtn}</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={fitToHeight} className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap">{t.fitHBtn}</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setZoomAndCenter(0.5)} className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap">50%</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setZoomAndCenter(1)} className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap">100%</button>
          <button onMouseDown={(e) => e.stopPropagation()} onClick={() => setZoomAndCenter(2)} className="px-3 py-1 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 whitespace-nowrap">200%</button>
           <span className='text-sm w-16 text-left font-medium text-gray-400 ml-1 whitespace-nowrap'>({(zoom * 100).toFixed(0)}%)</span>
        </div>
      )}
    </main>
  );
};

export default CenterPanel;