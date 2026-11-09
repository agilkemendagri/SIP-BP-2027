import React from 'react';
import { Transaksi } from '../../../types';
import { formatTanggalIndo } from '../../../utils/formatters';

/** Format cetak berdasar contoh kuitansi perdin.pdf; semua nilai berasal dari transaksi. */
export const PerincianBiayaSppdRampung: React.FC<{ transaksi: Transaksi }> = ({ transaksi: t }) => {
  const uang = (n: number) => Math.round(n).toLocaleString('id-ID');
  const ditetapkan = t.totalBruto;
  const dibayarSemula = t.sudahDibayarSemula ?? 0;
  const sisa = ditetapkan - dibayarSemula;
  const kota = t.kotaTandaTangan || t.kotaTujuan?.split(',')[0] || '................';
  const tanggal = t.tanggalTandaTangan || t.tanggalKuitansi;
  const rowStyle: React.CSSProperties = { border: '1px solid #222', padding: '4px 5px', verticalAlign: 'top' };
  return (
    <article className="sppd-rampung-sheet" style={{ background: '#fff', color: '#111', padding: '12mm 10mm', width: '210mm', minHeight: 'auto', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: 1.32 }}>
      <div style={{ fontSize: '10px', marginBottom: '12px' }}>
        <div><b>Lampiran SPPD Nomor :</b> {t.nomorSPPD || '..................................'}</div>
        <div><b>Tanggal :</b> {t.tanggalSPPD ? formatTanggalIndo(t.tanggalSPPD) : '..................................'}</div>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup><col style={{width:'5%'}}/><col style={{width:'57%'}}/><col style={{width:'21%'}}/><col style={{width:'17%'}}/></colgroup>
        <thead><tr>
          {['NO', 'PERINCIAN BIAYA', 'JUMLAH', 'KETERANGAN'].map(h => <th key={h} style={{...rowStyle, textAlign:'center', fontWeight: 700}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {t.penerimaList.map((item, i) => (
            <tr key={item.id || i} style={{breakInside:'avoid'}}>
              <td style={{...rowStyle,textAlign:'center'}}>{i + 1}</td>
              <td style={rowStyle}>
                <div style={{display:'flex',justifyContent:'space-between',gap:'8px'}}>
                  <span style={{flex:'1 1 auto'}}>{item.uraianItem}</span>
                  <span style={{whiteSpace:'nowrap'}}>{item.volume !== 1 || item.tarifSatuan !== item.bruto ? `${uang(item.volume)} ${item.satuan} x @Rp ${uang(item.tarifSatuan)}` : ''}</span>
                </div>
              </td>
              <td style={{...rowStyle,textAlign:'right',whiteSpace:'nowrap'}}>Rp {uang(item.bruto)}</td>
              <td style={rowStyle}>{t.keteranganBiaya?.[i] || ''}</td>
            </tr>
          ))}
          <tr style={{breakInside:'avoid'}}><td colSpan={2} style={{...rowStyle,fontWeight:700}}>JUMLAH</td><td style={{...rowStyle,fontWeight:700,textAlign:'right',whiteSpace:'nowrap'}}>Rp {uang(ditetapkan)}</td><td style={rowStyle}/></tr>
        </tbody>
      </table>
      {(t.totalPPN > 0 || t.totalPPh > 0) && <p style={{fontSize:'9px',marginTop:'6px'}}>Catatan pencatatan pajak (di luar total perincian biaya): PPN Rp {uang(t.totalPPN)}; PPh Rp {uang(t.totalPPh)}; nilai netto Rp {uang(t.totalNetto)}.</p>}
      <div style={{textAlign:'right',marginTop:'12px'}}>{kota}, {formatTanggalIndo(tanggal)}</div>
      <div className="sppd-signatures" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px',marginTop:'10px',breakInside:'avoid'}}>
        <div>
          <div>Telah dibayar sejumlah</div><b>Rp {uang(Math.max(0,sisa))}</b>
          <div style={{marginTop:'8px'}}>Bendahara Pengeluaran</div>
          <div style={{height:'48px'}}/>
          <div style={{fontWeight:700,textDecoration:'underline'}}>{t.bendaharaNama || '................................'}</div>
          <div>NIP. {t.bendaharaNip || '................................'}</div>
        </div>
        <div>
          <div>Telah menerima jumlah uang sebesar</div><b>Rp {uang(Math.max(0,sisa))}</b>
          <div style={{marginTop:'8px'}}>Yang Menerima</div>
          <div style={{height:'48px'}}/>
          <div style={{fontWeight:700,textDecoration:'underline'}}>{t.ringkasanPenerima}</div>
          <div>{t.penerimaList[0]?.nip ? `NIP. ${t.penerimaList[0].nip}` : ''}</div>
        </div>
      </div>
      <div className="sppd-rampung-calc" style={{breakInside:'avoid',marginTop:'16px'}}>
        <div style={{fontWeight:700,textAlign:'center',marginBottom:'7px'}}>PERHITUNGAN SPPD RAMPUNG</div>
        <table style={{borderCollapse:'collapse',width:'64%'}}><tbody>
          <tr><td>Ditetapkan sejumlah</td><td style={{textAlign:'right'}}>Rp {uang(ditetapkan)}</td></tr>
          <tr><td>Yang telah dibayar semula</td><td style={{textAlign:'right'}}>Rp {uang(dibayarSemula)}</td></tr>
          <tr><td>Sisa Kurang/Lebih</td><td style={{textAlign:'right'}}>Rp {uang(sisa)}</td></tr>
        </tbody></table>
      </div>
      <div className="sppd-signatures" style={{breakInside:'avoid',marginTop:'14px'}}>
        <div>Setuju Dibayar :</div>
        <div>a.n. Kuasa Pengguna Anggaran</div>
        <b>PEJABAT PEMBUAT KOMITMEN</b>
        <div style={{height:'48px'}}/>
        <div style={{fontWeight:700,textDecoration:'underline'}}>{t.ppkNama || '................................'}</div>
        <div>NIP. {t.ppkNip || '................................'}</div>
      </div>
    </article>
  );
};
