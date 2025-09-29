import React from 'react';
import ImageUploader from './ImageUploader';
import { PRESET_PROMPTS, IMAGINATION_PRESET_PROMPTS, ANIMATION_PRESET_PROMPTS, GENERATE_PRESET_PROMPTS } from '../constants';
import { RestoreIcon } from './icons/RestoreIcon';
import { ResetIcon } from './icons/ResetIcon';
import { PlusIcon } from './icons/PlusIcon';
import { SaveIcon } from './icons/SaveIcon';
import { TrashIcon } from './icons/TrashIcon';
import { useTranslations } from '../hooks/useTranslations';
import { PromptMode, AppMode, BatchItem, LoadedPreset, AspectRatio, Action, AnalysisResult } from '../types';
import { SettingsIcon } from './icons/SettingsIcon';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ClearIcon } from './icons/ClearIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { EnhanceIcon } from './icons/EnhanceIcon';
import { CloudDownloadIcon } from './icons/CloudDownloadIcon';
import { WorkflowIcon } from './icons/WorkflowIcon';
import { PlayIcon } from './icons/PlayIcon';
import { EditIcon } from './icons/EditIcon';
import { WandIcon } from './icons/WandIcon';

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
  generateAspectRatio: AspectRatio;
  setGenerateAspectRatio: (ratio: AspectRatio) => void;
  numberOfImages: number;
  setNumberOfImages: (num: number) => void;
  actions: Action[];
  onRunAction: (action: Action) => void;
  onOpenActionEditor: (action: Action | null) => void;
  onDeleteAction: (actionId: string) => void;
  isAnalyzing: boolean;
  onAnalyzeImage: () => void;
  analysisResult: AnalysisResult | null;
  onDismissAnalysis: () => void;
  removeBgTolerance: number;
  setRemoveBgTolerance: (value: number) => void;
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
  generateAspectRatio,
  setGenerateAspectRatio,
  numberOfImages,
  setNumberOfImages,
  actions,
  onRunAction,
  onOpenActionEditor,
  onDeleteAction,
  isAnalyzing,
  onAnalyzeImage,
  analysisResult,
  onDismissAnalysis,
  removeBgTolerance,
  setRemoveBgTolerance,
}) => {
  const t = useTranslations();
  
  const currentPresets = (() => {
    switch(promptMode) {
      case 'retouch': return PRESET_PROMPTS;
      case 'imagination': return IMAGINATION_PRESET_PROMPTS;
      case 'animation': return ANIMATION_PRESET_PROMPTS;
      case 'generate': return GENERATE_PRESET_PROMPTS;
      default: return [];
    }
  })();
  
  const currentLoadedPresets = loadedPresets[promptMode] || [];

  const allPresetPromptsFullText = [...PRESET_PROMPTS, ...IMAGINATION_PRESET_PROMPTS, ...ANIMATION_PRESET_PROMPTS, ...GENERATE_PRESET_PROMPTS].map(p => p.prompt);
  const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const suggestedPresetIds = analysisResult?.suggestions || [];

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
    if (promptMode === 'generate') {
        return t.generateImageBtn;
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
            <h1 className="text-xl font-bold text-yellow-400 whitespace-nowrap">
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
            {promptMode !== 'generate' && <ImageUploader onFilesSelected={onFilesSelected} currentImage={processingImageUrl} />}
            <div>
                <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-gray-900 rounded-lg">
                    <button 
                        onClick={() => setPromptMode('generate')}
                        className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${promptMode === 'generate' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {t.generateTab}
                    </button>
                    <button 
                        onClick={() => setPromptMode('retouch')}
                        className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${promptMode === 'retouch' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {t.retouchTab}
                    </button>
                    <button 
                        onClick={() => setPromptMode('imagination')}
                        className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${promptMode === 'imagination' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {t.imaginationTab}
                    </button>
                    <button 
                        onClick={() => setPromptMode('animation')}
                        className={`w-full py-1.5 text-sm font-semibold rounded-md transition-colors ${promptMode === 'animation' ? 'bg-yellow-400 text-gray-900' : 'text-gray-400 hover:bg-gray-700'}`}
                    >
                        {t.animationTab}
                    </button>
                </div>

                {(promptMode === 'animation' || promptMode === 'generate') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t.aspectRatioLabel}</label>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      {aspectRatios.map(ratio => (
                        <button
                          key={ratio}
                          onClick={() => promptMode === 'animation' ? setAnimationAspectRatio(ratio) : setGenerateAspectRatio(ratio)}
                          className={`py-2 rounded-md font-semibold transition ${
                            (promptMode === 'animation' ? animationAspectRatio : generateAspectRatio) === ratio
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
                
                {promptMode === 'generate' && (
                    <div className="mb-4">
                        <label htmlFor="num-images-slider" className="block text-sm font-medium text-gray-300 mb-2">
                        {t.numberOfImagesLabel} ({numberOfImages})
                        </label>
                        <input
                        id="num-images-slider"
                        type="range"
                        min="1"
                        max="4"
                        step="1"
                        value={numberOfImages}
                        onChange={e => setNumberOfImages(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
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

              {promptMode === 'retouch' && prompt === PRESET_PROMPTS.find(p => p.id === 'retouch_remove_background')?.prompt && (
                <div className="mt-4">
                  <label htmlFor="remove-bg-tolerance" className="block text-sm font-medium text-gray-300 mb-2">
                    {t.removeBgToleranceLabel} ({removeBgTolerance})
                  </label>
                  <input
                    id="remove-bg-tolerance"
                    type="range"
                    min="0"
                    max="100"
                    value={removeBgTolerance}
                    onChange={e => setRemoveBgTolerance(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                  />
                </div>
              )}
            </div>

            {appMode === 'single' && promptMode !== 'animation' && promptMode !== 'generate' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center"><WorkflowIcon className="w-5 h-5 mr-2" />{t.actionsTitle}:</h3>
                    <button 
                      onClick={() => onOpenActionEditor(null)}
                      disabled={isLoading}
                      className="p-1.5 text-gray-400 hover:text-yellow-400 bg-gray-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={t.createAction}
                    >
                        <PlusIcon className="h-5 w-5"/>
                    </button>
                </div>
                <div className="space-y-2">
                  {actions.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center italic">{t.noActions}</p>
                  ) : (
                    actions.map(action => (
                      <div key={action.id} className="flex items-center space-x-1">
                          <button
                            onClick={() => onRunAction(action)}
                            disabled={isLoading || !hasImage}
                            className="flex-grow text-xs text-left p-2 rounded-l-md transition truncate bg-gray-700 text-gray-100 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            title={`${t.runAction}: ${action.name}`}
                          >
                            <PlayIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{action.name}</span>
                          </button>
                           <button
                              onClick={() => onOpenActionEditor(action)}
                              className="bg-gray-600 p-2 hover:bg-yellow-400 hover:text-gray-900 transition"
                              title={t.editAction}
                          >
                              <EditIcon className="h-4 w-4"/>
                          </button>
                          <button
                              onClick={() => onDeleteAction(action.id)}
                              className="bg-gray-600 p-2 rounded-r-md hover:bg-red-500 transition"
                              title={t.deleteAction}
                          >
                              <TrashIcon className="h-4 w-4"/>
                          </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-300">{t.presetPromptsTitle} ({currentPresets.length}):</h3>
                <button
                  onClick={onAnalyzeImage}
                  disabled={isLoading || isAnalyzing || !hasImage || promptMode === 'animation' || promptMode === 'generate'}
                  className="p-1.5 text-gray-400 hover:text-yellow-400 bg-gray-700 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t.analyzeImage}
                >
                  {isAnalyzing ? <SpinnerIcon className="h-5 w-5 animate-spin" /> : <WandIcon className="h-5 w-5"/>}
                </button>
              </div>

              {analysisResult && (
                  <div className="mb-4 p-3 bg-gray-900/50 border border-yellow-400/30 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-sm font-semibold text-yellow-300">{t.aiSuggestionsTitle}</h4>
                        <button onClick={onDismissAnalysis} className="text-xs text-gray-400 hover:text-gray-100">&times; {t.dismissSuggestions}</button>
                      </div>
                      <p className="text-xs text-gray-300 italic mb-2">"{analysisResult.description}"</p>
                      <p className="text-xs text-gray-400">{t.presetPromptsTitle}:</p>
                  </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                {currentPresets.map((p) => (
                  <div key={p.id} className="flex items-center space-x-1">
                    <button
                      onClick={() => setPrompt(p.prompt)}
                      className={`flex-grow text-xs text-left p-2 rounded-l-md transition truncate ${
                        prompt === p.prompt
                          ? 'bg-yellow-400 text-gray-900 font-semibold'
                          : suggestedPresetIds.includes(p.id)
                          ? 'bg-yellow-800/50 text-yellow-200 hover:bg-yellow-700/50 ring-1 ring-yellow-400'
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
             {promptMode !== 'generate' && (
                <button
                    onClick={onReset}
                    disabled={isProcessingOriginal || !hasImage || isLoading}
                    className="w-full flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                    <ResetIcon className="h-5 w-5 mr-2"/>
                    {t.resetToOriginalBtn}
                </button>
             )}
            <button
              onClick={onRestore}
              disabled={(promptMode !== 'generate' && !hasImage) || isLoading || isEditing || isMasking || isQuotaLimited}
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