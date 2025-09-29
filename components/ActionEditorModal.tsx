import React, { useState, useEffect } from 'react';
import { Action, LoadedPreset } from '../types';
import { useTranslations } from '../hooks/useTranslations';
import { XIcon } from './icons/XIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PlusIcon } from './icons/PlusIcon';

interface ActionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (action: Action) => void;
  actionToEdit: Action | null;
  availablePresets: LoadedPreset[];
}

const ActionEditorModal: React.FC<ActionEditorModalProps> = ({ isOpen, onClose, onSave, actionToEdit, availablePresets }) => {
  const t = useTranslations();
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<string[]>([]);
  const [nextStep, setNextStep] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (actionToEdit) {
        setName(actionToEdit.name);
        setSteps(actionToEdit.steps);
      } else {
        setName('');
        setSteps([]);
      }
      setNextStep(availablePresets.length > 0 ? availablePresets[0].id : '');
    }
  }, [isOpen, actionToEdit, availablePresets]);

  if (!isOpen) {
    return null;
  }
  
  const handleAddStep = () => {
    if (nextStep) {
      setSteps(prev => [...prev, nextStep]);
    }
  };

  const handleRemoveStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleSave = () => {
    if (!name.trim() || steps.length === 0) {
      alert("Action name and at least one step are required.");
      return;
    }
    const action: Action = {
      id: actionToEdit?.id || `action-${Date.now()}`,
      name,
      steps
    };
    onSave(action);
  };
  
  const getPresetDisplayName = (presetId: string): string => {
    const preset = availablePresets.find(p => p.id === presetId);
    return preset?.displayName || presetId;
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg text-gray-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-300">{actionToEdit ? t.editAction : t.createAction}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6 flex-grow overflow-y-auto pr-2 -mr-4" style={{maxHeight: '70vh'}}>
          <div>
            <label htmlFor="action-name" className="block text-sm font-medium text-gray-300 mb-2">{t.actionNameLabel}</label>
            <input 
              id="action-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t.actionNamePlaceholder}
              className="w-full bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t.actionStepsLabel} ({steps.length})</label>
            <div className="space-y-2 bg-gray-900/50 p-3 rounded-lg max-h-64 overflow-y-auto">
              {steps.map((stepId, index) => (
                <div key={`${stepId}-${index}`} className="flex items-center justify-between bg-gray-700 p-2 rounded-md">
                  <span className="text-sm truncate"><span className="font-mono text-xs text-gray-400 mr-2">{index + 1}.</span>{getPresetDisplayName(stepId)}</span>
                  <button onClick={() => handleRemoveStep(index)} className="p-1 text-gray-400 hover:text-red-400 transition">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {steps.length === 0 && <p className="text-sm text-gray-400 text-center italic">{t.noCustomPrompts}</p>}
            </div>
            <div className="flex items-center space-x-2 mt-3">
              <select 
                value={nextStep} 
                onChange={e => setNextStep(e.target.value)}
                className="flex-grow bg-gray-900 border border-gray-600 rounded-md p-2 text-gray-100 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
              >
                <optgroup label={t.retouchTab}>
                    {availablePresets.filter(p => p.category === 'retouch').map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </optgroup>
                 <optgroup label={t.imaginationTab}>
                    {availablePresets.filter(p => p.category === 'imagination').map(p => <option key={p.id} value={p.id}>{p.displayName}</option>)}
                </optgroup>
              </select>
              <button onClick={handleAddStep} className="p-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition">
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button 
                onClick={onClose} 
                className="py-2 px-4 bg-gray-600 text-gray-200 rounded-lg hover:bg-gray-500 transition font-semibold"
            >
                {t.cancelBtn}
            </button>
             <button 
                onClick={handleSave} 
                className="py-2 px-6 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-300 transition font-bold"
            >
                {t.saveAction}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ActionEditorModal;
