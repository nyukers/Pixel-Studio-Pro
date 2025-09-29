
import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface UpscalingModalProps {
  isOpen: boolean;
}

const UpscalingModal: React.FC<UpscalingModalProps> = ({ isOpen }) => {
  const t = useTranslations();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-sm text-gray-100 flex flex-col items-center"
      >
        <SpinnerIcon className="w-12 h-12 text-yellow-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-300 mb-2">{t.upscalingModalTitle}</h2>
        <p className="text-sm text-gray-400 text-center">{t.upscalingModalBody}</p>
      </div>
    </div>
  );
};

export default UpscalingModal;
