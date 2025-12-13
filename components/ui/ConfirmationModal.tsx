import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-500',
            button: 'btn-danger shadow-red-500/30'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-500',
            button: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-500',
            button: 'btn-primary shadow-blue-500/30'
        }
    };

    const theme = colors[type];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-700 transform scale-100 animate-in zoom-in-95">
                <div className="flex justify-end absolute top-4 right-4">
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-16 h-16 ${theme.bg} ${theme.text} rounded-full flex items-center justify-center mb-2`}>
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                            {message}
                        </p>
                    </div>
                    <div className="flex gap-3 w-full pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 btn-ghost bg-slate-100 dark:bg-slate-800 py-3 rounded-xl font-semibold"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 py-3 rounded-xl font-bold shadow-lg transition-all ${theme.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
