import type {ParsedReceipt,ImportedRow} from './receiptExtractor';

/**
 * Daftar Penerimaan Perjalanan Dinas Dalam Kota, termasuk tabel OCR/PDF dengan
 * nama gelar dan tanggal yang terbungkus ke beberapa baris.
 * Tidak ada pengiriman berkas atau penyimpanan database di sini.
 */
const dateParts:Record<string,string>={januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',
 juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12'};
const parseDate=(text:string):string=>{
 const m=text.match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(20\d{2})\b/i);
 return m?m[3]+'-'+dateParts[m[2].toLowerCase()]+'-'+m[1].padStart(2,'0'):'';
};
const rupiah=(value:string):number=>Number(value.replace(/[.,]/g,''))||0;
const allMoney=(line:string):number[]=>[...line.matchAll(/\b(\d{1,3}(?:[.,]\d{3})+)\b/g)]
 .map(m=>rupiah(m[1]));
const leftOfColumns=(line:string)=>{
 const firstAmount=line.search(/\b\d{1,3}(?:[.,]\d{3})+\b/);
 return firstAmount>=0?line.slice(0,firstAmount):line;
};
function readRow(block:string[],num:number):ImportedRow|null{
 const joined=block.join(' ');
 const amounts=allMoney(joined);
 // Column sequence: OH (daily rate), Hari (integer), Jumlah (total).
 if(amounts.length<2)return null;
 const tariff=amounts[0],bruto=amounts.at(-1)!;
 if(tariff<=0||bruto<=0)return null;
 const firstMoney=joined.search(/\b\d{1,3}(?:[.,]\d{3})+\b/);
 const afterFirst=firstMoney>=0?joined.slice(firstMoney).replace(/^\d{1,3}(?:[.,]\d{3})+/,''):'';
 const explicitDays=afterFirst.match(/\b(\d{1,2})\s+\d{1,3}(?:[.,]\d{3})+\b/);
 const volume=explicitDays?Number(explicitDays[1]):bruto%tariff===0?bruto/tariff:0;
 const nameBits:string[]=[];
 for(let i=0;i<block.length;i++){
  let part=block[i].replace(i===0?new RegExp('^\\s*'+num+'\\s+'): /^\s*$/,'').trim();
  part=leftOfColumns(part);
  part=part.replace(/\b\d{1,2}\s+(?:Oktober|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|November|Desember)\b.*$/i,'')
   .replace(/\b20\d{2}\b/g,'')
   .replace(/\b(?:OH|Hari|Jumlah|TANDA\s*TANGAN)\b/gi,'')
   .trim();
  // Degrees may be on a separate continuation line, e.g. "M.M.".
  if(/[A-Za-z]/.test(part)&&part.length<=155)nameBits.push(part);
 }
 const nama=nameBits.join(' ').replace(/\s+/g,' ').trim();
 if(!nama||!Number.isInteger(volume)||volume<1||volume>31)return null;
 return {id:'import-local-'+num,nama,uraianItem:'Uang harian perjalanan dinas dalam kota',
  volume,satuan:'Hari',tarifSatuan:tariff,bruto,ppnNominal:0,pphNominal:0,netto:bruto};
}
export function parseWithinCityReceipt(input:string,lines:string[]):ParsedReceipt|null{
 if(!/\bDAFTAR\s+PENERIMAAN\b/i.test(input)
  || !/\bperjalanan\s+dinas\s+dalam\s+kota\b/i.test(input))return null;
 const warnings:string[]=[];
 const titleIdx=lines.findIndex(line=>/\bPerjalanan\s+dinas\s+dalam\s+kota\b/i.test(line));
 const tableIdx=lines.findIndex(line=>/\bTANGGAL\b/i.test(line)&&/\bPELAKSANAAN\b/i.test(input));
 const totalIdx=lines.findIndex((line,i)=>i>tableIdx&&/^\s*JUMLAH\b/i.test(line));
 const headerLines=lines.slice(titleIdx,tableIdx>titleIdx?tableIdx:undefined).join(' ');
 const activity=headerLines.trim()||'Perjalanan dinas dalam kota';
 const eventDate=parseDate(headerLines);
 const signatureLine=lines.find(line=>/\bMakassar\s*,\s*\d{1,2}\s+\w+\s+20\d{2}\b/i.test(line))||'';
 const signatureDate=parseDate(signatureLine);
 let date=signatureDate||'';
 if(eventDate&&signatureDate&&eventDate.slice(0,4)!==signatureDate.slice(0,4)){
  date='';
  warnings.push('PERBEDAAN TAHUN antara pelaksanaan '+eventDate+' dan tanda tangan '+signatureDate+
   '; tanggal kuitansi dikosongkan untuk verifikasi manual.');
 }
 if(!eventDate)warnings.push('Tanggal pelaksanaan dalam kota belum terbaca; pastikan sesuai dokumen.');
 if(!signatureDate)warnings.push('Tanggal tanda tangan belum terbaca; lengkapi tanggal kuitansi.');
 const rowStart=lines.findIndex((line,i)=>i>tableIdx&&/^\s*1\s+/.test(line));
 const ending=totalIdx>rowStart?totalIdx:lines.length;
 const blocks:{num:number;parts:string[]}[]=[];
 if(rowStart>=0){
  for(const line of lines.slice(rowStart,ending)){
   const m=line.match(/^\s*(\d{1,2})\s+(?!20\d{2}\b)/);
   if(m&&Number(m[1])===blocks.length+1)blocks.push({num:Number(m[1]),parts:[line]});
   else if(blocks.length)blocks[blocks.length-1].parts.push(line);
  }
 }
 const rows=blocks.map(b=>readRow(b.parts,b.num)).filter((row):row is ImportedRow=>row!==null);
 const amountLine=totalIdx>=0?lines[totalIdx]:'';
 const declaredTotal=allMoney(amountLine).at(-1)??null;
 const rowTotal=rows.reduce((sum,row)=>sum+row.bruto,0);
 if(!rows.length)warnings.push('Tidak ada rincian penerima dalam kota yang dapat dibaca; perbaiki OCR atau isi manual.');
 if(rows.length!==blocks.length)warnings.push('Sebagian baris penerima tidak berhasil dibaca dan harus diperiksa.');
 if(declaredTotal===null)warnings.push('Jumlah akhir daftar penerimaan tidak terbaca.');
 if(declaredTotal!==null&&Math.abs(declaredTotal-rowTotal)>1)
  warnings.push('Total daftar penerimaan '+declaredTotal+' berbeda dari jumlah rincian '+rowTotal+'.');
 if(rows.some(row=>Math.abs(row.tarifSatuan*row.volume-row.bruto)>1))
  warnings.push('Ada rincian dengan tarif OH × hari yang berbeda dari jumlah; koreksi sebelum simpan.');
 const source=/\bBendahara\s+Pengeluaran\s+Pembantu[\s\S]{0,140}\bPNBP\b/i.test(input)?'PNBP':null;
 if(source)warnings.push('PNBP terindikasi dari tanda tangan Bendahara Pembantu; sumber dana harus dikonfirmasi.');
 warnings.push('Kode akun tidak tertera pada dokumen; isi sesuai DIPA/POK sebelum disimpan.');
 warnings.push('Pajak tidak dirinci pada daftar penerimaan; nominal 0 bukan konfirmasi bebas pajak.');
 warnings.push('Tanggal pelaksanaan dan tanggal tanda tangan berbeda fungsi. Periksa tanggal kuitansi sebelum simpan.');
 return {rows,tanggalKuitansi:date,kodeAkun:'',kegiatan:activity,nomorAsal:'',
  documentKind:'travel',suggestedSource:source||null,suggestedType:'perjadin_dalam_kota',
  documentDate:eventDate,signatureDate,totalBruto:declaredTotal,totalPPN:0,totalPPh:0,
  totalNetto:declaredTotal,warnings};
}
