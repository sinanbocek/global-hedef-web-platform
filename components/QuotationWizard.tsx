
import React, { useState, useEffect } from 'react';
import {
  Check, ChevronRight, Loader2, Sparkles, Send, Download, CreditCard,
  Car, ShieldCheck, Home, Activity
} from 'lucide-react';
import { InsuranceType, QuoteOffer, CompanySettings } from '../types';
import { GeminiService } from '../services/geminiService';
import { supabase } from '../lib/supabase';

const STEPS = ['Araç/Müşteri Bilgileri', 'Kapsam Seçimi', 'Teklif Karşılaştırma', 'Onay'];

export const QuotationWizard: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [insuranceType, setInsuranceType] = useState<InsuranceType>(InsuranceType.TRAFIK);
  const [formData, setFormData] = useState({
    plate: '',
    tcKn: '',
    licenseSerial: '',
    phone: '',
    email: ''
  });
  const [offers, setOffers] = useState<QuoteOffer[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [proposalMsg, setProposalMsg] = useState<string>('');
  const [activeCompanies, setActiveCompanies] = useState<CompanySettings[]>([]);

  useEffect(() => {
    const fetchActiveCompanies = async () => {
      try {
        const { data, error } = await supabase.from('settings_companies').select('*, collaterals:company_collaterals(*)').eq('is_active', true);
        if (error) throw error;

        const companies: CompanySettings[] = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          logo: c.logo,
          isActive: true,
          agencyNo: c.agency_no,
          commissions: c.commissions || {},
          collaterals: (c.collaterals || []).map((col: any) => ({
            id: col.id, companyId: col.company_id, type: col.type, amount: col.amount, currency: col.currency
          }))
        }));
        setActiveCompanies(companies);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchActiveCompanies();

    // Check for Draft Data from Customers Page (Quick Quote)
    const draftData = localStorage.getItem('quote_draft_data');
    if (draftData) {
      const data = JSON.parse(draftData);
      setFormData(prev => ({
        ...prev,
        tcKn: data.tcKn || '',
        phone: data.phone || '',
        plate: data.plate || '',
        email: data.email || ''
      }));
      if (data.insuranceType) {
        setInsuranceType(data.insuranceType as InsuranceType);
      }
      // Clear draft after using
      localStorage.removeItem('quote_draft_data');
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateOffers = async () => {
    setLoading(true);

    // Use the Active Companies from settings
    if (activeCompanies.length === 0) {
      alert("Lütfen ayarlardan en az bir sigorta şirketi aktif ediniz.");
      setLoading(false);
      return;
    }

    const mockCompanies = activeCompanies
      .filter(c => c.commissions && c.commissions[insuranceType] !== undefined)
      .sort(() => 0.5 - Math.random()); // Randomize order

    const generatedOffers: QuoteOffer[] = mockCompanies.map((comp) => {
      // Logic: Calculate total collateral power for pricing discount
      let totalCollateralPower = 0;
      comp.collaterals.forEach(col => {
        let val = col.amount;
        if (col.currency === 'USD') val *= 33;
        if (col.currency === 'EUR') val *= 36;
        // Cash is more valuable than Letter
        if (col.type === 'Nakit') val *= 1.2;
        totalCollateralPower += val;
      });

      const discountFactor = totalCollateralPower > 1000000 ? 0.85 : (totalCollateralPower > 500000 ? 0.9 : 1.0);
      const basePrice = Math.floor(Math.random() * (15000 - 4000) + 4000);

      return {
        companyName: comp.name,
        companyLogo: comp.logo,
        price: Math.floor(basePrice * discountFactor),
        coverageScore: Math.floor(Math.random() * (100 - 70) + 70),
        features: ['Yol Yardım', 'İkame Araç', 'Orijinal Parça', 'IMM Sınırsız'].slice(0, Math.floor(Math.random() * 4) + 1),
        isBestPrice: false,
        isBestCoverage: false
      };
    });

    // Find bests
    const minPrice = Math.min(...generatedOffers.map(o => o.price));
    const maxScore = Math.max(...generatedOffers.map(o => o.coverageScore));

    generatedOffers.forEach(o => {
      if (o.price === minPrice) o.isBestPrice = true;
      if (o.coverageScore === maxScore) o.isBestCoverage = true;
    });

    // AI Call
    try {
      const riskText = await GeminiService.analyzeRisk({ tcKn: formData.tcKn, plate: formData.plate }, insuranceType);
      setAiAnalysis(riskText);
    } catch (e) {
      setAiAnalysis("Analiz yapılamadı.");
    }

    setTimeout(() => {
      setOffers(generatedOffers.sort((a, b) => a.price - b.price));
      setLoading(false);
      setActiveStep(2);
    }, 2500); // Artificial delay to simulate network
  };

  const handleGenerateProposal = async (offer: QuoteOffer) => {
    setLoading(true);
    const msg = await GeminiService.generateProposalMessage("Sayın Müşteri", insuranceType, offer.price);
    setProposalMsg(msg);
    setLoading(false);
    setActiveStep(3);
  };

  const renderStep1 = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { type: InsuranceType.TRAFIK, icon: Car },
          { type: InsuranceType.KASKO, icon: ShieldCheck },
          { type: InsuranceType.KONUT, icon: Home },
          { type: InsuranceType.SAGLIK, icon: Activity },
        ].map((item) => (
          <button
            key={item.type}
            onClick={() => setInsuranceType(item.type)}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${insuranceType === item.type
                ? 'border-brand-primary bg-blue-50 text-brand-primary dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-500'
                : 'border-slate-100 hover:border-blue-200 text-slate-500 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600'
              }`}
          >
            <item.icon className="w-8 h-8 mb-2" />
            <span className="font-semibold text-sm">{item.type}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">TC Kimlik / Vergi No</label>
          <input
            name="tcKn"
            value={formData.tcKn}
            onChange={handleInputChange}
            type="text"
            className="input-std"
            placeholder="11111111111"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plaka (Varsa)</label>
          <input
            name="plate"
            value={formData.plate}
            onChange={handleInputChange}
            type="text"
            className="input-std uppercase"
            placeholder="34 ABC 123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cep Telefonu</label>
          <input
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            type="tel"
            className="input-std"
            placeholder="5XX XXX XX XX"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ruhsat Seri No (Opsiyonel)</label>
          <input
            type="text"
            className="input-std"
            placeholder="AS123456"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold">{activeCompanies.length}</span> aktif sigorta şirketi üzerinden teklif alınacak.
        </div>
        <button
          onClick={generateOffers}
          disabled={!formData.tcKn}
          className="bg-brand-primary hover:bg-blue-800 text-white px-8 py-3 rounded-lg font-semibold flex items-center transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
          Teklifleri Getir
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      {/* AI Analysis Box */}
      {aiAnalysis && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 p-6 rounded-xl flex items-start gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-2 rounded-full shadow-sm">
            <Sparkles className="w-6 h-6 text-brand-accent" />
          </div>
          <div>
            <h4 className="font-bold text-brand-primary dark:text-blue-300 mb-1">Yapay Zeka Risk Analizi</h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{aiAnalysis}</p>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Şirket</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Kapsam Puanı</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Özellikler</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Fiyat</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {offers.map((offer, idx) => (
                <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${offer.isBestPrice ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-white p-1 border border-slate-100 dark:border-slate-600 flex items-center justify-center mr-3">
                        <img src={offer.companyLogo} alt={offer.companyName} className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${offer.companyName}&background=random` }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-white">{offer.companyName}</div>
                        {offer.isBestPrice && <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full">EN İYİ FİYAT</span>}
                        {offer.isBestCoverage && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full ml-1">EN GENİŞ KAPSAM</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-600 rounded-full w-24 mr-2">
                        <div className={`h-2 rounded-full ${offer.coverageScore > 85 ? 'bg-green-500' : 'bg-brand-secondary'}`} style={{ width: `${offer.coverageScore}%` }}></div>
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">%{offer.coverageScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {offer.features.map((f, i) => (
                        <span key={i} className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-lg font-bold text-brand-primary dark:text-blue-400">₺{offer.price.toLocaleString('tr-TR')}</div>
                    <div className="text-xs text-slate-400">9 Taksit imkanı</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleGenerateProposal(offer)}
                      className="bg-brand-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors w-full"
                    >
                      Seç
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Teklif Hazırlandı!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Seçilen poliçe detayları kaydedildi ve taslak oluşturuldu.</p>

        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl text-left border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">OTOMATİK OLUŞTURULAN TEKLİF METNİ (AI)</h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-mono">{proposalMsg}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
            <Send className="w-4 h-4 mr-2" />
            WhatsApp ile Gönder
          </button>
          <button className="flex items-center justify-center px-6 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg font-medium transition-colors">
            <Download className="w-4 h-4 mr-2" />
            PDF İndir
          </button>
          <button className="flex items-center justify-center px-6 py-3 bg-brand-primary hover:bg-blue-800 text-white rounded-lg font-medium transition-colors">
            <CreditCard className="w-4 h-4 mr-2" />
            Satın Al (Sanal POS)
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto">
      {/* Steps Indicator */}
      <div className="flex items-center justify-between mb-8 px-4">
        {STEPS.map((step, index) => (
          <div key={index} className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${index <= activeStep
                ? 'bg-brand-primary text-white shadow-lg shadow-blue-900/20'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
              {index < activeStep ? <Check className="w-5 h-5" /> : index + 1}
            </div>
            <span className={`text-xs mt-2 font-medium ${index <= activeStep ? 'text-brand-primary dark:text-blue-400' : 'text-slate-400'}`}>
              {step}
            </span>
          </div>
        ))}
        {/* Progress Bar Line */}
        <div className="absolute top-9 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -z-0 hidden md:block" style={{
          left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 100px)'
        }}>
          <div
            className="h-full bg-brand-primary transition-all duration-500"
            style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Teklifler Hazırlanıyor...</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            <span className="font-semibold text-brand-primary">{activeCompanies.length}</span> sigorta şirketi taranıyor ve Yapay Zeka analiz yapıyor.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[400px]">
          {activeStep === 0 && renderStep1()}
          {activeStep === 2 && renderStep2()}
          {activeStep === 3 && renderStep3()}
        </div>
      )}
    </div>
  );
};
