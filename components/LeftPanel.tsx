

import React from 'react';
import ImageUploader from './ImageUploader';
import { PRESET_PROMPTS, IMAGINATION_PRESET_PROMPTS, ANIMATION_PRESET_PROMPTS } from '../constants';
import { RestoreIcon } from './icons/RestoreIcon';
import { ResetIcon } from './icons/ResetIcon';
import { PlusIcon } from './icons/PlusIcon';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useTranslations } from '../hooks/useTranslations';
import { PromptMode, AppMode, BatchItem, LoadedPreset, AspectRatio } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { SettingsIcon } from './icons/SettingsIcon';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ClearIcon } from './icons/ClearIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { EnhanceIcon } from './icons/EnhanceIcon';
import { CloudDownloadIcon } from './icons/CloudDownloadIcon';

interface LeftPanelProps {
  onFilesSelected: (files: File[]) => void;
  processingImageUrl: string | null;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  onRestore: () => void;
  isLoading: boolean;
  hasImage: boolean;
  onReset: () => void;
  isProcessingOriginal: boolean;
  customPrompts: string[];
  onAddCustomPrompt: (prompt: string) => void;
  onDeleteCustomPrompt: (prompt: string) => void;
  promptMode: PromptMode;
  setPromptMode: (mode: PromptMode) => void;
  isEditing: boolean;
  isMasking: boolean;
  onOpenSettings: () => void;
  isQuotaLimited: boolean;
  quotaCooldownRemaining: number;
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;
  batchItems: BatchItem[];
  isBatchProcessing: boolean;
  onStartBatch: () => void;
  onClearBatch: () => void;
  onRemoveBatchItem: (id: string) => void;
  onDownloadBatch: () => void;
  onLoadStyles: () => void;
  loadedPresets: Record<PromptMode, LoadedPreset[]>;
  animationAspectRatio: AspectRatio;
  setAnimationAspectRatio: (ratio: AspectRatio) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({
  onFilesSelected,
  processingImageUrl,
  prompt,
  setPrompt,
  onRestore,
  isLoading,
  hasImage,
  onReset,
  isProcessingOriginal,
  customPrompts,
  onAddCustomPrompt,
  onDeleteCustomPrompt,
  promptMode,
  setPromptMode,
  isEditing,
  isMasking,
  onOpenSettings,
  isQuotaLimited,
  quotaCooldownRemaining,
  appMode,
  setAppMode,
  batchItems,
  isBatchProcessing,
  onStartBatch,
  onClearBatch,
  onRemoveBatchItem,
  onDownloadBatch,
  onLoadStyles,
  loadedPresets,
  animationAspectRatio,
  setAnimationAspectRatio,
}) => {
  const t = useTranslations();
  const { language } = useLanguage();
  
  const currentPresets = (() => {
    switch(promptMode) {
      case 'retouch': return PRESET_PROMPTS;
      case 'imagination': return IMAGINATION_PRESET_PROMPTS;
      case 'animation': return ANIMATION_PRESET_PROMPTS;
      default: return PRESET_PROMPTS;
    }
  })();
  
  const currentLoadedPresets = loadedPresets[promptMode] || [];

  const allPresetPromptsFullText = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS, ...ANIMATION_PRESET_PROMPTS].map(p => p.prompt);
  const aspectRatios: AspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];

  const getButtonText = () => {
    if (isQuotaLimited) {
      return `${t.quotaLimitReached} (${quotaCooldownRemaining}s)`;
    }
    if (isLoading) {
      return t.processingBtn;
    }
    if (promptMode === 'animation') {
      return t.animateImageBtn;
    }
    return t.processImageBtn;
  };
  
  const getBatchButtonText = () => {
    if (isQuotaLimited) {
        return `${t.quotaLimitReached} (${quotaCooldownRemaining}s)`;
    }
    if (isBatchProcessing) {
        const completed = batchItems.filter(i => i.status === 'completed' || i.status === 'error').length;
        return `${t.processingBtn} (${completed}/${batchItems.length})`;
    }
    return t.startBatch;
  };

