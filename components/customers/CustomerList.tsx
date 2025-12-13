import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User, Building2, Phone, Mail, Users2, Tag, Car, Home, CheckCircle, ExternalLink, FileText, Loader2,
    ArrowDownAZ, ArrowDownZA, ArrowUpDown
} from 'lucide-react';
import { Customer } from '../../types';
import { formatPhoneNumber } from '../../lib/utils';

interface CustomerListProps {
    customers: Customer[];
    totalCount: number;
    isLoading: boolean;
    sortOrder: 'Newest' | 'A-Z' | 'Z-A';
    onSortToggle: () => void;
    onCustomerClick: (customer: Customer) => void;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onNavigateProp?: (page: string) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
    customers,
    totalCount,
    isLoading,
    sortOrder,
    onSortToggle,
    onCustomerClick,
    currentPage,
    totalPages,
    onPageChange,
    onNavigateProp
}) => {
    const navigate = useNavigate();

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/80 backdrop-blur-sm dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                        <tr>
                            <th
                                onClick={onSortToggle}
                                className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors select-none group"
                            >
                                <div className="flex items-center gap-1">
                                    Müşteri
                                    {sortOrder === 'A-Z' && <ArrowDownAZ className="w-4 h-4 text-brand-primary" />}
                                    {sortOrder === 'Z-A' && <ArrowDownZA className="w-4 h-4 text-brand-primary" />}
                                    {sortOrder === 'Newest' && <ArrowUpDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />}
                                </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İletişim</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aile / Grup</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Etiketler</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Varlıklar</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Poliçeler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {customers.map((customer) => (
                            <tr
                                key={customer.id}
                                onClick={() => onCustomerClick(customer)}
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                            >
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-4">
                                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${(customer.customerType === 'BIREYSEL')
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                            }`}>
                                            {(customer.customerType === 'BIREYSEL') ? <User className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-bold text-slate-900 dark:text-white">{customer.fullName}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{customer.tcNo || customer.vkn || '-'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <div className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            <span className="text-[11px]">{formatPhoneNumber(customer.phone)}</span>
                                        </div>
                                        {customer.email && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <Mail className="w-3 h-3 text-slate-400" />
                                                <span className="text-[10px] sm:text-[11px] truncate max-w-[140px]" title={customer.email}>{customer.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {customer.familyGroup ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-400 md:whitespace-nowrap">
                                            <Users2 className="w-3 h-3 mr-1.5 opacity-70" />
                                            {customer.familyGroup.name}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 md:whitespace-nowrap">
                                            <Users2 className="w-3 h-3 mr-1.5 opacity-50" />
                                            Genel Müşteriler
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {customer.tags.length > 0 ? (
                                            <>
                                                {customer.tags.slice(0, 2).map(t => (
                                                    <span key={t} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-slate-200 text-slate-600 bg-transparent dark:border-slate-600 dark:text-slate-400">
                                                        <Tag className="w-3 h-3 mr-1 opacity-50" />
                                                        {t}
                                                    </span>
                                                ))}
                                                {customer.tags.length > 2 && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">+{customer.tags.length - 2}</span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex -space-x-2">
                                        {customer.assets.length === 0 && <span className="text-xs text-slate-400">-</span>}
                                        {customer.assets.slice(0, 3).map((asset, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm" title={asset.description}>
                                                {asset.type === 'Araç' ? <Car className="w-4 h-4" /> : asset.type === 'Konut' ? <Home className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                                            </div>
                                        ))}
                                        {customer.assets.length > 3 && (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                +{customer.assets.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {customer.activePoliciesCount && customer.activePoliciesCount > 0 ? (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/policies?customerId=${customer.id}`);
                                                if (onNavigateProp) onNavigateProp('policies');
                                            }}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                            {customer.activePoliciesCount} Aktif Poliçe
                                            <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700">
                                            <FileText className="w-3.5 h-3.5 mr-1" />
                                            Poliçe Yok
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            Toplam <span className="font-bold">{totalCount}</span> kayıt, <span className="font-bold">{currentPage}</span> / {totalPages} sayfa gösteriliyor
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Önceki
                            </button>
                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let p = i + 1;
                                    if (totalPages > 5 && currentPage > 3) {
                                        p = currentPage - 2 + i;
                                        if (p > totalPages) p = 100000; // filtered below
                                    }
                                    return p <= totalPages ? p : null;
                                }).filter(Boolean).map((p: any) => (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        className={`w-7 h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-colors ${currentPage === p ? 'bg-brand-primary text-white' : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'} `}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Sonraki
                            </button>
                        </div>
                    </div>
                )}

                {totalCount === 0 && (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">
                        <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-lg font-medium">Sonuç bulunamadı</p>
                        <p className="text-sm mt-1">Arama kriterlerinizi değiştirerek tekrar deneyin.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
