export interface ResultItem {
  id: string;
  imageUrl: string; // Used as thumbnail or for image results
  videoUrl?: string; // For video results
  mimeType: string;
  prompt: string;
  sourceImageUrl?: string; // The URL of the image used to generate this result
}

export type ComparisonMode = 'side' | 'slider' | 'single';

export type PromptMode = 'retouch' | 'imagination' | 'animation' | 'generate';

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export type AppMode = 'single' | 'batch';

export type BatchItemStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface BatchItem {
  id: string;
  file: File;
  originalDataUrl: string;
  mimeType: string;
  processedDataUrl: string | null;
  status: BatchItemStatus;
  error?: string;
}

export interface Pan {
  x: number;
  y: number;
}

export interface PresetPrompt {
  id: string;
  prompt: string;
}

export interface LoadedPreset extends PresetPrompt {
  displayName: string;
  category: PromptMode;
}

export type FilterType = 'none' | 'sepia' | 'grayscale' | 'vintage';

export interface FilterState {
  type: FilterType;
  intensity: number; // 0-100
}

export interface CropBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface EditState {
  actionKey: string;
  rotation: number;
  scaleX: number;
  straightenAngle: number;
  editZoom: number;
  editPan: Pan;
  cropBox: CropBox | null;
  filter: FilterState;
}

export interface Action {
  id: string;
  name: string;
  steps: string[]; // Array of preset prompt IDs
}

export interface AnalysisResult {
  description: string;
  suggestions: string[]; // Array of preset prompt IDs
}