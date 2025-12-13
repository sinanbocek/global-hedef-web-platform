
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { UserProfile } from '../types';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                console.log('Auth: Initializing...');

                // Timeout for initial session check (8 seconds)
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Auth timeout')), 8000)
                );

                // Handle race condition carefully
                let result: any = {};
                try {
                    result = await Promise.race([sessionPromise, timeoutPromise]);
                } catch (e) {
                    console.warn('Auth: Session check timeout/error -> Proceeding as logged out to unblock UI.');
                    if (mounted) setLoading(false);
                    return;
                }

                if (result.error || !result.data) {
                    console.warn('Auth: No session data or error:', result.error);
                    if (mounted) setLoading(false);
                    return;
                }

                const session = result.data.session;

                if (mounted) {
                    console.log('Auth: Session found:', session ? 'Yes' : 'No');
                    setSession(session);
                    setUser(session?.user ?? null);

                    if (session?.user?.email) {
                        console.log('Auth: Fetching profile for', session.user.email);
                        // Fetch profile but don't block main loading indefinitely
                        await fetchUserProfile(session.user.email);
                    } else {
                        console.log('Auth: No user, Loading done.');
                        setLoading(false);
                    }
                }
            } catch (err) {
                console.error('Auth: Initialization critical failure:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth: State change:', event);
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user?.email) {
                    await fetchUserProfile(session.user.email);
                } else {
                    setUserProfile(null);
                    setLoading(false);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserProfile = async (email: string) => {
        try {
            // 5-second timeout for profile fetch to prevent "Misafir" sticking if DB is slow
            const profilePromise = supabase
                .from('settings_users')
                .select('*')
                .eq('email', email)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile query timeout')), 5000)
            );

            // Race profile fetch
            let data, error;
            try {
                const result: any = await Promise.race([profilePromise, timeoutPromise]);
                data = result.data;
                error = result.error;
            } catch (e) {
                console.warn('Auth: Profile fetch timed out, skipping profile load.');
            }

            if (data) {
                console.log('Auth: Profile matched:', data.full_name);
                const profile: UserProfile = {
                    id: data.id,
                    fullName: data.full_name,
                    email: data.email,
                    phone: data.phone || '',
                    roles: data.roles || ['Misafir'],
                    isActive: data.is_active,
                    lastLogin: data.last_login
                };
                setUserProfile(profile);
            } else {
                console.log('Auth: No profile found for email:', email);
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        console.log('Auth: Signing out (Optimistic)...');

        // 1. Immediate UI update (Optimistic)
        setSession(null);
        setUser(null);
        setUserProfile(null);
        setLoading(false);

        // 2. Clear typical local storage keys just in case
        try {
            localStorage.clear();
        } catch (e) { }

        // 3. Background server signout (fire and forget)
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn('Auth: Background signout failed (ignoring):', err);
        }
    };

    const value = {
        session,
        user,
        userProfile,
        loading,
        signOut
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
