
import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { useTranslations } from '../hooks/useTranslations';

interface ImageUploaderProps {
  onFilesSelected: (files: File[]) => void;
  currentImage: string | null;
  multiple?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFilesSelected, currentImage, multiple = false }) => {
  const t = useTranslations();
  const [isDragging, setIsDragging] = useState(false);
  
  const handleFiles = useCallback((files: FileList | null) => {
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        onFilesSelected(imageFiles);
      } else {
        alert(t.invalidFileError);
      }
    }
  }, [onFilesSelected, t]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset file input to allow re-uploading the same file(s)
    e.target.value = '';
  };

  return (
    <div>
      <label htmlFor="file-upload-input" className="block text-sm font-medium text-gray-300 mb-2">
        {t.sourceImageLabel}
      </label>
      <label
        htmlFor="file-upload-input"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex justify-center items-center w-full h-48 px-1 pt-1 pb-1 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
          isDragging ? 'border-yellow-400 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500'
        }`}
      >
        {currentImage && !multiple ? (
            <img src={currentImage} alt={t.currentSourceAlt} className="h-full w-full object-contain rounded-md" />
        ) : (
            <div className="space-y-1 text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-gray-500" />
                <div className="flex text-sm text-gray-400">
                    <p className="pl-1" dangerouslySetInnerHTML={{ __html: multiple ? t.dropOrBrowseMulti : t.dragDropOrBrowse }} />
                </div>
                <p className="text-xs text-gray-500">{t.supportedFormats}</p>
            </div>
        )}
        <input id="file-upload-input" name="file-upload" type="file" className="sr-only" onChange={handleChange} accept="image/*" multiple={multiple} />
      </label>
    </div>
  );
};

export default ImageUploader;
