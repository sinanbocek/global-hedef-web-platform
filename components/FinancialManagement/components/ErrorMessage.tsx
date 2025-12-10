/**
 * Error message component
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
    message: string;
    onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
    return (
        <div className="flex items-center justify-center h-96">
            <div className="text-center max-w-md">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Bir Hata Oluştu</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                    >
                        Tekrar Dene
                    </button>
                )}
            </div>
        </div>
    );
};
