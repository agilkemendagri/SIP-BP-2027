/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Role, Transaksi, UserSimulasi, SumberDana } from '../types';
import { INITIAL_TRANSAKSI, DAFTAR_PENGGUNA } from '../data/mockData';

export type ActiveView = 
  | 'dashboard'
  | 'kuitansi_profesi'
  | 'kuitansi_luar_kota'
  | 'kuitansi_dalam_kota'
  | 'sptb'
  | 'transaksi'
  | 'rekap'
  | 'pengguna';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface AppContextType {
  // Navigation & Role
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  currentRole: Role;
  setCurrentRole: (role: Role) => void;
  currentUser: UserSimulasi;
  
  // Data
  allTransaksi: Transaksi[];
  visibleTransaksi: Transaksi[]; // filtered by active role
  penggunaList: UserSimulasi[];
  
  // Dashboard & global filters
  filterTahun: string;
  setFilterTahun: (tahun: string) => void;
  filterBulan: string;
  setFilterBulan: (bulan: string) => void;

  // Actions
  addTransaksi: (data: Omit<Transaksi, 'id' | 'createdAt' | 'updatedAt'>) => Transaksi;
  updateTransaksi: (id: string, updates: Partial<Transaksi>) => void;
  deleteTransaksi: (id: string) => boolean;
  markSaktiBulk: (ids: string[]) => void;
  toggleSaktiSingle: (id: string) => void;
  finalizeTransaksi: (id: string) => void;
  addUser: (user: Omit<UserSimulasi, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserSimulasi>) => void;
  resetToDefaultData: () => void;

  // Modals & Previews
  previewKuitansi: Transaksi | null;
  setPreviewKuitansi: (t: Transaksi | null) => void;
  previewSptb: Transaksi | null;
  setPreviewSptb: (t: Transaksi | null) => void;
  editingTransaksi: Transaksi | null;
  setEditingTransaksi: (t: Transaksi | null) => void;
  isCreateKuitansiModalOpen: boolean;
  setIsCreateKuitansiModalOpen: (open: boolean) => void;
  startNewKuitansi: (type: 'kuitansi_profesi' | 'kuitansi_luar_kota' | 'kuitansi_dalam_kota') => void;
  generateNextTransactionNumbers: (sumberDana: SumberDana, tanggalKuitansi?: string) => { nomorSPTB: string; nomorKuitansi: string };
  
  // Bulk SAKTI selection & modal
  selectedForSaktiIds: string[];
  setSelectedForSaktiIds: React.Dispatch<React.SetStateAction<string[]>>;
  isBulkSaktiModalOpen: boolean;
  setIsBulkSaktiModalOpen: (open: boolean) => void;

  // Toast
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_TRANSAKSI = 'sip_bp_transaksi_v1';
const STORAGE_KEY_PENGGUNA = 'sip_bp_pengguna_v1';
const STORAGE_KEY_ROLE = 'sip_bp_role_v1';

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. Role State
  const [currentRole, setCurrentRoleState] = useState<Role>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ROLE);
    return (saved === 'bendahara' || saved === 'bpp_rm' || saved === 'bpp_pnbp') ? saved : 'bendahara';
  });

  const setCurrentRole = (role: Role) => {
    setCurrentRoleState(role);
    localStorage.setItem(STORAGE_KEY_ROLE, role);
    showToast(`Peran dialihkan ke: ${role === 'bendahara' ? 'Bendahara Pengeluaran' : role === 'bpp_rm' ? 'BPP Rupiah Murni (RM)' : 'BPP PNBP'}`, 'info');
    if (role !== 'bendahara' && activeView === 'pengguna') {
      setActiveView('dashboard');
    }
  };

  // 2. Active View
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // 3. Transactions data
  const [allTransaksi, setAllTransaksi] = useState<Transaksi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRANSAKSI);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_TRANSAKSI;
  });

  // Save transactions to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRANSAKSI, JSON.stringify(allTransaksi));
    } catch {
      // storage unavailable
    }
  }, [allTransaksi]);

  // 4. Users data
  const [penggunaList, setPenggunaList] = useState<UserSimulasi[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PENGGUNA);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DAFTAR_PENGGUNA;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PENGGUNA, JSON.stringify(penggunaList));
    } catch {
      // ignore
    }
  }, [penggunaList]);

  // Current active simulated user based on role
  const currentUser = useMemo(() => {
    const found = penggunaList.find(u => u.peran === currentRole);
    return found || penggunaList[0];
  }, [penggunaList, currentRole]);

  // Filter transactions visible to active role:
  // Bendahara -> RM & PNBP
  // BPP RM -> RM only
  // BPP PNBP -> PNBP only
  const visibleTransaksi = useMemo(() => {
    if (currentRole === 'bendahara') {
      return allTransaksi;
    }
    if (currentRole === 'bpp_rm') {
      return allTransaksi.filter(t => t.sumberDana === 'RM');
    }
    if (currentRole === 'bpp_pnbp') {
      return allTransaksi.filter(t => t.sumberDana === 'PNBP');
    }
    return allTransaksi;
  }, [allTransaksi, currentRole]);

  // 5. Global date filters for Dashboard
  const [filterTahun, setFilterTahun] = useState<string>('2026');
  const [filterBulan, setFilterBulan] = useState<string>('SEMUA');

  // 6. Modals & selection
  const [previewKuitansi, setPreviewKuitansi] = useState<Transaksi | null>(null);
  const [previewSptb, setPreviewSptb] = useState<Transaksi | null>(null);
  const [editingTransaksi, setEditingTransaksi] = useState<Transaksi | null>(null);
  const [isCreateKuitansiModalOpen, setIsCreateKuitansiModalOpen] = useState(false);
  const [selectedForSaktiIds, setSelectedForSaktiIds] = useState<string[]>([]);
  const [isBulkSaktiModalOpen, setIsBulkSaktiModalOpen] = useState(false);

  // Quick action to start a fresh receipt with clean defaults
  const startNewKuitansi = (type: 'kuitansi_profesi' | 'kuitansi_luar_kota' | 'kuitansi_dalam_kota') => {
    setEditingTransaksi(null);
    setActiveView(type);
    setIsCreateKuitansiModalOpen(false);
  };

  // Sequential, consistent non-random numbering generator
  const generateNextTransactionNumbers = (sumberDana: SumberDana, tanggalKuitansi?: string) => {
    const dateStr = tanggalKuitansi || new Date().toISOString().split('T')[0];
    const [year, month] = dateStr.split('-');
    
    // Count existing transactions for this funding source and year/month to ensure sequential numbering
    const relevantCount = allTransaksi.filter(t => {
      const tMonth = t.tanggalKuitansi ? t.tanggalKuitansi.split('-')[1] : '';
      return t.sumberDana === sumberDana && tMonth === month;
    }).length;

    const nextSeq = relevantCount + 1;
    const seqPadded = nextSeq.toString().padStart(3, '0');
    const nomorKuitansi = `KUI/${sumberDana}/${year}/${month}/${seqPadded}`;
    const nomorSPTB = `SPTB/${sumberDana}/BBPKAPDNIV/${month}/${seqPadded}`;

    return { nomorSPTB, nomorKuitansi };
  };

  // 7. Toast feedback
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Transaction CRUD Actions
  const addTransaksi = (data: Omit<Transaksi, 'id' | 'createdAt' | 'updatedAt'>): Transaksi => {
    const now = new Date().toISOString();
    const newId = `TRX-${Date.now().toString().slice(-6)}`;
    const newTrx: Transaksi = {
      ...data,
      id: newId,
      createdAt: now,
      updatedAt: now,
    };
    setAllTransaksi(prev => [newTrx, ...prev]);
    showToast(`Transaksi ${newTrx.nomorKuitansi} berhasil dibuat sebagai ${newTrx.status}!`, 'success');
    return newTrx;
  };

  const updateTransaksi = (id: string, updates: Partial<Transaksi>) => {
    setAllTransaksi(prev => prev.map(t => {
      if (t.id === id) {
        // Guard: if already SAKTI, it is locked!
        if (t.sudahSakti && updates.status && updates.status !== 'Final') {
          showToast('Transaksi sudah digunakan di SAKTI dan terkunci dari perubahan status!', 'warning');
          return t;
        }
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    showToast('Data transaksi berhasil diperbarui.', 'success');
  };

  const deleteTransaksi = (id: string): boolean => {
    const target = allTransaksi.find(t => t.id === id);
    if (!target) return false;
    if (target.sudahSakti) {
      showToast('Transaksi sudah digunakan di SAKTI dan terkunci, tidak dapat dihapus!', 'error');
      return false;
    }
    setAllTransaksi(prev => prev.filter(t => t.id !== id));
    setSelectedForSaktiIds(prev => prev.filter(item => item !== id));
    showToast(`Transaksi ${target.nomorKuitansi} berhasil dihapus.`, 'info');
    return true;
  };

  const finalizeTransaksi = (id: string) => {
    setAllTransaksi(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: 'Final',
          updatedAt: new Date().toISOString()
        };
      }
      return t;
    }));
    showToast('Transaksi berhasil di-Finalisasi.', 'success');
  };

  const toggleSaktiSingle = (id: string) => {
    setAllTransaksi(prev => prev.map(t => {
      if (t.id === id) {
        if (t.status !== 'Final') {
          showToast('Hanya transaksi berstatus Final yang dapat ditandai digunakan di SAKTI!', 'warning');
          return t;
        }
        const nextState = !t.sudahSakti;
        return {
          ...t,
          sudahSakti: nextState,
          tanggalSakti: nextState ? new Date().toISOString().split('T')[0] : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    }));
    showToast('Status SAKTI berhasil diubah.', 'info');
  };

  const markSaktiBulk = (ids: string[]) => {
    if (ids.length === 0) return;
    if (ids.length > 100) {
      showToast('Maksimal penandaan massal adalah 100 transaksi!', 'warning');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let countUpdated = 0;

    setAllTransaksi(prev => prev.map(t => {
      if (ids.includes(t.id) && t.status === 'Final' && !t.sudahSakti) {
        countUpdated++;
        return {
          ...t,
          sudahSakti: true,
          tanggalSakti: today,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    }));

    setSelectedForSaktiIds([]);
    setIsBulkSaktiModalOpen(false);
    showToast(`Sebanyak ${countUpdated} transaksi berhasil ditandai 'Sudah Digunakan di SAKTI' dan dikunci.`, 'success');
  };

  const addUser = (userData: Omit<UserSimulasi, 'id'>) => {
    const newId = `USR-${(penggunaList.length + 1).toString().padStart(3, '0')}`;
    const newUser: UserSimulasi = { ...userData, id: newId };
    setPenggunaList(prev => [...prev, newUser]);
    showToast(`Pengguna ${newUser.nama} berhasil ditambahkan.`, 'success');
  };

  const updateUser = (id: string, updates: Partial<UserSimulasi>) => {
    setPenggunaList(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    showToast('Data pengguna berhasil diperbarui.', 'success');
  };

  const resetToDefaultData = () => {
    setAllTransaksi(INITIAL_TRANSAKSI);
    setPenggunaList(DAFTAR_PENGGUNA);
    setSelectedForSaktiIds([]);
    localStorage.removeItem(STORAGE_KEY_TRANSAKSI);
    localStorage.removeItem(STORAGE_KEY_PENGGUNA);
    showToast('Data simulasi berhasil dikembalikan ke kondisi awal bawaan.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        currentRole,
        setCurrentRole,
        currentUser,
        allTransaksi,
        visibleTransaksi,
        penggunaList,
        filterTahun,
        setFilterTahun,
        filterBulan,
        setFilterBulan,
        addTransaksi,
        updateTransaksi,
        deleteTransaksi,
        markSaktiBulk,
        toggleSaktiSingle,
        finalizeTransaksi,
        addUser,
        updateUser,
        resetToDefaultData,
        previewKuitansi,
        setPreviewKuitansi,
        previewSptb,
        setPreviewSptb,
        editingTransaksi,
        setEditingTransaksi,
        isCreateKuitansiModalOpen,
        setIsCreateKuitansiModalOpen,
        startNewKuitansi,
        generateNextTransactionNumbers,
        selectedForSaktiIds,
        setSelectedForSaktiIds,
        isBulkSaktiModalOpen,
        setIsBulkSaktiModalOpen,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
