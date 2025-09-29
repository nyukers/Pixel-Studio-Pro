import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { XIcon } from './icons/XIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
  stylesUrl: string;
  onStylesUrlChange: (value: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    systemInstruction, 
    onSystemInstructionChange,
    stylesUrl,
    onStylesUrlChange
}) => {
  const t = useTranslations();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-300">{t.settingsTitle}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
            <div>
                <label htmlFor="system-instruction-input" className="block text-sm font-medium text-gray-300 mb-2">{t.systemInstructionLabel}</label>
                <textarea
                    id="system-instruction-input"
                    rows={3}
                    value={systemInstruction}
                    onChange={(e) => onSystemInstructionChange(e.target.value)}
                    placeholder={t.systemInstructionPlaceholder}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                />
                <p className="text-xs text-gray-400 mt-2">{t.systemInstructionTooltip}</p>
            </div>
            <div>
                <label htmlFor="styles-url-input" className="block text-sm font-medium text-gray-300 mb-2">{t.stylesUrlLabel}</label>
                 <input
                    id="styles-url-input"
                    type="url"
                    value={stylesUrl}
                    onChange={(e) => onStylesUrlChange(e.target.value)}
                    placeholder={t.stylesUrlPlaceholder}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                />
                <p className="text-xs text-gray-400 mt-2">{t.stylesUrlTooltip}</p>
            </div>
        </div>

        <div className="mt-8 flex justify-end">
            <button 
                onClick={onClose} 
                className="py-2 px-6 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition font-bold"
            >
                {t.okBtn}
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;