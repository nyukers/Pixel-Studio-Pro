import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { XIcon } from './icons/XIcon';
import { EnhanceIcon } from './icons/EnhanceIcon';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const linkify = (text: string): React.ReactNode[] => {
    const urlRegex = /(https?:\/\/[^\s"'<>()]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
        if (part.match(urlRegex)) {
            // Trim trailing punctuation from the link text and the href for cleaner links
            const cleanHref = part.replace(/[.,)!?]*$/, '');
            const trailingChars = part.substring(cleanHref.length);
            return (
                <React.Fragment key={index}>
                    <a
                        href={cleanHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-300 hover:text-yellow-200 underline"
                    >
                        {cleanHref}
                    </a>
                    {trailingChars}
                </React.Fragment>
            );
        }
        return part;
    });
};


const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const t = useTranslations();

  if (!isOpen) {
    return null;
  }

  // Split description into paragraphs based on newline characters
  const descriptionLines = t.welcomeModalDescription.split('\n');

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100]" // Higher z-index to be on top
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg text-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <EnhanceIcon className="w-8 h-8 text-yellow-300" />
            <h2 className="text-2xl font-bold text-gray-300">{t.welcomeModalTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-2 text-gray-300 max-h-[60vh] overflow-y-auto pr-4 -mr-4">
          {descriptionLines.map((line, index) => {
            if (line.trim() === '') {
                return <div key={index} className="h-2" />; // Spacer for paragraph breaks
            }
            if (line.startsWith('- ')) {
                return (
                    <div key={index} className="flex">
                        <span className="mr-2 text-yellow-300">&bull;</span>
                        <p>{linkify(line.substring(2))}</p>
                    </div>
                );
            }
            return <p key={index}>{linkify(line)}</p>;
          })}
        </div>

        <div className="mt-8 flex justify-end">
            <button 
                onClick={onClose} 
                className="py-2 px-6 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition font-bold"
            >
                {t.welcomeModalButton}
            </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;