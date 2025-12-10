/**
 * Loading state component
 */

import React from 'react';

export const LoadingState: React.FC = () => {
    return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
                <p className="text-slate-500 dark:text-slate-400">Yükleniyor...</p>
            </div>
        </div>
    );
};
