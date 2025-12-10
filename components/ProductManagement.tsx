import React, { useState, useEffect } from 'react';
import {
    Database, Plus, Edit2, Trash2, Search, Filter, X, Save, AlertTriangle,
    Car, Home, HeartPulse, Umbrella, PiggyBank, Briefcase, Plane,
    Shield, Building2, Stethoscope, LifeBuoy, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { InsuranceCategory, InsuranceProduct } from '../types';

// Helper to get icon based on product code or name
const getProductIcon = (code: string, name: string) => {
    const normalize = (str: string) => str.toLowerCase();
    const c = normalize(code);
    const n = normalize(name);

    if (c.includes('kasko') || c.includes('zts') || n.includes('trafik') || n.includes('araç')) return <Car className="w-6 h-6" />;
    if (c.includes('konut') || c.includes('dask') || n.includes('ev') || n.includes('deprem')) return <Home className="w-6 h-6" />;
    if (c.includes('saglik') || c.includes('tss') || c.includes('oss')) return <HeartPulse className="w-6 h-6" />;
    if (c.includes('seyahat')) return <Plane className="w-6 h-6" />;
    if (c.includes('isyeri') || n.includes('işyeri')) return <Briefcase className="w-6 h-6" />;
    if (c.includes('bes') || n.includes('emeklilik')) return <PiggyBank className="w-6 h-6" />;
    if (c.includes('hayat') || n.includes('yaşam')) return <Umbrella className="w-6 h-6" />;
    if (c.includes('fks') || n.includes('ferdi kaza')) return <Zap className="w-6 h-6" />;

    return <Shield className="w-6 h-6" />;
};

export const ProductManagement: React.FC = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useToast();

    // Modal states
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'category' | 'product', id: string } | null>(null);

    // Form states
    const [categoryForm, setCategoryForm] = useState({ code: '', name_tr: '', description: '', is_active: true, display_order: 1 });
    const [productForm, setProductForm] = useState({ category_id: '', code: '', name_tr: '', aliases: '', is_active: true, display_order: 1 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: cats } = await supabase
                .from('insurance_categories')
                .select('*')
                .order('display_order');

            const { data: prods } = await supabase
                .from('insurance_products')
                .select('*')
                .order('display_order');

            setCategories(cats || []);
            setProducts(prods || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    // Category CRUD
    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCategoryId) {
                const { error } = await supabase
                    .from('insurance_categories')
                    .update(categoryForm)
                    .eq('id', editingCategoryId);
                if (error) throw error;
                showSuccess('Başarılı', 'Kategori güncellendi');
            } else {
                const { error } = await supabase
                    .from('insurance_categories')
                    .insert([categoryForm]);
                if (error) throw error;
                showSuccess('Başarılı', 'Kategori eklendi');
            }
            setIsCategoryModalOpen(false);
            setCategoryForm({ code: '', name_tr: '', description: '', is_active: true, display_order: 1 });
            setEditingCategoryId(null);
            fetchData();
        } catch (error: any) {
            showError('Hata', error.message);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        try {
            const { error } = await supabase
                .from('insurance_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showSuccess('Silindi', 'Kategori silindi');
            setDeleteConfirm(null);
            fetchData();
        } catch (error: any) {
            showError('Hata', error.message);
        }
    };

    // Product CRUD
    const handleSaveProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const aliases = productForm.aliases.split(',').map(a => a.trim()).filter(Boolean);
            const data = { ...productForm, aliases };

            if (editingProductId) {
                const { error } = await supabase
                    .from('insurance_products')
                    .update(data)
                    .eq('id', editingProductId);
                if (error) throw error;
                showSuccess('Başarılı', 'Ürün güncellendi');
            } else {
                const { error } = await supabase
                    .from('insurance_products')
                    .insert([data]);
                if (error) throw error;
                showSuccess('Başarılı', 'Ürün eklendi');
            }
            setIsProductModalOpen(false);
            setProductForm({ category_id: '', code: '', name_tr: '', aliases: '', is_active: true, display_order: 1 });
            setEditingProductId(null);
            fetchData();
        } catch (error: any) {
            showError('Hata', error.message);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        try {
            const { error } = await supabase
                .from('insurance_products')
                .delete()
                .eq('id', id);
            if (error) throw error;
            showSuccess('Silindi', 'Ürün silindi');
            setDeleteConfirm(null);
            fetchData();
        } catch (error: any) {
            showError('Hata', error.message);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Categories Section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-brand-primary" /> Branş Kategorileri ({categories.length})
                    </h3>
                    <button
                        onClick={() => {
                            setCategoryForm({ code: '', name_tr: '', description: '', is_active: true, display_order: categories.length + 1 });
                            setEditingCategoryId(null);
                            setIsCategoryModalOpen(true);
                        }}
                        className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Kategori Ekle
                    </button>
                </div>

                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                                <div className="font-medium text-slate-800 dark:text-white">{cat.name_tr}</div>
                                <div className="text-xs text-slate-500">Kod: {cat.code}</div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setCategoryForm({ code: cat.code, name_tr: cat.name_tr, description: cat.description || '', is_active: cat.is_active, display_order: cat.display_order });
                                        setEditingCategoryId(cat.id);
                                        setIsCategoryModalOpen(true);
                                    }}
                                    className="btn-icon hover:bg-white dark:hover:bg-slate-800"
                                >
                                    <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm({ type: 'category', id: cat.id })}
                                    className="btn-icon hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Products Section */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-brand-primary" /> Sigorta Ürünleri ({products.length})
                    </h3>
                    <button
                        onClick={() => {
                            setProductForm({ category_id: '', code: '', name_tr: '', aliases: '', is_active: true, display_order: products.length + 1 });
                            setEditingProductId(null);
                            setIsProductModalOpen(true);
                        }}
                        className="btn-primary px-4 py-2 text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Ürün Ekle
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...products]
                        .sort((a, b) => {
                            const catA = categories.find(c => c.id === a.category_id);
                            const catB = categories.find(c => c.id === b.category_id);
                            // Sort by category first (display_order or name)
                            if (catA?.display_order !== catB?.display_order) return (catA?.display_order || 0) - (catB?.display_order || 0);
                            return a.name_tr.localeCompare(b.name_tr, 'tr');
                        })
                        .map(prod => {
                            const category = categories.find(c => c.id === prod.category_id);

                            // Badge Style Logic
                            let badgeClass = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
                            if (category?.code === 'ELEMENTER') {
                                badgeClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800";
                            } else if (category?.code === 'HAYAT') {
                                badgeClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800";
                            } else if (category?.code === 'BES') {
                                badgeClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800";
                            }

                            return (
                                <div key={prod.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3 flex-1">
                                            {/* Icon */}
                                            <div className={`p-2.5 rounded-xl ${badgeClass} border-0`}>
                                                {getProductIcon(prod.code, prod.name_tr)}
                                            </div>

                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white">{prod.name_tr}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}>
                                                        {category?.name_tr || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setProductForm({
                                                        category_id: prod.category_id,
                                                        code: prod.code,
                                                        name_tr: prod.name_tr,
                                                        aliases: (prod.aliases || []).join(', '),
                                                        is_active: prod.is_active,
                                                        display_order: prod.display_order
                                                    });
                                                    setEditingProductId(prod.id);
                                                    setIsProductModalOpen(true);
                                                }}
                                                className="btn-icon p-1.5 hover:bg-white dark:hover:bg-slate-800"
                                            >
                                                <Edit2 className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm({ type: 'product', id: prod.id })}
                                                className="btn-icon p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            {/* Category Modal */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingCategoryId ? 'Kategori Düzenle' : 'Yeni Kategori'}
                            </h3>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kod</label>
                                <input
                                    required
                                    type="text"
                                    value={categoryForm.code}
                                    onChange={e => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                                    className="input-std"
                                    placeholder="HAYAT"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori Adı</label>
                                <input
                                    required
                                    type="text"
                                    value={categoryForm.name_tr}
                                    onChange={e => setCategoryForm({ ...categoryForm, name_tr: e.target.value })}
                                    className="input-std"
                                    placeholder="Hayat Sigortası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                                <textarea
                                    value={categoryForm.description}
                                    onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                    className="input-std"
                                    rows={2}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="btn-secondary flex-1 border border-slate-300 dark:border-slate-600">
                                    İptal
                                </button>
                                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Modal */}
            {isProductModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {editingProductId ? 'Ürün Düzenle' : 'Yeni Ürün'}
                            </h3>
                            <button onClick={() => setIsProductModalOpen(false)} className="btn-icon">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                                <select
                                    required
                                    value={productForm.category_id}
                                    onChange={e => setProductForm({ ...productForm, category_id: e.target.value })}
                                    className="select-std"
                                >
                                    <option value="">Seçiniz</option>
                                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name_tr}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kod</label>
                                <input
                                    required
                                    type="text"
                                    value={productForm.code}
                                    onChange={e => setProductForm({ ...productForm, code: e.target.value.toUpperCase() })}
                                    className="input-std"
                                    placeholder="KASKO"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ürün Adı</label>
                                <input
                                    required
                                    type="text"
                                    value={productForm.name_tr}
                                    onChange={e => setProductForm({ ...productForm, name_tr: e.target.value })}
                                    className="input-std"
                                    placeholder="Kasko Sigortası"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alternatif İsimler (virgülle ayırın)</label>
                                <input
                                    type="text"
                                    value={productForm.aliases}
                                    onChange={e => setProductForm({ ...productForm, aliases: e.target.value })}
                                    className="input-std"
                                    placeholder="KASKO, Motorlu Araç Kasko"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setIsProductModalOpen(false)} className="btn-secondary flex-1 border border-slate-300 dark:border-slate-600">
                                    İptal
                                </button>
                                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-red-200 dark:border-red-900">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Silme Onayı</h3>
                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
                                Bu {deleteConfirm.type === 'category' ? 'kategoriyi' : 'ürünü'} silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="btn-secondary flex-1 border border-slate-300 dark:border-slate-600"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={() => {
                                        if (deleteConfirm.type === 'category') {
                                            handleDeleteCategory(deleteConfirm.id);
                                        } else {
                                            handleDeleteProduct(deleteConfirm.id);
                                        }
                                    }}
                                    className="btn-danger flex-1"
                                >
                                    Sil
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
