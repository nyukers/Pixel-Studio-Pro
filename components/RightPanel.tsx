import React from 'react';
import { ResultItem } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ClearIcon } from './icons/ClearIcon';
import { SendToBackIcon } from './icons/SendToBackIcon';
import { useTranslations } from '../hooks/useTranslations';
import { UpscaleIcon } from './icons/UpscaleIcon';
import { TrashIcon } from './icons/TrashIcon';
import { FrameIcon } from './icons/FrameIcon';

interface RightPanelProps {
  results: ResultItem[];
  selectedResultId: string | null;
  onSelectResult: (result: ResultItem) => void;
  onUseAsSource: (result: ResultItem) => void;
  onDownloadResult: (result: ResultItem) => void;
  onUpscaleAndDownload: (result: ResultItem) => void;
  onDeleteResult: (result: ResultItem) => void;
  onClearAll: () => void;
  isLoading: boolean;
  onExportFrame: (result: ResultItem) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
  results,
  selectedResultId,
  onSelectResult,
  onUseAsSource,
  onDownloadResult,
  onUpscaleAndDownload,
  onDeleteResult,
  onClearAll,
  isLoading,
  onExportFrame,
}) => {
  const t = useTranslations();
  const selectedResult = results.find(r => r.id === selectedResultId);

  const getPromptText = (result: ResultItem) => {
      if (result.prompt === 'Original Image') return t.originalImage;
      if (result.prompt === 'Image Edited') return t.imageEdited;
      if (result.prompt === t.lastFrameFromVideo) return t.lastFrameFromVideo;
      return result.prompt;
  }

  const getUseAsSourceTitle = (result: ResultItem) => {
    return result.prompt === 'Original Image' ? t.resetToThisSource : t.useAsSourceTitle;
  }

  return (
    <div className="w-1/4 max-w-xs flex flex-col bg-gray-800 p-4 border-l border-gray-700 flex-shrink-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-300">{t.historyTitle}</h2>
      <div className="flex-grow overflow-y-auto space-y-3 pr-2 -mr-2">
        {results.length === 0 ? (
          <p className="text-gray-400 text-sm mt-4 text-center">{t.historyEmpty}</p>
        ) : (
          results.map((result) => {
            const isVideo = !!result.videoUrl;
            return (
              <div
                key={result.id}
                onClick={() => onSelectResult(result)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedResultId === result.id ? 'border-yellow-400 shadow-lg' : 'border-transparent hover:border-gray-600'
                }`}
              >
                <img 
                  src={result.imageUrl} 
                  alt={t.restoredThumbnailAlt} 
                  className="w-full h-auto object-cover" 
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 backdrop-blur-sm">
                  <p className="text-xs text-gray-100 truncate" title={result.prompt}>
                      {getPromptText(result)}
                  </p>
                </div>
                
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isVideo && (
                      <button 
                          onClick={(e) => { e.stopPropagation(); onExportFrame(result); }}
                          title={t.exportLastFrameTitle}
                          className="bg-gray-900/50 p-2 rounded-full text-gray-100 hover:bg-yellow-400 hover:text-gray-900 transition-all"
                      >
                          <FrameIcon className="w-5 h-5" />
                      </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpscaleAndDownload(result); }}
                        title={t.upscaleAndDownloadTitle}
                        disabled={isVideo}
                        className="bg-gray-900/50 p-2 rounded-full text-gray-100 hover:bg-yellow-400 hover:text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <UpscaleIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDownloadResult(result); }}
                        title={t.downloadThisImage}
                        className="bg-gray-900/50 p-2 rounded-full text-gray-100 hover:bg-yellow-400 hover:text-gray-900 transition-all"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUseAsSource(result); }}
                        title={getUseAsSourceTitle(result)}
                        disabled={isVideo}
                        className="bg-gray-900/50 p-2 rounded-full text-gray-100 hover:bg-yellow-400 hover:text-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <SendToBackIcon className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteResult(result); }}
                        title={t.deleteImageTitle}
                        disabled={result.prompt === 'Original Image'}
                        className="bg-gray-900/50 p-2 rounded-full text-gray-100 hover:bg-red-500 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
              </div>
            )
          })
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-700 space-y-3">
        <button
          onClick={() => selectedResult && onUpscaleAndDownload(selectedResult)}
          disabled={!selectedResult || isLoading || !!selectedResult?.videoUrl}
          className="w-full flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-3 text-sm rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
            <UpscaleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="truncate">{t.upscale2xBtn}</span>
        </button>
        <button
          onClick={onClearAll}
          disabled={results.length === 0}
          className="w-full flex items-center justify-center bg-gray-700 text-gray-300 font-bold py-2 px-4 rounded-lg hover:bg-red-600 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-700 transition"
        >
          <ClearIcon className="h-5 w-5 mr-2" />
          {t.clearAllBtn}
        </button>
      </div>
    </div>
  );
};

export default RightPanel;