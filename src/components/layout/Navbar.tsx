/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp, ActiveView } from '../../context/AppContext';
import { Role } from '../../types';
import {
  Menu,
  ChevronDown,
  User,
  PlusCircle,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    activeView,
    setActiveView,
    currentRole,
    setCurrentRole,
    currentUser,
    setIsCreateKuitansiModalOpen,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

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
      case 'pengguna':
        return 'Manajemen Akun BPP & Pengguna';
      default:
        return 'Dashboard';
    }
  };

  const rolesList: { id: Role; label: string; desc: string; badge: string }[] = [
    {
      id: 'bendahara',
      label: 'Bendahara Pengeluaran',
      desc: 'Akses Penuh: Rupiah Murni (RM) + PNBP & Manajemen Pengguna',
      badge: 'RM + PNBP',
    },
    {
      id: 'bpp_rm',
      label: 'BPP Rupiah Murni (RM)',
      desc: 'Hanya melihat & mengelola belanja bersumber dana RM',
      badge: 'Khusus RM',
    },
    {
      id: 'bpp_pnbp',
      label: 'BPP PNBP Layanan',
      desc: 'Hanya melihat & mengelola belanja bersumber dana PNBP',
      badge: 'Khusus PNBP',
    },
  ];

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
        {/* Role Switcher Pill / Dropdown */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title="Ganti Peran Pengguna (Simulasi)"
          >
            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <div className="text-left hidden sm:block">
              <span className="text-[10px] text-slate-600 uppercase tracking-wider block font-semibold">
                Peran Aktif:
              </span>
              <span className="font-semibold text-slate-900">
                {currentRole === 'bendahara'
                  ? 'Bendahara Pengeluaran'
                  : currentRole === 'bpp_rm'
                  ? 'BPP RM'
                  : 'BPP PNBP'}
              </span>
            </div>
            <span className="sm:hidden font-semibold">
              {currentRole === 'bendahara' ? 'Bendahara' : currentRole === 'bpp_rm' ? 'BPP RM' : 'BPP PNBP'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 ml-0.5" />
          </button>

          {/* Role Dropdown Menu */}
          {roleDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setRoleDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-72 sm:w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-2 text-xs">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>Pilih Peran Pengguna</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-normal">
                      Mode Simulasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Demonstrasikan perbedaan hak akses data RM, PNBP, dan menu.
                  </p>
                </div>

                <div className="space-y-1">
                  {rolesList.map(item => {
                    const isSelected = currentRole === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentRole(item.id);
                          setRoleDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-blue-50/80 border border-blue-200 text-slate-900'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            isSelected ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-slate-900">{item.label}</span>
                            <span className="text-[10px] text-slate-600 bg-slate-100 px-1 rounded">
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Identity Chip */}
        <div className="hidden md:flex items-center gap-2.5 pl-3 border-l border-slate-200 text-xs">
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
              NIP: {currentUser.nip.split(' ')[0]}...
            </span>
          </div>
        </div>

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
