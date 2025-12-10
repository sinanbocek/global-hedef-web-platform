import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    title: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (title: string, message: string, type: ToastType) => void;
    showSuccess: (title: string, message: string) => void;
    showError: (title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((title: string, message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(7);
        const newToast = { id, title, message, type };

        setToasts((prev) => [...prev, newToast]);

        // Auto remove after 3 seconds
        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showSuccess = useCallback((title: string, message: string) => {
        showToast(title, message, 'success');
    }, [showToast]);

    const showError = useCallback((title: string, message: string) => {
        showToast(title, message, 'error');
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`
              pointer-events-auto min-w-[300px] max-w-md w-full bg-white dark:bg-slate-800 
              shadow-lg rounded-xl border border-l-4 p-4 flex gap-3 animate-in slide-in-from-right fade-in duration-300
              ${toast.type === 'success' ? 'border-l-green-500' : ''}
              ${toast.type === 'error' ? 'border-l-red-500' : ''}
              ${toast.type === 'warning' ? 'border-l-amber-500' : ''}
              ${toast.type === 'info' ? 'border-l-blue-500' : ''}
            `}
                    >
                        <div className={`mt-0.5
              ${toast.type === 'success' ? 'text-green-500' : ''}
              ${toast.type === 'error' ? 'text-red-500' : ''}
              ${toast.type === 'warning' ? 'text-amber-500' : ''}
              ${toast.type === 'info' ? 'text-blue-500' : ''}
            `}>
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
                            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                            {toast.type === 'info' && <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{toast.title}</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
