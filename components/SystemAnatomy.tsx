import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database, Table, ArrowRight, AlertTriangle, CheckCircle, XCircle, Code, Server, RefreshCw, Activity } from 'lucide-react';

interface TableInfo {
    name: string;
    columns: ColumnInfo[];
    rowCount?: number;
}

interface ColumnInfo {
    name: string;
    type: string;
    nullable: boolean;
    isPrimaryKey: boolean;
    isForeignKey: boolean;
    foreignTable?: string;
}

export const SystemAnatomy: React.FC = () => {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Health Monitoring States
    const [healthStatus, setHealthStatus] = useState<{
        overall: 'healthy' | 'warning' | 'error';
        issues: string[];
        lastCheck: Date;
    }>({
        overall: 'healthy',
        issues: [],
        lastCheck: new Date()
    });

    const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
    const [missingColumns, setMissingColumns] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        performInitialLoad();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            performHealthCheck();
            fetchTableCounts();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // Initial load - runs all checks
    const performInitialLoad = async () => {
        setLoading(true);
        await Promise.all([
            fetchSchema(),
            performHealthCheck(),
            fetchTableCounts()
        ]);
        setLoading(false);
    };

    // Health Check - Detects missing columns and issues
    const performHealthCheck = async () => {
        const issues: string[] = [];
        const missing: string[] = [];

        try {
            // Check settings_users for roles/phone columns
            const { data: usersData, error: usersError } = await supabase
                .from('settings_users')
                .select('roles, phone, id')
                .limit(1);

            if (usersError) {
                issues.push(`settings_users tablosuna erişim hatası: ${usersError.message}`);
            } else if (usersData && usersData.length > 0) {
                if (usersData[0].roles === undefined) {
                    issues.push('❌ settings_users.roles kolonu eksik - Çoklu rol atama çalışmayacak');
                    missing.push('settings_users.roles');
                }
                if (usersData[0].phone === undefined) {
                    issues.push('❌ settings_users.phone kolonu eksik - Telefon numaraları kaydedilemeyecek');
                    missing.push('settings_users.phone');
                }
            }

            // Check policies for salesperson_id
            const { data: policiesData, error: policiesError } = await supabase
                .from('policies')
                .select('salesperson_id, id')
                .limit(1);

            if (policiesError) {
                issues.push(`policies tablosuna erişim hatası: ${policiesError.message}`);
            } else if (policiesData && policiesData.length > 0) {
                if (policiesData[0].salesperson_id === undefined) {
                    issues.push('❌ policies.salesperson_id kolonu eksik - Satışçı ataması yapılamayacak');
                    missing.push('policies.salesperson_id');
                }
            }

            // Determine overall health
            const overall = issues.length === 0 ? 'healthy' :
                issues.length <= 2 ? 'warning' : 'error';

            setHealthStatus({ overall, issues, lastCheck: new Date() });
            setMissingColumns(missing);

        } catch (err: any) {
            setHealthStatus({
                overall: 'error',
                issues: [`Sağlık kontrolü hatası: ${err.message}`],
                lastCheck: new Date()
            });
        }
    };

    // Fetch table row counts
    const fetchTableCounts = async () => {
        const tableNames = ['settings_users', 'policies', 'customers', 'settings_companies', 'settings_banks'];
        const counts: Record<string, number> = {};

        for (const tableName of tableNames) {
            try {
                const { count } = await supabase
                    .from(tableName)
                    .select('*', { count: 'exact', head: true });
                counts[tableName] = count || 0;
            } catch {
                counts[tableName] = 0;
            }
        }

        setTableCounts(counts);
    };

    // Manual refresh
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await performHealthCheck();
        await fetchTableCounts();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    const fetchSchema = async () => {
        try {
            const tableNames = ['settings_users', 'policies', 'customers', 'settings_companies', 'settings_bank_accounts'];
            const detectedTables: TableInfo[] = [];

            for (const name of tableNames) {
                const { data } = await supabase.from(name).select('*').limit(1);
                let columns: ColumnInfo[] = [];

                if (data && data.length > 0) {
                    columns = Object.keys(data[0]).map(k => ({
                        name: k,
                        type: typeof data[0][k],
                        nullable: true,
                        isPrimaryKey: k === 'id',
                        isForeignKey: k.endsWith('_id')
                    }));
                }

                detectedTables.push({
                    name,
                    columns,
                    rowCount: data ? data.length : 0
                });
            }

            setTables(detectedTables);

        } catch (err: any) {
            setError(err.message);
        }
    };

    // Static schema definitions
    const SCHEMA_DEFINITIONS = [
        {
            table: 'settings_users',
            description: 'Sistem kullanıcıları ve yetkileri',
            expectedColumns: [
                { name: 'id', type: 'uuid', desc: 'Benzersiz Kimlik' },
                { name: 'full_name', type: 'text', desc: 'Ad Soyad' },
                { name: 'email', type: 'text', desc: 'E-Posta' },
                { name: 'roles', type: 'text[]', desc: 'Roller (Dizi) ✅' },
                { name: 'phone', type: 'text', desc: 'Telefon ✅' },
                { name: 'role', type: 'text', desc: 'Eski Rol (Legacy)' },
            ]
        },
        {
            table: 'policies',
            description: 'Sigorta poliçeleri ve teklifler',
            expectedColumns: [
                { name: 'id', type: 'uuid', desc: 'ID' },
                { name: 'policy_no', type: 'text', desc: 'Poliçe No' },
                { name: 'premium', type: 'numeric', desc: 'Prim Tutarı' },
                { name: 'salesperson_id', type: 'uuid', desc: 'Satışçı (User ID) ✅' },
            ]
        }
    ];

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 p-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                        <Server className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sistem Anatomisi & İzleme</h1>
                        <p className="text-gray-500 mt-1">Gerçek zamanlı veritabanı sağlık kontrolü ve yapı analizi</p>
                    </div>
                </div>

                <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Yenile
                </button>
            </div>

            {/* Health Status Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Overall Health */}
                <div className={`p-6 rounded-xl border-2 ${healthStatus.overall === 'healthy' ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' :
                    healthStatus.overall === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800' :
                        'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-600 dark:text-slate-300">Sistem Durumu</h3>
                        {healthStatus.overall === 'healthy' ? <CheckCircle className="w-6 h-6 text-green-600" /> :
                            healthStatus.overall === 'warning' ? <AlertTriangle className="w-6 h-6 text-amber-600" /> :
                                <XCircle className="w-6 h-6 text-red-600" />}
                    </div>
                    <p className={`text-2xl font-bold ${healthStatus.overall === 'healthy' ? 'text-green-700 dark:text-green-400' :
                        healthStatus.overall === 'warning' ? 'text-amber-700 dark:text-amber-400' :
                            'text-red-700 dark:text-red-400'
                        }`}>
                        {healthStatus.overall === 'healthy' ? 'Sağlıklı' :
                            healthStatus.overall === 'warning' ? 'Uyarı' : 'Hata'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        Son Kontrol: {formatTime(healthStatus.lastCheck)}
                    </p>
                </div>

                {/* Total Records */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-600 dark:text-slate-300">Toplam Kayıt</h3>
                        <Database className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {Object.values(tableCounts).reduce((a, b) => a + b, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Tüm tablolar</p>
                </div>

                {/* Issues Count */}
                <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-600 dark:text-slate-300">Tespit Edilen</h3>
                        <Activity className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                        {healthStatus.issues.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Sorun/Uyarı</p>
                </div>
            </div>

            {/* Active Issues */}
            {healthStatus.issues.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
                    <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5" />
                        Aktif Uyarılar ve Sorunlar
                    </h3>
                    <ul className="space-y-2">
                        {healthStatus.issues.map((issue, idx) => (
                            <li key={idx} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                <span className="flex-none mt-0.5">•</span>
                                <span>{issue}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Table Statistics */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Table className="w-5 h-5 text-blue-600" />
                    Tablo İstatistikleri
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(tableCounts).map(([table, count]) => {
                        const tableNameMap: Record<string, string> = {
                            'settings_users': 'Kullanıcılar',
                            'policies': 'Poliçeler',
                            'customers': 'Müşteriler',
                            'settings_companies': 'Sigorta Şirketleri',
                            'settings_banks': 'Bankalar'
                        };
                        return (
                            <div key={table} className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">{tableNameMap[table] || table}</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{count.toLocaleString()}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEFT: Database Schema */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <Database className="w-5 h-5 text-blue-500" />
                        Veritabanı Yapısı
                    </h2>
                    <div className="space-y-4">
                        {SCHEMA_DEFINITIONS.map(schema => {
                            const tableNameMap: Record<string, string> = {
                                'settings_users': 'Kullanıcılar',
                                'policies': 'Poliçeler'
                            };
                            return (
                                <div key={schema.table} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{tableNameMap[schema.table] || schema.table}</span>
                                            <span className="font-mono text-xs text-slate-400">({schema.table})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">
                                                {tableCounts[schema.table] || 0} kayıt
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-sm text-slate-500 mb-4">{schema.description}</p>
                                        <table className="w-full text-sm text-left">
                                            <thead>
                                                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100 dark:border-slate-700">
                                                    <th className="pb-2">Kolon</th>
                                                    <th className="pb-2">Tip</th>
                                                    <th className="pb-2">Açıklama</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {schema.expectedColumns.map(col => (
                                                    <tr key={col.name}>
                                                        <td className="py-2 font-mono text-slate-700 dark:text-slate-300">{col.name}</td>
                                                        <td className="py-2 text-slate-500">{col.type}</td>
                                                        <td className="py-2 text-slate-500 italic">{col.desc}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Integration Flow */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <Code className="w-5 h-5 text-purple-500" />
                        Veri Akış Şeması
                    </h2>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Kullanıcı Kaydı Örneği</h3>

                        <div className="space-y-4 relative">
                            {/* Step 1 */}
                            <div className="flex items-start gap-4">
                                <div className="flex-none w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h4 className="font-bold text-sm">Frontend Formu (React)</h4>
                                    <p className="text-xs text-slate-500">Kullanıcı veriyi girer (Ad, Rol: ['Admin', 'Satışçı'])</p>
                                    <div className="mt-2 bg-slate-900 text-slate-300 p-2 rounded text-xs font-mono">
                                        payload = {'{'} full_name: "...", roles: ["Admin", "Satışçı"] {'}'}
                                    </div>
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="pl-4 text-slate-300"><ArrowRight className="w-4 h-4 rotate-90" /></div>

                            {/* Step 2 */}
                            <div className="flex items-start gap-4">
                                <div className="flex-none w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h4 className="font-bold text-sm">Supabase API (Veritabanı)</h4>
                                    <p className="text-xs text-slate-500">API veriyi tabloya yazmaya çalışır.</p>

                                    {missingColumns.includes('settings_users.roles') ? (
                                        <div className="mt-2 p-2 rounded text-xs border border-red-200 bg-red-50 text-red-700">
                                            <strong>Sorun:</strong> 'roles' kolonu eksik - Migration gerekli
                                        </div>
                                    ) : (
                                        <div className="mt-2 p-2 rounded text-xs border border-green-200 bg-green-50 text-green-700">
                                            <strong>Başarılı:</strong> Tüm kolonlar mevcut ✅
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Arrow */}
                            <div className="pl-4 text-slate-300"><ArrowRight className="w-4 h-4 rotate-90" /></div>

                            {/* Step 3 */}
                            <div className="flex items-start gap-4">
                                <div className="flex-none w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">3</div>
                                <div>
                                    <h4 className="font-bold text-sm">
                                        {missingColumns.length > 0 ? 'Fallback (Yedek Mekanizma)' : 'İşlem Tamamlandı'}
                                    </h4>
                                    {missingColumns.length > 0 ? (
                                        <>
                                            <p className="text-xs text-slate-500">Kod hatayı yakalar ve eski yöntemi dener.</p>
                                            <div className="mt-2 bg-slate-900 text-slate-300 p-2 rounded text-xs font-mono">
                                                legacy_payload = {'{'} role: "Admin" {'}'} // Sadece ilk rol
                                            </div>
                                            <p className="text-xs text-amber-600 mt-1 font-bold">Sonuç: Kayıt başarılı ama çoklu rol kaybolur.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="text-xs text-slate-500">Veri başarıyla kaydedildi.</p>
                                            <p className="text-xs text-green-600 mt-1 font-bold">✅ Çoklu rol desteği aktif!</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default SystemAnatomy;
