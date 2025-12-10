/**
 * Reusable KPI Card component
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string;
    subtitle?: string;
    icon: LucideIcon;
    iconColor: string;
    iconBgColor: string;
    bgGradient: string;
    borderColor: string;
    textColor: string;
    subtitleColor: string;
}

export const KPICard: React.FC<KPICardProps> = ({
    title,
    value,
    subtitle,
    icon: Icon,
    iconColor,
    iconBgColor,
    bgGradient,
    borderColor,
    textColor,
    subtitleColor
}) => {
    return (
        <div className={`${bgGradient} border ${borderColor} rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center shadow-lg`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
            </div>
            <div className={`text-sm ${textColor} font-medium mb-1`}>{title}</div>
            <div className={`text-2xl font-bold ${textColor}`}>{value}</div>
            {subtitle && (
                <div className={`text-xs ${subtitleColor} mt-2`}>{subtitle}</div>
            )}
        </div>
    );
};
