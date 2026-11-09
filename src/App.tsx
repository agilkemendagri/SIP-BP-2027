/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthPortal } from './components/AuthPortal';
import { isDevAuthConfigured } from './lib/sipBpAuth';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardView } from './components/dashboard/DashboardView';
import { DaftarTransaksiView } from './components/transaksi/DaftarTransaksiView';
import { KuitansiProfesiForm } from './components/kuitansi/KuitansiProfesiForm';
import { KuitansiPerjadinLuarKotaForm } from './components/kuitansi/KuitansiPerjadinLuarKotaForm';
import { KuitansiPerjadinDalamKotaForm } from './components/kuitansi/KuitansiPerjadinDalamKotaForm';
import { SptbView } from './components/sptb/SptbView';
import { RekapView } from './components/rekap/RekapView';
import { PenggunaView } from './components/pengguna/PenggunaView';
import { KuitansiPrintModal } from './components/modals/KuitansiPrintModal';
import { SptbPrintModal } from './components/modals/SptbPrintModal';
import { BulkSaktiModal } from './components/modals/BulkSaktiModal';
import { PilihJenisKuitansiModal } from './components/modals/PilihJenisKuitansiModal';
import { ToastContainer } from './components/common/ToastContainer';
import { PrintStandaloneView } from './components/kuitansi/PrintStandaloneView';

const AppContent: React.FC = () => {
  const { activeView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Jika URL parameter mengandung mode print (misal saat dibuka di tab baru untuk cetak)
  const isPrintMode = typeof window !== 'undefined' && (
    window.location.search.includes('print=true') ||
    window.location.search.includes('mode=print')
  );

  if (isPrintMode) {
    return <PrintStandaloneView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Sidebar (Desktop fixed + Mobile drawer) */}
      <Sidebar mobileOpen={mobileMenuOpen} setMobileOpen={setMobileMenuOpen} />

      {/* Main Content Area (Offset by sidebar width on lg) */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Navbar */}
        <Navbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {activeView === 'dashboard' && <DashboardView />}
          {activeView === 'kuitansi_profesi' && <KuitansiProfesiForm />}
          {activeView === 'kuitansi_luar_kota' && <KuitansiPerjadinLuarKotaForm />}
          {activeView === 'kuitansi_dalam_kota' && <KuitansiPerjadinDalamKotaForm />}
          {activeView === 'sptb' && <SptbView />}
          {activeView === 'transaksi' && <DaftarTransaksiView />}
          {activeView === 'rekap' && <RekapView />}
          {activeView === 'pengguna' && <PenggunaView />}
        </main>

        {/* Quiet Footer */}
        <footer className="py-4 px-6 border-t border-slate-200 text-center text-xs text-slate-500 no-print">
          <span>SIP-BP · Sistem Informasi Pencatatan Bendahara Pengeluaran</span>
          <span className="mx-2">·</span>
          <span>BBPKA PDN IV (Balai Besar Pengawasan Keuangan dan Aset Perdagangan Dalam Negeri IV)</span>
        </footer>
      </div>

      {/* Modals & Portals */}
      <PilihJenisKuitansiModal />
      <KuitansiPrintModal />
      <SptbPrintModal />
      <BulkSaktiModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  if (isDevAuthConfigured) return <AuthPortal />;
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
