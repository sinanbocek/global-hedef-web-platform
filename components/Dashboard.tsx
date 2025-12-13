import React, { useState, useRef, useEffect } from 'react';
import { useDashboardAgenda, AgendaItem, TimeFilter } from '../hooks/useDashboardAgenda';
import { AlertTriangle, Calendar, Check, ChevronDown, ChevronRight, Clock, Filter, LayoutGrid, List, MessageCircle, MoreVertical, Phone, PieChart, Plus, Search, StickyNote, Trash2, X, Bell, Pin, Edit2, Car, Home, Shield, FileText, Building2 } from 'lucide-react';
import { DashboardCalendar } from './DashboardCalendar';
import { PolicyDetailModal } from './PolicyDetailModal';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const ItemIcon = ({ type }: { type: string }) => {
  const t = type.toLowerCase();
  if (t.includes('trafik') || t.includes('kasko')) return <Car size={16} className="text-slate-500" />;
  if (t.includes('konut') || t.includes('dask')) return <Home size={16} className="text-slate-500" />;
  if (t.includes('işyeri')) return <Building2 size={16} className="text-slate-500" />;
  if (t.includes('sağlık')) return <Shield size={16} className="text-slate-500" />;
  return <FileText size={16} className="text-slate-500" />;
};

export const Dashboard: React.FC = () => {
  const { timeline, counts, notes, loading, activeFilter, setActiveFilter, addNote, deleteNote, updateNote, togglePin, searchCustomers, acknowledgePolicy, handleRenewalAction, companies } = useDashboardAgenda();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const filteredItems = React.useMemo(() => {
    // CRITICAL: Use allPlanned to get access to future data
    // @ts-ignore
    const items = timeline.allPlanned || [];
    const now = new Date();
    // Reset time to start of day
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (timeFilter === 'all') return items;

    if (timeFilter === 'today') {
      return items.filter((item: AgendaItem) => {
        const d = new Date(item.date);
        return d >= todayStart && d <= todayEnd;
      });
    }

    if (timeFilter === 'week') {
      // Rolling 7 days: Today -> Today + 7
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);

      return items.filter((item: AgendaItem) => {
        const d = new Date(item.date);
        return d >= todayStart && d <= nextWeek;
      });
    }

    if (timeFilter === 'month') {
      // Rolling 30 days: Today -> Today + 30
      const nextMonth = new Date(now);
      nextMonth.setDate(now.getDate() + 30);
      nextMonth.setHours(23, 59, 59, 999);

      return items.filter((item: AgendaItem) => {
        const d = new Date(item.date);
        return d >= todayStart && d <= nextMonth;
      });
    }

    return items;
    // @ts-ignore
  }, [timeline.allPlanned, timeFilter]);


  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayObj = new Date(year, month, 1);
    const dayOfWeek = firstDayObj.getDay(); // 0=Sun, 1=Mon...

    // TR: Monday start. 1->0, ... 0->6
    const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  };

  // Note State
  const [noteContent, setNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Mention State
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<{ id: string, full_name: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const [selectedItem, setSelectedItem] = useState<AgendaItem | null>(null);

  // --- MENTION LOGIC ---
  useEffect(() => {
    if (mentionQuery.length >= 2) {
      searchCustomers(mentionQuery).then(setMentionResults);
    } else {
      setMentionResults([]);
    }
  }, [mentionQuery]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNoteContent(val);

    const lastWord = val.split(/[\s\n]+/).pop();
    if (lastWord && lastWord.startsWith('@')) {
      setShowMentionList(true);
      setMentionQuery(lastWord.substring(1));
    } else {
      setShowMentionList(false);
    }
  };

  const handleSelectMention = (customer: { id: string, full_name: string }) => {
    const newContent = noteContent.replace(/@[^@\s]*$/, `@[${customer.full_name}] `);
    setNoteContent(newContent);
    setSelectedCustomerId(customer.id);
    setShowMentionList(false);
    setMentionResults([]);
    noteInputRef.current?.focus();
  };

  const handleSubmitNote = async () => {
    if (!noteContent.trim()) return;
    await addNote(noteContent, selectedCustomerId || undefined);
    setNoteContent('');
    setSelectedCustomerId(null);
  };

  const startEditing = (note: any) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const saveEditing = async () => {
    if (editingNoteId && editingContent.trim()) {
      await updateNote(editingNoteId, editingContent);
      setEditingNoteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 -m-6 p-6">

      {selectedItem && (
        <PolicyDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          companies={companies}
          onAction={(action, payload) => {
            handleRenewalAction(action, { itemId: selectedItem.id, ...payload });
            setSelectedItem(null); // Close modal
          }}
        />
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: BUSINESS PLAN (TIMELINE) - Span 8 */}
        <div className="lg:col-span-8 space-y-6">

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">İş Planı</h1>
              <p className="text-slate-500 text-sm mt-1">
                Ajandanızda yapılacakları takip edin.
              </p>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'list' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <List size={18} />
                  <span className="hidden sm:inline">Liste</span>
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`p-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${viewMode === 'calendar' ? 'bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <LayoutGrid size={18} />
                  <span className="hidden sm:inline">Takvim</span>
                </button>
              </div>

              {/* Time Filter Tabs - Only visible in List View */}
              {viewMode === 'list' && (
                <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-lg w-fit animate-in fade-in slide-in-from-top-2 duration-300">
                  {(() => {
                    // Helper to calculate counts for badges
                    const getCountForFilter = (filter: 'today' | 'week' | 'month') => {
                      // CRITICAL FIX: Use allPlanned to get raw data
                      const items = timeline.allPlanned || [];
                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

                      if (filter === 'today') {
                        return items.filter((item: AgendaItem) => {
                          const d = new Date(item.date);
                          return d >= todayStart && d <= todayEnd;
                        }).length;
                      }

                      if (filter === 'week') {
                        // Rolling 7 days: Today -> Today + 7
                        const nextWeek = new Date(now);
                        nextWeek.setDate(now.getDate() + 7);
                        nextWeek.setHours(23, 59, 59, 999);

                        return items.filter((item: AgendaItem) => {
                          const d = new Date(item.date);
                          return d >= todayStart && d <= nextWeek;
                        }).length;
                      }

                      if (filter === 'month') {
                        // Rolling 30 days: Today -> Today + 30
                        const nextMonth = new Date(now);
                        nextMonth.setDate(now.getDate() + 30);
                        nextMonth.setHours(23, 59, 59, 999);

                        return items.filter((item: AgendaItem) => {
                          const d = new Date(item.date);
                          return d >= todayStart && d <= nextMonth;
                        }).length;
                      }
                      return 0;
                    };

                    return [
                      { id: 'today', label: 'Bugün' },
                      { id: 'week', label: 'Bu Hafta' },
                      { id: 'month', label: 'Bu Ay' }
                    ].map(tab => {
                      const count = getCountForFilter(tab.id as any);
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setTimeFilter(tab.id as any)}
                          className={`
                                            px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2
                                            ${timeFilter === tab.id
                              ? 'bg-[#1e40af] text-white shadow-sm shadow-blue-200'
                              : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                                        `}
                        >
                          {tab.label}
                          {count > 0 && (
                            <span className={`
                                                flex items-center justify-center w-5 h-5 rounded-full text-[10px]
                                                ${timeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}
                                            `}>
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Overdue Alerts */}
          {timeline.overdue.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
              {timeline.overdue.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="group flex items-center justify-between bg-red-50 border border-red-100 p-4 rounded-xl hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400/50" />
                  <div className="flex items-center gap-4 pl-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0 shadow-sm border border-red-200">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-900">{item.title}</h4>
                      <p className="text-xs text-red-700 font-medium mt-0.5">{item.description} • <span className="font-bold underline decoration-red-400">Kaçırıldı</span></p>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-all text-red-600 font-bold text-[10px] tracking-wider uppercase translate-x-2 group-hover:translate-x-0">
                    DETAY
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Planned Items (Calendar or List) */}
          {viewMode === 'calendar' ? (
            // @ts-ignore
            <DashboardCalendar items={timeline.allPlanned || []} onItemClick={setSelectedItem} />
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px] flex flex-col">
              {loading && filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mb-4"></div>
                  <p className="text-slate-400">Yükleniyor...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-400 p-10">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="font-medium">Bu dönem için kayıt bulunamadı.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {filteredItems.map(item => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group p-5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center gap-4 relative"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-colors"></div>

                      {/* Date Box */}
                      <div className="flex flex-col items-center justify-center w-14 h-14 bg-slate-50 rounded-xl border border-slate-100 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors flex-shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-400 uppercase tracking-tighter">
                          {item.date.toLocaleDateString('tr-TR', { month: 'short' })}
                        </span>
                        <span className="text-xl font-bold text-slate-700 group-hover:text-blue-700 leading-none">
                          {item.date.getDate()}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-sm md:text-base truncate">{item.title}</h4>

                          {/* Status Badge */}
                          {(item.meta?.policyStatus === 'Potential' || item.meta?.policyStatus === 'Potansiyel') && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                              FIRSAT
                            </span>
                          )}
                          {item.meta?.policyStatus === 'Active' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              YENİLEME
                            </span>
                          )}

                          {item.meta?.company && (
                            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium border border-slate-200 truncate max-w-[120px]">
                              {item.meta.company}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-slate-500 gap-3">
                          <div className="flex items-center gap-1.5">
                            <ItemIcon type={item.description} />
                            <span>{item.description}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="text-right pl-2">
                        <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">Detay</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: YELLOW STICKER & NOTES (33%) - Span 4 */}
        <div className="lg:col-span-4 space-y-6">

          {/* Yellow Sticker Input */}
          <div className="bg-[#FFF9C4] rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border-t-8 border-[#FFF59D] relative">
            <h3 className="text-yellow-900/70 font-bold mb-4 flex items-center gap-2 text-xs uppercase tracking-wide">
              <StickyNote size={14} /> NOT EKLE
            </h3>

            <div className="relative">
              <textarea
                ref={noteInputRef}
                value={noteContent}
                onChange={handleNoteChange}
                className="w-full bg-white/40 border border-yellow-900/10 rounded-lg p-3 text-slate-800 placeholder-yellow-900/40 text-sm font-medium min-h-[120px] resize-none focus:ring-2 focus:ring-yellow-400/30 focus:border-yellow-400/50 transition-all font-handwriting leading-relaxed"
                placeholder="Ajandanıza not almak için tıklayın... (@isim ile kişi etiketleyin)"
              />

              {/* Mention Dropdown */}
              {showMentionList && mentionResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white rounded-lg shadow-xl border border-slate-100 z-20 mt-2 max-h-[200px] overflow-y-auto">
                  {mentionResults.map(customer => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectMention(customer)}
                      className="w-full text-left px-4 py-3 hover:bg-yellow-50 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                        {customer.full_name[0]}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{customer.full_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="text-[10px] text-yellow-900/40 font-medium max-w-[120px] truncate">
                {selectedCustomerId && <span className="text-indigo-600 font-bold">Kişi Etiketlendi</span>}
              </div>
              <button
                onClick={handleSubmitNote}
                disabled={!noteContent.trim()}
                className="w-10 h-10 bg-[#FFD54F] hover:bg-[#FBC02D] text-yellow-900 rounded-xl shadow-lg shadow-yellow-500/20 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                <Check size={20} />
              </button>
            </div>
          </div>

          {/* Recent Notes List */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1 text-sm">
              <Pin size={16} className="text-slate-400" />
              Son Notlarım
            </h3>

            <div className="grid gap-3">
              {notes.map(note => (
                <div key={note.id} className="group bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200">

                  {/* Editing Mode */}
                  {editingNoteId === note.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="w-full text-sm border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 min-h-[80px]"
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingNoteId(null)} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5">İptal</button>
                        <button onClick={saveEditing} className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-blue-700">Kaydet</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode */}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-full">
                          {new Date(note.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => togglePin(note.id)} className={`p-1.5 rounded-md hover:bg-slate-100 ${note.is_pinned ? 'text-indigo-500' : 'text-slate-400'}`} title="Sabitle">
                            <Pin size={12} className={note.is_pinned ? 'fill-current' : ''} />
                          </button>
                          <button onClick={() => startEditing(note)} className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-500" title="Düzenle">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500" title="Sil">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-700 text-sm font-medium leading-relaxed">
                        {note.content.split(/(@\[[^\]]+\])/g).map((part, i) => {
                          if (part.startsWith('@[') && part.endsWith(']')) {
                            return <span key={i} className="text-indigo-600 font-semibold">{part.slice(2, -1)}</span>;
                          }
                          return part;
                        })}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div >
  );
};
