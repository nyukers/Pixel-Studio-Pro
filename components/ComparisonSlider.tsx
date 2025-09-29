
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pan } from '../types';
import { useTranslations } from '../hooks/useTranslations';

interface ComparisonSliderProps {
  before: string;
  after: string;
  zoom: number;
  pan: Pan;
  beforeImageDimensions: { width: number; height: number } | null;
  afterImageDimensions: { width: number; height: number } | null;
  onPanMouseDown: (e: React.MouseEvent) => void;
  isPanning: boolean;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ 
  before, 
  after, 
  zoom, 
  pan, 
  beforeImageDimensions, 
  afterImageDimensions,
  onPanMouseDown,
  isPanning
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isSliding = useRef(false);
  const t = useTranslations();

  const handleSliderMove = useCallback((clientX: number) => {
    if (!isSliding.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let pos = ((clientX - rect.left) / rect.width) * 100;
    pos = Math.max(0, Math.min(100, pos));
    setSliderPosition(pos);
  }, []);
  
  const handleSliderStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    isSliding.current = true;
    handleSliderMove(e.clientX);
  }, [handleSliderMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    isSliding.current = true;
    handleSliderMove(e.touches[0].clientX);
  }, [handleSliderMove]);
  
  const handleInteractionEnd = useCallback(() => {
    isSliding.current = false;
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    handleSliderMove(e.clientX);
  }, [handleSliderMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    handleSliderMove(e.touches[0].clientX);
  }, [handleSliderMove]);
  
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleInteractionEnd);
    window.addEventListener('touchend', handleInteractionEnd);
    el.addEventListener('touchmove', handleTouchMove);
    

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleInteractionEnd);
      window.removeEventListener('touchend', handleInteractionEnd);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleMouseMove, handleInteractionEnd, handleTouchMove]);

  const scaleCorrection = (beforeImageDimensions && afterImageDimensions && beforeImageDimensions.width > 0)
    ? afterImageDimensions.width / beforeImageDimensions.width
    : 1;

  const baseTransform = `translate(${pan.x}px, ${pan.y}px)`;

  const beforeTransformStyle = { transform: `${baseTransform} scale(${zoom * scaleCorrection})` };
  const afterTransformStyle = { transform: `${baseTransform} scale(${zoom})` };

  const clipStyle = { clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` };

  return (
    <div 
        ref={containerRef}
        className={`relative w-full h-full select-none overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onPanMouseDown}
    >
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {/* Swapped: 'after' is background (visible on right), 'before' is foreground (visible on left) */}
        <img
          src={after}
          alt={t.afterLabel}
          style={afterTransformStyle}
          className="max-w-none max-h-none w-auto h-auto object-contain"
          draggable="false"
        />
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center"
          style={clipStyle}
        >
          <img
            src={before}
            alt={t.beforeLabel}
            style={{...beforeTransformStyle, position: 'absolute'}}
            className="max-w-none max-h-none w-auto h-auto object-contain"
            draggable="false"
          />
        </div>
      </div>

      {/* Clipped container for 'Before' label, so it's only visible on the left side */}
      <div className="absolute inset-0 pointer-events-none" style={clipStyle}>
        <div className="absolute top-2 left-2 z-20 bg-black/50 text-gray-100 text-sm px-2 py-1 rounded-md">
            <h3 className="font-semibold">{t.beforeLabel}</h3>
            {beforeImageDimensions && (
              <p className="text-xs text-gray-300">{`${beforeImageDimensions.width} x ${beforeImageDimensions.height} px`}</p>
            )}
        </div>
      </div>

      {/* Un-clipped container for 'After' label, so it's always visible on the right side */}
      <div className="absolute top-2 right-2 z-20 bg-black/50 text-sm px-2 py-1 rounded-md pointer-events-none">
          <h3 className="font-semibold text-yellow-300">{t.afterLabel}</h3>
          {afterImageDimensions && (
              <p className="text-xs text-gray-100">{`${afterImageDimensions.width} x ${afterImageDimensions.height} px`}</p>
          )}
      </div>
      
      <div
        className="absolute top-0 bottom-0 w-1 bg-yellow-400 -translate-x-1/2 z-30 cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleSliderStart}
        onTouchStart={handleTouchStart}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg pointer-events-none">
            <svg className="w-7 h-7 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" transform="rotate(90 12 12)" />
            </svg>
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;
