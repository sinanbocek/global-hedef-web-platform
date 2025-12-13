import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreHorizontal } from 'lucide-react';
import { AgendaItem } from '../hooks/useDashboardAgenda';

interface DashboardCalendarProps {
    items: AgendaItem[];
    onItemClick: (item: AgendaItem) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export const DashboardCalendar: React.FC<DashboardCalendarProps> = ({ items, onItemClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...

        // Adjust for Monday start (Turkey)
        // 0(Sun) -> 6, 1(Mon) -> 0
        const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

        const days = [];

        // Previous month padding
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = startOffset - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            });
        }

        // Next month padding to fill 42 cells (6 rows)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    };

    const days = useMemo(() => getDaysInMonth(currentDate), [currentDate]);

    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    const getItemsForDate = (date: Date) => {
        return items.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate.getDate() === date.getDate() &&
                itemDate.getMonth() === date.getMonth() &&
                itemDate.getFullYear() === date.getFullYear();
        });
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100/50 rounded-2xl flex items-center justify-center text-blue-600">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 capitalize">
                            {currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <p className="text-sm text-slate-500 font-medium">
                            {(() => {
                                const currentMonthItems = items.filter(item => {
                                    const itemDate = new Date(item.date);
                                    return itemDate.getMonth() === currentDate.getMonth() &&
                                        itemDate.getFullYear() === currentDate.getFullYear();
                                });

                                const potentialCount = currentMonthItems.filter(i =>
                                    i.meta?.policyStatus === 'Potential' || i.meta?.policyStatus === 'Potansiyel'
                                ).length;

                                const renewalCount = currentMonthItems.length - potentialCount;

                                return (
                                    <>
                                        {renewalCount > 0 && `${renewalCount} yenileme`}
                                        {renewalCount > 0 && potentialCount > 0 && ' ve '}
                                        {potentialCount > 0 && `${potentialCount} potansiyel iş`}
                                        {renewalCount === 0 && potentialCount === 0 && 'İşlem yok'}
                                    </>
                                );
                            })()}

                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="p-2 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-4 w-[1px] bg-slate-200"></div>
                    <button
                        onClick={() => changeMonth(1)}
                        className="p-2 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-slate-50 gap-[1px] border-b border-l border-slate-100">
                {days.map((dayObj, index) => {
                    const dayItems = getItemsForDate(dayObj.date);
                    const isToday = new Date().toDateString() === dayObj.date.toDateString();
                    const isPast = dayObj.date < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                        <div
                            key={index}
                            className={`bg-white relative p-2 min-h-[100px] hover:bg-slate-50/80 transition-colors group flex flex-col gap-1
                ${!dayObj.isCurrentMonth ? 'bg-slate-50/30' : ''}
                ${isPast && !isToday ? 'opacity-40 grayscale bg-slate-50/50' : ''}
              `}
                        >
                            {/* Date Number */}
                            <div className="flex justify-between items-start mb-1">
                                <span className={`
                  text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                  ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
                                        dayObj.isCurrentMonth ? 'text-slate-700' : 'text-slate-300'}
                `}>
                                    {dayObj.date.getDate()}
                                </span>
                                {dayItems.length > 0 && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                        {dayItems.length}
                                    </span>
                                )}
                            </div>

                            {/* Events */}
                            <div className="flex flex-col gap-1 overflow-hidden">
                                {dayItems.slice(0, 3).map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => onItemClick(item)}
                                        className={`
                      w-full text-left text-[10px] px-2 py-1 rounded border overflow-hidden transition-all whitespace-nowrap
                      ${item.type === 'missed_renewal'
                                                ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100'
                                                : 'bg-blue-50/80 text-blue-700 border-blue-100/50 hover:bg-blue-100'}
                    `}
                                        title={item.title}
                                    >
                                        <span className="font-bold">
                                            {item.title.length > 20 ? item.title.substring(0, 20) + '.' : item.title}
                                        </span>
                                    </button>
                                ))}

                                {dayItems.length > 3 && (
                                    <div className="text-[10px] text-slate-400 text-center font-medium hover:text-blue-500 cursor-pointer">
                                        +{dayItems.length - 3} daha
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
