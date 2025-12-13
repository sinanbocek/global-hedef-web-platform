
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { COMPANY_DETAILS } from '../constants';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    // const { user } = useAuth(); // If needed for redirect logic

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            // Successful login will trigger AuthContext listener which handles redirection if needed,
            // but we can also manually redirect here for better UX response
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            if (err.message === 'Invalid login credentials') {
                setError('E-posta veya şifre hatalı. Lütfen kontrol ediniz.');
            } else {
                setError('Giriş yapılırken bir hata oluştu: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700">

                {/* Header Section */}
                <div className="bg-brand-primary p-8 text-center relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">{COMPANY_DETAILS.name}</h1>
                        <p className="text-blue-100 text-sm">Güvenli Yönetim Paneli Girişi</p>
                    </div>

                    {/* Decorative Circles */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 -translate-y-10"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/10 rounded-full translate-x-10 translate-y-10"></div>
                </div>

                {/* Form Section */}
                <div className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm flex items-start">
                                <div className="mr-2 mt-0.5">⚠️</div>
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">E-posta Adresi</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 input-std w-full"
                                    placeholder="ornek@globalhedef.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 ml-1">Şifre</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 input-std w-full"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-brand-primary hover:bg-blue-800 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Giriş Yapılıyor...
                                </>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>

                        <div className="text-center pt-4">
                            <p className="text-xs text-slate-400">
                                Hesabınız yoksa veya şifrenizi unuttuysanız sistem yöneticisi ile iletişime geçiniz.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 text-center">
                    <p className="text-xs text-slate-400">© 2024 Global Hedef Sigorta Platformu</p>
                </div>

            </div>
        </div>
    );
};
