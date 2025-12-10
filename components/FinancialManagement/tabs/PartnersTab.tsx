/**
 * Partners Tab - Partner Details and Breakdown
 */

import React from 'react';
import { Users } from 'lucide-react';
import { Partner, CommissionDistribution } from '../../../types';
import { formatCurrency } from '../utils/formatting';
import { calculatePartnerMetrics } from '../utils/calculations';

interface PartnersTabProps {
    partners: Partner[];
    distributions: CommissionDistribution[];
}

export const PartnersTab: React.FC<PartnersTabProps> = ({ partners, distributions }) => {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" />
                İş Ortakları
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {partners.map(partner => {
                    const { total, pending, paid } = calculatePartnerMetrics(partner.id, distributions);

                    return (
                        <div
                            key={partner.id}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                    {partner.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white">{partner.name}</h4>
                                    <div className="text-xs text-slate-500">
                                        Hisse Oranı: %{partner.currentShare?.sharePercentage.toFixed(2) || 0}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Toplam Hakediş:</span>
                                    <span className="font-bold text-slate-800 dark:text-white">{formatCurrency(total)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-amber-600">Bekleyen:</span>
                                    <span className="font-bold text-amber-700">{formatCurrency(pending)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600">Ödenen:</span>
                                    <span className="font-bold text-green-700">{formatCurrency(paid)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
