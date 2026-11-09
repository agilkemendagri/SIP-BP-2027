/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import {
  Menu,
  User,
  PlusCircle,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    activeView,
    setActiveView,
    currentRole,
    currentUser,
    setIsCreateKuitansiModalOpen,
  } = useApp();


  const getBreadcrumbTitle = (view: ActiveView): string => {
    switch (view) {
      case 'dashboard':
        return 'Dashboard Keuangan';
      case 'kuitansi_profesi':
        return 'Kuitansi / Jasa Profesi & Honorarium';
      case 'kuitansi_luar_kota':
        return 'Kuitansi / Perjalanan Dinas Luar Kota';
      case 'kuitansi_dalam_kota':
        return 'Kuitansi / Perjalanan Dinas Dalam Kota';
      case 'sptb':
        return 'Surat Pernyataan Tanggung Jawab Belanja (SPTB)';
      case 'transaksi':
        return 'Daftar Transaksi Pengeluaran';
      case 'rekap':
        return 'Rekapitulasi Belanja & Ekspor';
      case 'ekstraktor':
        return 'Ekstraktor Kuitansi dari Luar Sistem';
      case 'pengguna':
        return 'Manajemen Akun BPP & Pengguna';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print shadow-xs">
      {/* Zone 1: Mobile toggle & Breadcrumb title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg hover:bg-slate-100"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <span className="text-xs text-slate-600 hidden sm:inline">SIP-BP</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
            {getBreadcrumbTitle(activeView)}
          </h1>
        </div>
      </div>

      {/* Zone 2 & 3: Role Switcher & User Profile */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Peran selalu berasal dari Supabase, bukan dropdown simulasi. */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900" title="Peran sesuai akun login">
          {currentRole==="bendahara"?"Bendahara · RM + PNBP":currentRole==="bpp_rm"?"BPP RM":"BPP PNBP"}
        </div>

        {/* User Identity Chip */}
        <button type="button" onClick={()=>setActiveView('pengguna')} disabled={currentRole!=="bendahara"} title={currentRole==="bendahara"?"Atur nama, NIP dan jabatan Bendahara":"Profil pengguna"} className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 text-xs text-left disabled:cursor-default enabled:hover:bg-blue-50 rounded-lg p-1 transition-colors">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-semibold text-xs">
            {currentUser.nama
              .split(' ')
              .map(n => n[0])
              .filter(c => c && /[A-Z]/.test(c))
              .slice(0, 2)
              .join('') || 'U'}
          </div>
          <div className="text-left leading-tight">
            <span className="font-semibold text-slate-800 block truncate max-w-[140px]">
              {currentUser.nama}
            </span>
            <span className="text-[10px] text-slate-600 font-mono">
              {currentUser.nip ? `NIP: ${currentUser.nip}` : "NIP belum diisi"}
            </span>
          </div>
        </button>

        {/* Quick Kuitansi Trigger Button */}
        <button
          onClick={() => setIsCreateKuitansiModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Buat Kuitansi</span>
        </button>
      </div>
    </header>
  );
};
