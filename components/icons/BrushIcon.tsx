
import React from 'react';

export const BrushIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        {...props}
    >
        <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M7.864 4.243A7.5 7.5 0 0119.5 12c0 2.42-.944 4.62-2.5 6.252m-2.5-6.252v2.522m0-2.522a2.5 2.5 0 012.5-2.522m-2.5 2.522a2.5 2.5 0 00-2.5 2.522m2.5-2.522V6.522c0-1.056-.59-2.012-1.5-2.522m-2.5 2.522a2.5 2.5 0 01-2.5-2.522M7.864 4.243a2.5 2.5 0 00-2.5 2.522m0 0V9.522c0 1.056.59 2.012 1.5 2.522m-2.5-2.522a2.5 2.5 0 002.5-2.522m-5 5.044V6.522c0-1.056.59-2.012 1.5-2.522m-1.5 2.522a2.5 2.5 0 012.5-2.522m-2.5 2.522a2.5 2.5 0 00-2.5 2.522m2.5 2.522V15m0-2.478a2.5 2.5 0 00-2.5-2.522m2.5 2.522a2.5 2.5 0 012.5-2.522m-2.5 2.522a2.5 2.5 0 002.5 2.522m2.5-2.522V6.522" 
        />
    </svg>
);
