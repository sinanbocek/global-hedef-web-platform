import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Reminder } from '../types';

// ... Interfaces (AgendaItem, Note, etc.) same as before ... 
// Let's redefine to ensure consistency
export interface AgendaItem {
    id: string;
    type: 'policy_expiry' | 'payment_due' | 'missed_renewal' | 'note' | 'reminder';
    title: string;
    description: string;
    date: Date;
    status: 'pending' | 'completed' | 'urgent';
    relatedId?: string;
    meta?: {
        amount?: number;
        phone?: string;
        description?: string;
        plate?: string;
        company?: string;
        policyNo?: string;
        policyStatus?: string;
        isCompleted?: boolean; // For Reminders
    };
}

export interface Note {
    id: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    customer?: { id: string; full_name: string };
    customer_id?: string;
}

// Helper for local date string
const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export type TimeFilter = 'bugun' | 'bu_hafta' | 'bu_ay';

export const useDashboardAgenda = () => {
    const [timeline, setTimeline] = useState<{ overdue: AgendaItem[]; planned: AgendaItem[]; }>({ overdue: [], planned: [] });
    const [notes, setNotes] = useState<Note[]>([]); // Keep existing notes for backward compatibility or simple notes
    const [reminders, setReminders] = useState<Reminder[]>([]); // Store raw reminders
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<TimeFilter>('bugun');
    const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

    const fetchNotes = useCallback(async () => {
        // Fetch simple Notes
        try {
            const { data: fetchedNotes } = await supabase
                .from('notes')
                .select(`id, content, is_pinned, created_at, customer_id, customers ( id, full_name )`)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50);
            if (fetchedNotes) setNotes(fetchedNotes as any);
        } catch (error) { console.error('Error fetching notes:', error); }

        // Fetch Companies
        try {
            const { data: comps } = await supabase.from('settings_companies').select('id, name').order('name');
            if (comps) setCompanies(comps);
        } catch (e) { console.error('Error fetching companies:', e); }
    }, []);

    const fetchTimeline = useCallback(async () => {
        try {
            setLoading(true);
            const today = new Date();
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);

            // --- 1. SET UP RANGES ---
            const rangeStart = new Date(todayMidnight);
            rangeStart.setDate(rangeStart.getDate() - 30);
            const rangeEnd = new Date(todayMidnight);
            rangeEnd.setDate(rangeEnd.getDate() + 90);

            // DB Filter logic for Policies
            const dbFilterStart = new Date(todayMidnight);
            dbFilterStart.setDate(dbFilterStart.getDate() - 15);
            const dbFilterStartStr = getLocalDateString(dbFilterStart);

            console.log("--- DASHBOARD AGENDA FETCH START ---");
            console.log(`Date Range (DB Filter): >= ${dbFilterStartStr}`);
            console.log(`Fetching from Supabase...`);

            // --- 2. FETCH POLICIES ---
            const { data: policies, error: policiesError } = await supabase
                .from('policies')
                .select(`
                    id, policy_no, type, end_date, premium, status, description, is_acknowledged,
                    customers ( id, full_name, phone, tc_no ), 
                    company: settings_companies ( name ),
                    product: insurance_products ( name_tr )
                `)
                .in('status', ['Active', 'Potansiyel', 'Potential'])
                .gte('end_date', dbFilterStartStr)
                .order('end_date', { ascending: true })
                .limit(300);

            if (policiesError) {
                console.error("Supabase Policies Error:", policiesError);
                throw policiesError;
            };

            console.log(`Supabase returned ${policies?.length || 0} policy items.`);

            // --- 3. FETCH REMINDERS (New) ---
            // Fetch active reminders or recently completed ones
            const { data: fetchedReminders, error: remindersError } = await supabase
                .from('reminders')
                .select(`
                    id, title, description, due_date, is_completed, priority, customer_id,
                    customer:customers ( full_name )
                `)
                .or(`is_completed.eq.false,due_date.gte.${dbFilterStartStr}`) // Active OR recent completed
                .order('due_date', { ascending: true });

            if (remindersError) {
                console.error("Supabase Reminders Error:", remindersError);
                throw remindersError;
            }

            if (fetchedReminders) {
                // @ts-ignore
                setReminders(fetchedReminders); // Keep raw list for "Recent Notes" sidebar if needed
            }
            console.log(`Supabase returned ${fetchedReminders?.length || 0} reminder items.`);


            const overdueItems: AgendaItem[] = [];
            const plannedItems: AgendaItem[] = [];

            // --- PROCESS POLICIES ---
            policies?.forEach((p: any) => {
                const [y, m, d] = p.end_date.split('-').map(Number);
                const itemDateMidnight = new Date(y, m - 1, d);
                const itemDate = new Date(y, m - 1, d, 12, 0, 0); // Noon

                const customer = Array.isArray(p.customers) ? p.customers[0] : p.customers;
                const company = Array.isArray(p.company) ? p.company[0] : p.company;
                const product = Array.isArray(p.product) ? p.product[0] : p.product;

                let plate = '';
                if (p.type === 'Trafik Sigortası' || p.type === 'Kasko') {
                    if (p.description) plate = p.description;
                }
                const displayName = product?.name_tr || p.type || 'Sigorta';

                const item: AgendaItem = {
                    id: p.id,
                    type: 'policy_expiry',
                    title: customer?.full_name || 'Bilinmeyen Müşteri',
                    description: `${displayName}${plate ? ` (${plate})` : ''}`,
                    date: itemDate,
                    status: 'pending',
                    relatedId: customer?.id,
                    meta: {
                        amount: p.premium,
                        phone: customer?.phone,
                        company: company?.name,
                        plate,
                        policyNo: p.policy_no,
                        policyStatus: p.status
                    }
                };

                // Logic: Exclude if acknowledged
                if (!p.is_acknowledged && itemDateMidnight < todayMidnight) {
                    item.type = 'missed_renewal';
                    item.status = 'urgent';
                    overdueItems.push(item);
                } else if (itemDateMidnight >= todayMidnight) { // Include today as planned
                    plannedItems.push(item);
                }
            });

            // --- PROCESS REMINDERS ---
            fetchedReminders?.forEach((r: any) => {
                const [y, m, d] = r.due_date.split('-').map(Number);
                const itemDateMidnight = new Date(y, m - 1, d);
                const itemDate = new Date(y, m - 1, d, 9, 0, 0); // 9 AM default

                const item: AgendaItem = {
                    id: r.id,
                    type: 'reminder',
                    title: r.title,
                    description: r.description || (r.customer ? `Müşteri: ${r.customer.full_name}` : ''),
                    date: itemDate,
                    status: r.is_completed ? 'completed' : 'pending',
                    relatedId: r.customer_id,
                    meta: {
                        isCompleted: r.is_completed // Store completion status
                    }
                };

                // Don't show completed items in Dashboard Timeline (usually), unless today?
                // Let's show specific completed only if needed, but usually valid logic is:
                // Overdue = Not Completed & Date < Today
                // Planned = Date >= Today (Regardless of completion? Maybe show completed as crossed out)

                if (!r.is_completed && itemDateMidnight < todayMidnight) {
                    // Overdue Reminder
                    item.status = 'urgent';
                    overdueItems.push(item);
                } else if (itemDateMidnight >= todayMidnight) {
                    // Future Reminder
                    plannedItems.push(item);
                }
            });

            // Sort Overdue: Oldest first (most urgent?) or newest first? Usually oldest first to clear backlog.
            overdueItems.sort((a, b) => a.date.getTime() - b.date.getTime());
            // Sort Planned: Soonest first
            plannedItems.sort((a, b) => a.date.getTime() - b.date.getTime());

            console.log(`Processed: ${overdueItems.length} Overdue, ${plannedItems.length} Planned.`);
            setTimeline({ overdue: overdueItems, planned: plannedItems });

        } catch (error) { console.error('Error fetching timeline:', error); } finally { setLoading(false); }
    }, []);

    // COUNTS & FILTERING (Client Side)
    // Now we have ALL future items in `planned`. We filter them for Today/Week/Month strictly using JS.
    const counts = useMemo(() => {
        const today = new Date();
        const tY = today.getFullYear();
        const tM = today.getMonth();
        const tD = today.getDate();
        const isToday = (d: Date) => d.getFullYear() === tY && d.getMonth() === tM && d.getDate() === tD;

        const todayCount = timeline.planned.filter(i => isToday(i.date)).length;
        const weekCount = timeline.planned.filter(i => {
            const diff = i.date.getTime() - today.getTime();
            const days = Math.ceil(diff / (1000 * 3600 * 24));
            return days >= 0 && days <= 7;
        }).length;
        const monthCount = timeline.planned.filter(i => {
            const diff = i.date.getTime() - today.getTime();
            const days = Math.ceil(diff / (1000 * 3600 * 24));
            return days >= 0 && days <= 30;
        }).length;

        return { bugun: todayCount, bu_hafta: weekCount, bu_ay: monthCount };
    }, [timeline.planned]);

    const filteredPlanned = useMemo(() => {
        const today = new Date();
        if (activeFilter === 'bugun') {
            return timeline.planned.filter(i => {
                return i.date.getDate() === today.getDate() &&
                    i.date.getMonth() === today.getMonth() &&
                    i.date.getFullYear() === today.getFullYear();
            });
        }
        if (activeFilter === 'bu_hafta') {
            return timeline.planned.filter(i => {
                const diff = i.date.getTime() - today.getTime();
                const days = Math.ceil(diff / (1000 * 3600 * 24));
                return days >= 0 && days <= 7;
            });
        }
        // Bu Ay -> Should we show ALL fetched (future) or just this month?
        // Dashboard usually implies "Agenda for THIS PERIOD". 
        // Let's constrain 'bu_ay' to 30 days too for consistency with the badge count.
        // If we want "All Upcoming", we'd need another tab. But "Bu Ay" (This Month) implies current month view.
        // Let's stick to 30 rolling days or "Same Month" logic.
        // Rolling 30 days is best for "Workload".
        return timeline.planned.filter(i => {
            const diff = i.date.getTime() - today.getTime();
            const days = Math.ceil(diff / (1000 * 3600 * 24));
            return days >= 0 && days <= 30;
        });
    }, [timeline.planned, activeFilter]);

    // ... Note functions same ...
    const searchCustomers = async (q: string) => {
        if (!q || q.length < 2) return [];
        const { data } = await supabase.from('customers').select('id, full_name').ilike('full_name', `%${q.startsWith('@') ? q.substring(1) : q}%`).limit(5);
        return data || [];
    };

    // EXISTING NOTE ACTIONS (Using 'notes' table)
    const addNote = async (content: string, customerId?: string) => {
        /* ... same ... */
        const tempId = 'temp-' + Date.now();
        const n: Note = { id: tempId, content, is_pinned: false, created_at: new Date().toISOString(), customer_id: customerId };
        setNotes(p => [n, ...p]);
        const { error } = await supabase.from('notes').insert({ content, customer_id: customerId || null });
        if (!error) fetchNotes(); return { error };
    };
    const updateNote = async (id: string, content: string) => { setNotes(p => p.map(n => n.id === id ? { ...n, content } : n)); const { error } = await supabase.from('notes').update({ content }).eq('id', id); if (error) fetchNotes(); };
    const deleteNote = async (id: string) => { setNotes(p => p.filter(n => n.id !== id)); await supabase.from('notes').delete().eq('id', id); };
    const togglePin = async (id: string) => { const n = notes.find(x => x.id === id); if (!n) return; const val = !n.is_pinned; setNotes(p => p.map(x => x.id === id ? { ...x, is_pinned: val } : x).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))); await supabase.from('notes').update({ is_pinned: val }).eq('id', id); fetchNotes(); };

    // NEW REMINDER ACTIONS (Using 'reminders' table)
    const addReminder = async (title: string, date: string, customerId?: string) => {
        const { data, error } = await supabase.from('reminders').insert({
            title,
            due_date: date, // YYYY-MM-DD
            customer_id: customerId || null,
            user_id: (await supabase.auth.getUser()).data.user?.id
        }).select().single();
        if (!error) fetchTimeline();
        return { error };
    };

    const toggleReminder = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setTimeline(prev => ({
            overdue: prev.overdue.filter(i => i.id !== id), // If validated, remove from overdue
            planned: prev.planned.map(i => i.id === id ? { ...i, status: !currentStatus ? 'completed' : 'pending', meta: { ...i.meta, isCompleted: !currentStatus } } : i)
        }));

        const { error } = await supabase.from('reminders').update({ is_completed: !currentStatus }).eq('id', id);
        if (error) fetchTimeline(); // Revert
        else fetchTimeline(); // Sync exact state
    };

    const deleteReminder = async (id: string) => {
        const { error } = await supabase.from('reminders').delete().eq('id', id);
        if (!error) fetchTimeline();
    };

    // NEW: Acknowledge Overdue Policy
    const acknowledgePolicy = async (id: string) => {
        // Optimistic Update
        setTimeline(prev => ({
            ...prev,
            overdue: prev.overdue.filter(item => item.id !== id)
        }));

        const { error } = await supabase.from('policies').update({ is_acknowledged: true }).eq('id', id);
        if (error) {
            console.error("Error acknowledging policy:", error);
            fetchTimeline(); // Revert on error
        }
    };

    // NEW: Handle Renewal Actions
    const handleRenewalAction = async (action: 'renewed_us' | 'renewed_other' | 'cancelled', payload: any) => {
        const { itemId, ...data } = payload;

        // 1. Cancelled
        if (action === 'cancelled') {
            // Optimistic Remove
            setTimeline(prev => ({
                overdue: prev.overdue.filter(i => i.id !== itemId),
                planned: prev.planned.filter(i => i.id !== itemId)
            }));
            await supabase.from('policies').update({ status: 'Cancelled' }).eq('id', itemId);
        }

        // 2. Renewed Us (Update old -> Renewed, Create New -> Active)
        if (action === 'renewed_us') {
            // Fetch old data first to duplicate
            const { data: oldPolicy } = await supabase.from('policies').select('*').eq('id', itemId).single();
            if (oldPolicy) {
                // Update Old
                await supabase.from('policies').update({ status: 'Renewed', is_acknowledged: true }).eq('id', itemId);

                // Create New
                const { id, created_at, ...policyData } = oldPolicy;
                const newStartDate = data.newStartDate || oldPolicy.end_date; // fallback
                const newEndDate = data.newEndDate || newStartDate; // fallback logic needed here usually
                await supabase.from('policies').insert({
                    ...policyData,
                    status: 'Active',
                    start_date: newStartDate, // Starts when old ends
                    end_date: newEndDate,
                    premium: data.price,
                    description: oldPolicy.description, // User might want to update this too, but for now keep old
                    policy_no: data.policyNo || oldPolicy.policy_no,
                    company_id: data.companyId || oldPolicy.company_id,
                    commission: data.commission || oldPolicy.commission
                });
            }
            fetchTimeline(); // Refetch to show new state
        }

        // 3. Renewed Other (Update old -> Lost, Create New -> Potential next year)
        if (action === 'renewed_other') {
            const { data: oldPolicy } = await supabase.from('policies').select('*').eq('id', itemId).single();
            if (oldPolicy) {
                // Update Old
                await supabase.from('policies').update({ status: 'Lost', is_acknowledged: true }).eq('id', itemId);

                // Create Potential for Next Year
                const nextYearDate = new Date(oldPolicy.end_date);
                nextYearDate.setFullYear(nextYearDate.getFullYear() + 1);

                const { id, created_at, ...policyData } = oldPolicy;
                await supabase.from('policies').insert({
                    ...policyData,
                    status: 'Potential',
                    end_date: nextYearDate.toISOString().split('T')[0],
                    description: `${oldPolicy.description} (Rakip: ${data.companyName || 'Bilinmiyor'}, Fiyat: ${data.price})`,
                    premium: data.price,
                    company_id: data.companyId || oldPolicy.company_id
                });
            }
            fetchTimeline();
        }
    };

    useEffect(() => { fetchNotes(); fetchTimeline(); }, [fetchNotes, fetchTimeline]);

    return {
        timeline: { overdue: timeline.overdue, planned: filteredPlanned, allPlanned: timeline.planned },
        counts,
        notes,
        reminders,
        loading,
        activeFilter,
        setActiveFilter,
        addNote,
        updateNote,
        deleteNote,
        togglePin,
        addReminder,
        toggleReminder,
        deleteReminder,
        searchCustomers,
        acknowledgePolicy,
        handleRenewalAction,
        companies
    };
};
