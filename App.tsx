
import React, { useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { QuotationWizard } from './components/QuotationWizard';
import { Settings } from './components/Settings';
import { AIChatAssistant } from './components/AIChatAssistant';
import { Analysis } from './components/Analysis';
import { Customers } from './components/Customers';
import { Policies } from './components/Policies';
import { SystemAnatomy } from './components/SystemAnatomy';
import { FinancialManagement } from './components/FinancialManagement/FinancialManagement';
import { DataImport } from './components/DataImport';
import { ToastProvider } from './contexts/ToastContext';
import { Users, FileText } from 'lucide-react';

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center h-[500px] text-slate-400">
    <div className="bg-slate-100 p-6 rounded-full mb-4">
      {title === 'Müşteriler' ? <Users className="w-12 h-12" /> : <FileText className="w-12 h-12" />}
    </div>
    <h2 className="text-xl font-semibold text-slate-600">{title} Modülü</h2>
    <p className="mt-2 text-sm">Bu modül yakında aktif olacaktır.</p>
  </div>
);

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'quote': return <QuotationWizard />;
      case 'customers': return <Customers onNavigate={setCurrentPage} />;
      case 'policies': return <Policies onNavigate={setCurrentPage} />;
      case 'analysis': return <Analysis />;
      case 'settings': return <Settings onNavigate={setCurrentPage} />;
      case 'financial': return <FinancialManagement />;
      case 'import': return <DataImport />;
      case 'anatomy': return <SystemAnatomy />;
      default: return <Dashboard />;
    }
  };

  return (
    <HashRouter>
      <ToastProvider>
        <Layout activePage={currentPage} onNavigate={setCurrentPage}>
          {renderContent()}
        </Layout>
        <AIChatAssistant />
      </ToastProvider>
    </HashRouter>
  );
};

export default App;
