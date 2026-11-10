import {strict as assert} from 'node:assert';
import {parseProfessionReceipt} from '../src/utils/professionReceiptParser';

const readingOrder = [
'BALAI BESAR PENGEMBANGAN KOMPETENSI',
'APARATUR PEMERINTAHAN DALAM NEGERI IV',
'TANDA TERIMA',
'Sudah terima dari Pejabat Pembuat Komitmen Satker BBPK APDN IV:',
'No Nama Untuk Pembayaran JP @Rp Bruto Pph Netto Tanda Tangan',
'1 Ryan Novryanto, S.Tr.IP Honor Pembinaan Sikap Perilaku 20 April 2026 pada Latsar CPNS Angkatan XXXIX 2 200.000 400.000 20.000 380.000',
'2 Ryan Novryanto, S.Tr.IP Honor Pembinaan Sikap Perilaku 5 Mei 2026 pada Latsar CPNS Angkatan XXXIX 1 200.000 200.000 10.000 190.000',
'3 Ryan Novryanto, S.Tr.IP Honor Pembinaan Sikap Perilaku 16 Mei 2026 pada Latsar CPNS Angkatan XXXIX 2 200.000 400.000 20.000 380.000',
'JUMLAH 1.000.000 50.000 950.000',
'Makassar, 6 November 2026'
].join('\n');

const parsed=parseProfessionReceipt(readingOrder);
assert.ok(parsed,'collective format recognized');
assert.equal(parsed.rows.length,3,'all three payment rows recognized');
assert.deepEqual(parsed.rows.map(r=>r.volume),[2,1,2]);
assert.deepEqual(parsed.rows.map(r=>r.bruto),[400000,200000,400000]);
assert.deepEqual(parsed.rows.map(r=>r.pphNominal),[20000,10000,20000]);
assert.deepEqual(parsed.rows.map(r=>r.netto),[380000,190000,380000]);
assert.ok(parsed.rows.every(r=>r.nama==='Ryan Novryanto, S.Tr.IP'));
assert.ok(parsed.rows.every(r=>r.uraianItem.startsWith('Honor Pembinaan Sikap Perilaku')));
assert.ok(parsed.rows.every(r=>!/\b(?:April|Mei)\b/.test(r.nama)));
assert.equal(parsed.tanggalKuitansi,'2026-11-06');
assert.equal(parsed.totalBruto,1000000);
assert.equal(parsed.totalPPh,50000);
assert.equal(parsed.totalNetto,950000);
console.log('PASS collective OCR rows: 3 payment lines, recipient names, descriptions, amounts, totals.');