import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTranslations } from '../hooks/useTranslations';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: 'en' | 'uk'; name: string, flag: string }[] = [
    { code: 'en', name: t.lang_en, flag: '🇺🇸' },
    { code: 'uk', name: t.lang_uk, flag: '🇺🇦' },
  ];

  const selectedLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-gray-700 text-gray-100 py-2 px-4 rounded-lg"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="flex items-center space-x-3">
          <span>{selectedLanguage.flag}</span>
          <span className="font-medium">{selectedLanguage.name}</span>
        </span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          className="absolute bottom-full mb-2 w-full bg-gray-600 rounded-lg shadow-lg z-10"
          role="listbox"
        >
          {languages.map(lang => (
            <li
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="flex items-center space-x-3 py-2 px-4 cursor-pointer hover:bg-gray-500 rounded-lg"
              role="option"
              aria-selected={language === lang.code}
            >
              <span>{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
