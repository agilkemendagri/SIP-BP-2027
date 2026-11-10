import './professionReceiptParser.test';
import assert from 'node:assert/strict';
import {parseOutsideTravelReceipt,parseInsideTravelReceipt} from '../src/utils/travelReceiptParser';

const outside=[
'Lampiran SPPD Nomor : 0741/SPD/BBPKAPDN-IV/2026',
'Tanggal : 14 Oktober 2026',
'NO                       PERINCIAN BIAYA                                                 JUMLAH           KETERANGAN',
'1 Uang harian                      3 Hari x @.Rp.       530,000               Rp            1,590,000',
'2 Biaya Penginapan                 1 Hari x @.Rp.     1,380,363               Rp            1,380,363',
'3 Biaya Penginapan                 1 Hari x @.Rp.     2,084,000   30%         Rp              625,200',
'4 Biaya Tiket Pesawat CGK-UPG                                                 Rp            2,851,120',
'5 Uang Representatif               3 Hari x @.Rp.       150,000               Rp              450,000',
'6 Biaya Transport Lumpsum                                                     Rp              431,000        CGK-UPG',
'JUMLAH                                                                   Rp.           7,327,683',
'Makassar, 21 Oktober 2025',
'Bendahara Pengeluaran                                                                      Yang Menerima',
'Afad Zainuddin, S.E.                                                                 Asep Setiadi, S.Sos., M.AP.',
'NIP. 199604232020121008                                                               NIP.197110131992031001',
'PERHITUNGAN SPPD RAMPUNG',
'Ditetapkan sejumlah                                                Rp.                 7,327,683',
'Yang telah dibayar semula                                          Rp.                 7,327,683',
'Sisa Kurang/Lebih                                                  Rp.                       -'
].join('\n');
const o=parseOutsideTravelReceipt(outside);
assert.ok(o,'Outside travel document detected');
assert.equal(o.rows.length,6,'6 cost rows');
assert.equal(o.rows.reduce((n,x)=>n+x.bruto,0),7327683,'Outside total');
assert.equal(o.rows[2].bruto,625200,'30 percent reimbursement');
assert.equal(o.rows[2].tarifDasar,2084000,'Lodging base');
assert.equal(o.rows[2].persentase,30);
assert.equal(o.rows[5].keterangan,'CGK-UPG');
assert.equal(o.tanggalKuitansi,'2025-10-21');
assert.equal(o.tanggalSppd,'2026-10-14');
assert.equal(o.telahDibayarSemula,7327683);
assert.ok(o.warnings.some(x=>x.includes('berbeda')));

const inside=[
'                                             DAFTAR PENERIMAAN',
'Perjalanan dinas dalam kota dalam rangka koordinasi proses permohonan penambahan pagu anggaran PNBP selama',
'                     1 hari pada tanggal 15 Oktober 2026 di Kanwil DJPb Sulsel, GKN, Makassar',
'                                           TANGGAL',
'NO                NAMA                   PELAKSANAAN',
'                                                        OH       Hari   Jumlah          TANDA TANGAN',
'     Ira Mardiana Mangkona, S.Sos.,      15 Oktober',
' 1                                                     170,000     1      170,000',
'     M.M.                                   2026',
'',
'     Andi Intan Mulia Hasanuddin,        15 Oktober',
' 2                                                     170,000     1      170,000',
'     S.STP., M.Si.                          2026',
'',
'                                         15 Oktober',
' 3 Andi Batari Ugi, S.IP., M.Si.                       170,000     1      170,000',
'                                            2026',
'                       JUMLAH                                             510,000',
'                                                                           Makassar, 18 Oktober 2026'
].join('\n');
const i=parseInsideTravelReceipt(inside);
assert.ok(i,'Inside travel document detected');
assert.equal(i.rows.length,3,'3 recipient rows');
assert.equal(i.rows.reduce((n,x)=>n+x.bruto,0),510000,'Inside total');
assert.deepEqual(i.rows.map(r=>r.volume),[1,1,1]);
assert.deepEqual(i.rows.map(r=>r.tarifSatuan),[170000,170000,170000]);
assert.equal(i.tanggalKuitansi,'2026-10-18');
assert.equal(i.rows[0].tanggalPelaksanaan,'2026-10-15');
assert.ok(i.rows[0].nama.includes('Ira Mardiana'));
assert.ok(i.rows[1].nama.includes('Andi Intan'));
assert.ok(i.rows[2].nama.includes('Andi Batari'));
console.log('PASS both travel receipt parser regressions.');