// Fix: The 'title' prop is not a standard SVG prop in some TypeScript definitions.
// To preserve the tooltip functionality while resolving the type error, wrap each icon in a `span` element
// and apply the `title` attribute to the span.
  const getStatusIcon = (status: BatchItem['status']) => {
      switch (status) {
          case 'pending': return <span title={t.pending}><ClockIcon className="w-5 h-5 text-gray-400" /></span>;
          case 'processing': return <span title={t.processingStatus}><SpinnerIcon className="w-5 h-5 text-yellow-400 animate-spin" /></span>;
          case 'completed': return <span title={t.completed}><CheckIcon className="w-5 h-5 text-green-400"/></span>;
          case 'error': return <span title={t.errorStatus}><XIcon className="w-5 h-5 text-red-400" /></span>;
      }
  };

  return (
    <div className="w-1/4 max-w-sm flex flex-col bg-gray-800 p-6 border-r border-gray-700 space-y-6 flex-shrink-0">
      <header className="flex items-start justify-between">
        <div>
            <h1 className={`font-bold text-yellow-400 whitespace-nowrap ${language === 'en' ? 'text-xl' : 'text-lg'}`}>
                <EnhanceIcon className="w-8 h-8 inline-block align-middle mr-2 text-yellow-300"/>
                {t.appTitle}
            </h1>
            <p className="text-sm text-gray-400">{t.appSubtitle}</p>
        </div>
        <button onClick={onOpenSettings} className="p-2 rounded-md hover:bg-gray-700 transition-colors" aria-label={t.settingsTitle}>
            <SettingsIcon className="w-6 h-6 text-gray-300"/>
        </button>
      </header>

      <div className="flex-shrink-0">
          <div className="flex rounded-lg bg-gray-900 p-1">
              <button onClick={() => setAppMode('single')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${appMode === 'single' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>{t.singleMode}</button>
              <button onClick={() => setAppMode('batch')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${appMode === 'batch' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}>{t.batchMode}</button>
          </div>
      </div>
      
      <div className="flex-grow flex flex-col space-y-6 overflow-y-auto pr-2 -mr-2">
        {appMode === 'single' ? (
          <>
            <ImageUploader onFilesSelected={onFilesSelected} currentImage={processingImageUrl} />
            <div>
                <div className="flex border-b border-gray-700 mb-4">
                    <button 
                        onClick={() => setPromptMode('retouch')}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${promptMode === 'retouch' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-gray-400 hover:text-gray-100'}`}
                    >
                        {t.retouchTab}
                    </button>
                    <button 
                        onClick={() => setPromptMode('imagination')}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${promptMode === 'imagination' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-gray-400 hover:text-gray-100'}`}
                    >
                        {t.imaginationTab}
                    </button>
                    <button 
                        onClick={() => setPromptMode('animation')}
                        className={`flex-1 py-2 text-sm font-semibold transition-colors ${promptMode === 'animation' ? 'text-yellow-300 border-b-2 border-yellow-300' : 'text-gray-400 hover:text-gray-100'}`}
                    >
                        {t.animationTab}
                    </button>
                </div>
                {promptMode === 'animation' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t.aspectRatioLabel}</label>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      {aspectRatios.map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => setAnimationAspectRatio(ratio)}
                          className={`py-2 rounded-md font-semibold transition ${
                            animationAspectRatio === ratio
                              ? 'bg-yellow-400 text-gray-900'
                              : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                          }`}
                        >
                          {ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-300 mb-2">
                {t.promptLabel}
              </label>
              <div className="relative">
                <textarea
                  id="prompt-input"
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 pr-10 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.promptPlaceholder}
                />
                <button 
                  onClick={() => onAddCustomPrompt(prompt)} 
                  disabled={!prompt.trim() || allPresetPromptsFullText.includes(prompt.trim())}
                  className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-yellow-400 bg-gray-800 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.saveCustomPromptTitle}
                >
                    <SaveIcon className="h-5 w-5"/>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">{t.presetPromptsTitle} ({currentPresets.length}):</h3>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {currentPresets.map((p) => (
                  <div key={p.id} className="flex items-center space-x-1">
                    <button
                      onClick={() => setPrompt(p.prompt)}
                      className={`flex-grow text-xs text-left p-2 rounded-l-md transition truncate ${
                        prompt === p.prompt
                          ? 'bg-yellow-400 text-gray-900 font-semibold'
                          : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                      }`}
                      title={p.prompt}
                    >
                      {t[p.id as keyof typeof t] || p.prompt}
                    </button>
                    <button
                        onClick={() => setPrompt(current => current ? `${current}, ${p.prompt}` : p.prompt)}
                        className="bg-gray-600 p-2 rounded-r-md hover:bg-yellow-400 hover:text-gray-900 transition"
                        aria-label={`${t.appendPromptLabel}: ${t[p.id as keyof typeof t]}`}
                        title={`${t.appendPromptTitle}: ${t[p.id as keyof typeof t]}`}
                    >
                        <PlusIcon className="h-4 w-4"/>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-300">{t.loadedStylesTitle}:</h3>
                    <button 
                      onClick={onLoadStyles} 
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 bg-gray-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t.loadPromptsTooltip}
                    >
                        <CloudDownloadIcon className="h-5 w-5"/>
                    </button>
                </div>
                <div className="space-y-2">
                    {currentLoadedPresets.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center italic">{t.noLoadedStyles}</p>
                    ) : currentLoadedPresets.map(p => (
                         <div key={p.id} className="flex items-center space-x-1">
                            <button
                              onClick={() => setPrompt(p.prompt)}
                              className={`flex-grow text-xs text-left p-2 rounded-l-md transition truncate ${
                                  prompt === p.prompt
                                  ? 'bg-yellow-400 text-gray-900 font-semibold'
                                  : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                              }`}
                              title={p.prompt}
                            >
                              {p.displayName}
                            </button>
                            <button
                                onClick={() => setPrompt(current => current ? `${current}, ${p.prompt}` : p.prompt)}
                                className="bg-gray-600 p-2 rounded-r-md hover:bg-yellow-400 hover:text-gray-900 transition"
                                aria-label={`${t.appendPromptLabel}: ${p.displayName}`}
                                title={`${t.appendPromptTitle}: ${p.displayName}`}
                            >
                                <PlusIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-sm font-medium text-gray-300 mb-2">{t.customPromptsTitle}:</h3>
                <div className="space-y-2">
                    {customPrompts.length === 0 && (
                        <p className="text-xs text-gray-400 text-center italic">{t.noCustomPrompts}</p>
                    )}
                    {customPrompts.map(p => (
                         <div key={p} className="flex items-center space-x-1">
                            <button
                              onClick={() => setPrompt(p)}
                              className={`flex-grow text-xs text-left p-2 rounded-l-md transition truncate ${
                                  prompt === p
                                  ? 'bg-yellow-400 text-gray-900 font-semibold'
                                  : 'bg-gray-700 text-gray-100 hover:bg-gray-600'
                              }`}
                              title={p}
                            >
                              {p}
                            </button>
                            <button
                                onClick={() => setPrompt(current => current ? `${current}, ${p}` : p)}
                                className="bg-gray-600 p-2 hover:bg-yellow-400 hover:text-gray-900 transition"
                                aria-label={`${t.appendPromptLabel}: ${p}`}
                                title={`${t.appendPromptTitle}: ${p}`}
                            >
                                <PlusIcon className="h-4 w-4"/>
                            </button>
                            <button
                                onClick={() => onDeleteCustomPrompt(p)}
                                className="bg-gray-600 p-2 rounded-r-md hover:bg-red-500 transition"
                                aria-label={`${t.deletePromptLabel}: ${p}`}
                                title={`${t.deletePromptTitle}: ${p}`}
                            >
                                <TrashIcon className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
          </>
        ) : (
          <>
            <ImageUploader onFilesSelected={onFilesSelected} currentImage={null} multiple={true}/>
            <div className="flex-grow flex flex-col space-y-3">
                <h3 className="text-sm font-medium text-gray-300">{t.batchQueue} ({batchItems.length})</h3>
                <div className="flex-grow bg-gray-900/50 rounded-lg p-2 space-y-2 overflow-y-auto">
                    {batchItems.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 pt-4">{t.batchQueueEmpty}</p>
                    ) : batchItems.map(item => (
                        <div key={item.id} className="flex items-center bg-gray-700 p-2 rounded-md space-x-3">
                           <img src={item.originalDataUrl} alt={item.file.name} className="w-10 h-10 object-cover rounded-md flex-shrink-0" />
                           <div className="flex-grow overflow-hidden">
                                <p className="text-xs text-gray-200 truncate font-medium" title={item.file.name}>{item.file.name}</p>
                                {item.status === 'error' && item.error ? (
                                    <p className="text-xs text-red-400 truncate" title={item.error}>{item.error}</p>
                                ): (
                                    <p className="text-xs text-gray-400 capitalize">{t[item.status]}</p>
                                )}
                           </div>
                           <div className="flex-shrink-0">{getStatusIcon(item.status)}</div>
                           <button 
                             onClick={() => onRemoveBatchItem(item.id)} 
                             disabled={isBatchProcessing}
                             className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed"
                             title={t.removeItemFromBatch}
                           >
                               <XIcon className="w-4 h-4" />
                           </button>
                        </div>
                    ))}
                </div>
            </div>
          </>
        )}

      </div>
      
      {appMode === 'single' ? (
          <div className="space-y-3 pt-4 border-t border-gray-700">
             <button
                onClick={onReset}
                disabled={isProcessingOriginal || !hasImage || isLoading}
                className="w-full flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
                <ResetIcon className="h-5 w-5 mr-2"/>
                {t.resetToOriginalBtn}
            </button>
            <button
              onClick={onRestore}
              disabled={!hasImage || isLoading || isEditing || isMasking || isQuotaLimited}
              className="w-full flex items-center justify-center bg-yellow-400 text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-300 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              <RestoreIcon className="h-5 w-5 mr-2"/>
              {getButtonText()}
            </button>
          </div>
      ) : (
        <div className="space-y-3 pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
                <button
                  onClick={onDownloadBatch}
                  disabled={isBatchProcessing || !batchItems.some(i => i.status === 'completed')}
                  className="flex-1 flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-3 text-sm rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <DownloadIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="truncate">{t.downloadAll}</span>
                </button>
                <button
                  onClick={onClearBatch}
                  disabled={isBatchProcessing || batchItems.length === 0}
                  className="flex-1 flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-3 text-sm rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                    <ClearIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                    <span className="truncate">{t.clearBatch}</span>
                </button>
            </div>
            <button
              onClick={onStartBatch}
              disabled={isBatchProcessing || !batchItems.some(i => i.status === 'pending') || isQuotaLimited}
              className="w-full flex items-center justify-center bg-yellow-400 text-gray-900 font-bold py-3 px-4 rounded-lg shadow-md hover:bg-yellow-300 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:text-gray-400 transition-all duration-300 ease-in-out transform hover:scale-105"
            >
              <RestoreIcon className="h-5 w-5 mr-2"/>
              {getBatchButtonText()}
            </button>
        </div>
      )}
    </div>
  );
};

export default LeftPanel;