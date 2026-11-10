/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {isProductionEnvironment,sipBpEnvironmentLabel} from '../../lib/sipBpEnvironment';
import { useApp, ActiveView } from '../../context/AppContext';
import {
  LayoutDashboard,
  Receipt,
  FileCheck2,
  ListFilter,
  FileSpreadsheet,
  Users,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Plane,
  Car,
  RotateCcw,
  ShieldCheck,
  Building2,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { activeView, setActiveView, currentRole } = useApp();
  const [kuitansiExpanded, setKuitansiExpanded] = useState<boolean>(() => {
    return activeView.startsWith('kuitansi_');
  });

  const isKuitansiActive = activeView.startsWith('kuitansi_');

  const handleNavClick = (view: ActiveView) => {
    setActiveView(view);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden no-print"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Monogram Branding Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-base tracking-wider shadow-sm shadow-blue-500/20">
              BP
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-base tracking-tight leading-none">SIP-BP</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-1">BBPKA PDN IV</span>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1 text-slate-400 hover:text-white lg:hidden rounded-md"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Institution Info Strip */}
        <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate" title="Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV">BBPKA PDN IV · Kemendagri</span>
          </div>
        </div>

        {/* Main Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 text-xs sm:text-sm font-medium">
          {/* Dashboard */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
              activeView === 'dashboard'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Dashboard</span>
          </button>

          {/* Kuitansi (Dropdown) */}
          <div className="space-y-1">
            <button
              onClick={() => setKuitansiExpanded(prev => !prev)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors text-left ${
                isKuitansiActive
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Receipt className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Kuitansi</span>
              </div>
              {kuitansiExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {kuitansiExpanded && (
              <div className="pl-6 space-y-1 pt-1">
                <button
                  onClick={() => handleNavClick('kuitansi_profesi')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left ${
                    activeView === 'kuitansi_profesi'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span>Jasa Profesi</span>
                </button>
                <button
                  onClick={() => handleNavClick('kuitansi_luar_kota')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left ${
                    activeView === 'kuitansi_luar_kota'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Plane className="w-3.5 h-3.5 shrink-0" />
                  <span>Perjadin Luar Kota</span>
                </button>
                <button
                  onClick={() => handleNavClick('kuitansi_dalam_kota')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs transition-colors text-left ${
                    activeView === 'kuitansi_dalam_kota'
                      ? 'bg-blue-600/90 text-white font-semibold'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-3.5 h-3.5 shrink-0" />
                  <span>Perjadin Dalam Kota</span>
                </button>
              </div>
            )}
          </div>

          {/* SPTB */}
          <button
            onClick={() => handleNavClick('sptb')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
              activeView === 'sptb'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCheck2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>SPTB</span>
          </button>

          {/* Daftar Transaksi */}
          <button
            onClick={() => handleNavClick('transaksi')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
              activeView === 'transaksi'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <ListFilter className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>Daftar Transaksi</span>
          </button>

          {/* Rekap & Ekspor */}
          <button
            onClick={() => handleNavClick('rekap')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
              activeView === 'rekap'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Rekap & Ekspor</span>
          </button>

          {/* Pengguna (Khusus Bendahara) */}
          {currentRole === 'bendahara' && (
            <div className="pt-2">
              <div className="px-3 pb-1 text-[10px] uppercase font-semibold text-slate-500 tracking-wider">
                Administrasi
              </div>
              <button
                onClick={() => handleNavClick('pengguna')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                  activeView === 'pengguna'
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-amber-400" />
                <span>Administrasi</span>
              </button>
            </div>
          )}
        </nav>

        {/* Footer simulation status & reset */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Data Supabase {sipBpEnvironmentLabel}
            </span>

          </div>
          <div className="text-[10px] text-slate-500 leading-tight">
            {isProductionEnvironment ? 'Data tersimpan di Supabase Production yang terpisah.' : 'Transaksi tersimpan di database DEV. Gunakan data simulasi saja.'}
          </div>
        </div>
      </aside>
    </>
  );
};
