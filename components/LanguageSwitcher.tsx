import React from 'react';
import { useTranslations } from '../hooks/useTranslations';

const LanguageSwitcher: React.FC = () => {
  const t = useTranslations();

  return (
    <div className="relative w-full">
      <div
        className="w-full flex items-center justify-between bg-gray-700 text-gray-100 py-2 px-4 rounded-lg"
      >
        <span className="flex items-center space-x-3">
          <span>🇺🇸</span>
          <span className="font-medium">{t.lang_en}</span>
        </span>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
