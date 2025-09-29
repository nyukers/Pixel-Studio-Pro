
import React from 'react';
import { useTranslations } from '../hooks/useTranslations';
import { EditState } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { UndoIcon } from './icons/UndoIcon';

interface HistoryPanelProps {
  history: EditState[];
  currentIndex: number;
  onJump: (index: number) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, currentIndex, onJump }) => {
  const t = useTranslations();

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-4 z-50 bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl w-56 max-h-[calc(100%-160px)] flex flex-col">
      <h3 className="text-lg font-semibold text-gray-200 p-3 border-b border-gray-700">{t.historyPanelTitle}</h3>
      <ul className="flex-grow overflow-y-auto p-2 space-y-1">
        {history.map((item, index) => {
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;
          const actionText = t[item.actionKey as keyof typeof t] || item.actionKey;
          
          return (
            <li key={index}>
              <button
                onClick={() => onJump(index)}
                className={`w-full flex items-center space-x-3 text-left p-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-yellow-400 text-gray-900 font-bold'
                    : isFuture 
                    ? 'text-gray-500 hover:bg-gray-700/50'
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {isActive ? <CheckIcon className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current"></div>}
                </div>
                <span className="truncate" title={actionText}>{actionText}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default HistoryPanel;
