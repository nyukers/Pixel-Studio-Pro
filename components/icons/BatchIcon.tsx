
import React from 'react';

export const BatchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m-1.5 18h9.75M8.25 21H3.375c-.621 0-1.125-.504-1.125-1.125V5.625c0-.621.504-1.125 1.125-1.125h4.875c.621 0 1.125.504 1.125 1.125v13.5m0-13.5h9.75c.621 0 1.125.504 1.125 1.125v13.5c0 .621-.504 1.125-1.125 1.125h-4.875c-.621 0-1.125-.504-1.125-1.125v-13.5z" 
        />
    </svg>
);
