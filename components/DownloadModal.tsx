
import React, { useState, useEffect } from 'react';
import { ResultItem } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { XIcon } from './icons/XIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ResultItem | null;
  isUpscaling: boolean;
  onConfirmDownload: (format: 'png' | 'jpeg', quality: number, metadata: string) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose, result, isUpscaling, onConfirmDownload }) => {
  const t = useTranslations();
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState(92);
  const [metadata, setMetadata] = useState('');

  useEffect(() => {
    // When the modal becomes visible, reset its local state for a clean slate.
    if (isOpen) {
      setFormat('png');
      setQuality(92);
      setMetadata('');
    }
  }, [isOpen, result]); // Dependency on `result` ensures reset if item changes while modal is open.


  if (!isOpen || !result) {
    return null;
  }

  const handleDownloadClick = () => {
    onConfirmDownload(format, quality, metadata);
  };

  const isVideo = !!result.videoUrl;

  const getTitle = () => {
    if (isUpscaling) {
      return t.upscaleAndDownloadTitle;
    }
    return t.downloadImageTitle;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-300">{getTitle()}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
            <div className="flex justify-center items-center bg-black/20 rounded-lg p-2 max-h-64">
                <img src={result.imageUrl} alt={t.downloadPreviewAlt} className="max-h-full max-w-full object-contain rounded"/>
            </div>
            
            {!isVideo && (
              <>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">{t.formatLabel}</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setFormat('png')} className={`py-2 px-4 rounded-md text-sm font-semibold transition ${format === 'png' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}>PNG</button>
                        <button onClick={() => setFormat('jpeg')} className={`py-2 px-4 rounded-md text-sm font-semibold transition ${format === 'jpeg' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 hover:bg-gray-600'}`}>JPEG</button>
                    </div>
                </div>

                {format === 'jpeg' && (
                  <>
                    <div>
                        <label htmlFor="quality-slider" className="block text-sm font-medium text-gray-300 mb-2">{t.qualityLabel} ({quality}%)</label>
                        <input 
                            id="quality-slider"
                            type="range"
                            min="1"
                            max="100"
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-400"
                        />
                    </div>
                    <div>
                        <label htmlFor="metadata-input" className="block text-sm font-medium text-gray-300 mb-2">{t.metadataLabel}</label>
                        <textarea
                            id="metadata-input"
                            rows={3}
                            value={metadata}
                            onChange={(e) => setMetadata(e.target.value)}
                            placeholder={t.metadataPlaceholder}
                            className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                        />
                    </div>
                  </>
                )}
              </>
            )}
        </div>
        <div className="mt-8 flex justify-end space-x-3">
            <button onClick={onClose} className="py-2 px-4 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition font-semibold">{t.cancelBtn}</button>
            <button onClick={handleDownloadClick} className="py-2 px-4 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition font-bold flex items-center space-x-2">
                <DownloadIcon className="w-5 h-5"/>
                <span>{t.downloadBtn}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;