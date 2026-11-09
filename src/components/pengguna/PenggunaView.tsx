/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { UserSimulasi, Role } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  Edit2,
  Plus,
  X,
  Building,
} from 'lucide-react';

export const PenggunaView: React.FC = () => {
  const { currentRole, penggunaList, addUser, updateUser, showToast } = useApp();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<UserSimulasi, 'id'>>({
    nama: '',
    nip: '',
    jabatan: '',
    peran: 'bpp_rm',
    sumberDanaAkses: 'RM',
    statusAktif: true,
    email: '',
  });

  if (currentRole !== 'bendahara') {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center max-w-lg mx-auto shadow-xs">
        <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900">Akses Dibatasi</h3>
        <p className="text-xs text-slate-600 mt-1">
          Halaman Manajemen Akun BPP hanya dapat diakses oleh peran <strong>Bendahara Pengeluaran</strong>.
        </p>
      </div>
    );
  }

  const handleRoleChange = (role: Role) => {
    let dana: 'SEMUA' | 'RM' | 'PNBP' = 'RM';
    if (role === 'bendahara') dana = 'SEMUA';
    if (role === 'bpp_pnbp') dana = 'PNBP';

    setFormData(prev => ({
      ...prev,
      peran: role,
      sumberDanaAkses: dana,
    }));
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nip.trim() || !formData.jabatan.trim()) {
      showToast('Harap lengkapi nama, NIP, dan jabatan pengguna!', 'warning');
      return;
    }

    addUser(formData);
    setIsAddModalOpen(false);
    setFormData({
      nama: '',
      nip: '',
      jabatan: '',
      peran: 'bpp_rm',
      sumberDanaAkses: 'RM',
      statusAktif: true,
      email: '',
    });
  };

  const handleToggleStatus = (user: UserSimulasi) => {
    if (user.peran === 'bendahara') {
      showToast('Akun Bendahara Pengeluaran utama tidak dapat dinonaktifkan!', 'warning');
      return;
    }
    updateUser(user.id, { statusAktif: !user.statusAktif });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Manajemen Akun Bendahara Pengeluaran Pembantu (BPP)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan hak akses pengguna satker BBPKA PDN IV (Akses khusus Bendahara Pengeluaran)
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Akun BPP</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Nama Pegawai & NIP</th>
                <th className="py-3 px-4">Jabatan Struktural/Fungsional</th>
                <th className="py-3 px-4">Peran Sistem</th>
                <th className="py-3 px-4">Hak Akses Dana</th>
                <th className="py-3 px-4">Email Dinas</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {penggunaList.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{user.nama}</div>
                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">NIP: {user.nip}</div>
                  </td>

                  <td className="py-3 px-4 text-slate-700">{user.jabatan}</td>

                  <td className="py-3 px-4">
                    <span
                      className={`text-[11px] font-semibold ${
                        user.peran === 'bendahara'
                          ? 'text-purple-700'
                          : user.peran === 'bpp_rm'
                          ? 'text-blue-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {user.peran === 'bendahara'
                        ? 'Bendahara Pengeluaran'
                        : user.peran === 'bpp_rm'
                        ? 'BPP Rupiah Murni (RM)'
                        : 'BPP PNBP'}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {user.sumberDanaAkses === 'SEMUA' ? 'RM & PNBP' : user.sumberDanaAkses}
                  </td>

                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{user.email}</td>

                  <td className="py-3 px-4 text-center">
                    {user.statusAktif ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600">
                        <XCircle className="w-3.5 h-3.5" /> Nonaktif
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleToggleStatus(user)}
                      disabled={user.peran === 'bendahara'}
                      className="px-2.5 py-1 text-[11px] rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700"
                    >
                      {user.statusAktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Tambah Akun BPP Baru
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))}
                  placeholder="Contoh: Budi Gunawan, S.E."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    NIP (18 Digit)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nip}
                    onChange={e => setFormData(prev => ({ ...prev, nip: e.target.value }))}
                    placeholder="19950812 201801 1 002"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jabatan Struktural
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.jabatan}
                    onChange={e => setFormData(prev => ({ ...prev, jabatan: e.target.value }))}
                    placeholder="Staf Pengelola Keuangan BPP"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Peran Pengguna
                  </label>
                  <select
                    value={formData.peran}
                    onChange={e => handleRoleChange(e.target.value as Role)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 focus:outline-none"
                  >
                    <option value="bpp_rm">BPP Rupiah Murni (RM)</option>
                    <option value="bpp_pnbp">BPP PNBP Layanan</option>
                    <option value="bendahara">Bendahara Pengeluaran</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hak Akses Sumber Dana
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.sumberDanaAkses}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 font-mono text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Email Dinas
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="nama.pegawai@bbpka-pdn4.go.id"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Simpan Akun
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
