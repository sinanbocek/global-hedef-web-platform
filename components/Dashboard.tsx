import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, FileCheck, AlertCircle } from 'lucide-react';

const data = [
  { name: 'Oca', satis: 40000, hedef: 24000 },
  { name: 'Şub', satis: 30000, hedef: 13980 },
  { name: 'Mar', satis: 20000, hedef: 9800 },
  { name: 'Nis', satis: 27800, hedef: 39080 },
  { name: 'May', satis: 18900, hedef: 48000 },
  { name: 'Haz', satis: 23900, hedef: 38000 },
  { name: 'Tem', satis: 34900, hedef: 43000 },
];

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{value}</h3>
      <div className={`flex items-center mt-2 text-xs font-medium ${change.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        <span className={`px-1.5 py-0.5 rounded ${change.startsWith('+') ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          {change}
        </span>
        <span className="ml-2 text-slate-400 dark:text-slate-500">geçen aya göre</span>
      </div>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Yönetim Paneli</h2>
        <p className="text-slate-500 dark:text-slate-400">Acente performans özetiniz ve günlük istatistikler.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Toplam Prim Üretimi" value="₺845,230" change="+12.5%" icon={TrendingUp} color="bg-brand-primary" />
        <StatCard title="Aktif Poliçeler" value="1,240" change="+4.2%" icon={FileCheck} color="bg-brand-secondary" />
        <StatCard title="Yeni Müşteriler" value="48" change="+18.2%" icon={Users} color="bg-brand-accent" />
        <StatCard title="Bekleyen Teklifler" value="12" change="-2.5%" icon={AlertCircle} color="bg-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 dark:text-white">Aylık Satış Grafiği</h3>
            <select className="select-std w-auto py-1 pl-3 pr-8 h-9 text-xs">
              <option>Son 7 Ay</option>
              <option>Bu Yıl</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSatis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003087" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#003087" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#003087', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="satis" stroke="#003087" strokeWidth={3} fillOpacity={1} fill="url(#colorSatis)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4">Poliçe Dağılımı</h3>
          <div className="h-48 w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Trafik', val: 65 }, { name: 'Kasko', val: 45 },
                { name: 'Sağlık', val: 30 }, { name: 'Konut', val: 20 }
              ]} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="val" fill="#00C2FF" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h4 className="font-semibold text-sm text-slate-700 dark:text-slate-300 mb-3">Son İşlemler</h4>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-brand-primary font-bold text-xs">
                  AH
                </div>
                <div className="ml-3 flex-1">
                  <p className="font-medium text-slate-800 dark:text-white">Ahmet Hakan</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Trafik Sigortası • Yeni</p>
                </div>
                <span className="font-bold text-slate-700 dark:text-slate-300">₺4.250</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
