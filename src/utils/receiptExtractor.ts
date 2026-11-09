/** Rule-based preliminary extraction. Every financial field must be confirmed by an operator. */
export type ImportedRow={
 id:string;
 nama:string;uraianItem:string;volume:number;satuan:string;tarifSatuan:number;
 bruto:number;ppnNominal:number;pphNominal:number;netto:number;
};
export type ParsedReceipt={
 rows:ImportedRow[];tanggalKuitansi:string;kodeAkun:string;kegiatan:string;
 nomorAsal:string;documentKind:'individual'|'collective'|'unknown';suggestedSource:'RM'|'PNBP'|null;
 totalBruto:number|null;totalPPN:number|null;totalPPh:number|null;totalNetto:number|null;
 warnings:string[];
};
const months:Record<string,string>={
 januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',juli:'07',agustus:'08',
 september:'09',oktober:'10',november:'11',desember:'12'
};
export const parseIdr=(s:string):number=>{
 const text=s.replace(/Rp\.?\s*/gi,'').replace(/\s/g,'').replace(/[^\d.,]/g,'');
 if(!text)return 0;
 const lastComma=text.lastIndexOf(','),lastDot=text.lastIndexOf('.');
 let normalized=text;
 if(lastComma>=0 && lastDot>=0){
  const decimalMark=lastComma>lastDot?',':'.';
  normalized=decimalMark===','?text.replace(/\./g,'').replace(',','.') :text.replace(/,/g,'');
 }else if(lastComma>=0){
  const parts=text.split(',');
  normalized=parts.length>1 && parts.at(-1)?.length===3?parts.join(''):parts.length>1?parts.slice(0,-1).join('')+'.'+parts.at(-1):text;
 }else if(lastDot>=0){
  const parts=text.split('.');
  normalized=parts.length>1 && parts.at(-1)?.length===3?parts.join(''):parts.length>1?parts.slice(0,-1).join('')+'.'+parts.at(-1):text;
 }
 const n=Number(normalized);
 return Number.isFinite(n)?n:0;
};
// Supports accounting PDFs with 200,000 (comma thousands) and 200.000
// (dot thousands), while retaining optional fractional currency amounts.
const amountRe=/\b(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d{4,}(?:[.,]\d{1,2})?)\b/gi;
const moneyMatches=(line:string)=>[...line.matchAll(amountRe)]
 .map(m=>({value:parseIdr(m[1]),index:m.index??0,raw:m[0]}))
 .filter(x=>x.value>=1000);

const findDate=(s:string):string=>{
 const match=[...s.matchAll(/\b(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d\d)\b/gi)].at(-1);
 if(match){return match[3]+'-'+months[match[2].toLowerCase()]+'-'+match[1].padStart(2,'0');}
 const iso=s.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
 return iso ? iso[1]+'-'+iso[2].padStart(2,'0')+'-'+iso[3].padStart(2,'0') : '';
};
const titleOrActivity=(text:string)=>{
 const match=text.match(/(?:pada|untuk|kegiatan)\s+((?:Latsar|Pelatihan|Diklat|Bimtek|Rapat|Workshop)[^\n,;]{4,90})/i);
 return match?match[1].trim():'';
};
const guessNameDescription=(prefix:string,lastName:string)=>{
 const str=prefix.replace(/^\s*\d{1,3}[.)]?\s+/,'').trim();
 const honor=str.search(/\b(?:Honor(?:arium)?|Pembayaran|Transport|Uang Harian|Biaya Perjalanan|Penggantian)\b/i);
 if(honor>0)return {nama:str.slice(0,honor).replace(/[,.\s]+$/,'').trim()||lastName,uraianItem:str.slice(honor).trim()};
 if(lastName && (/^(?:Honor|Pembayaran|Pembinaan|Transport)/i.test(str)))return {nama:lastName,uraianItem:str};
 return {nama:str.slice(0,75),uraianItem:''};
};
function parseLine(line:string,lastName:string,index:number):ImportedRow|null{
 const nums=moneyMatches(line);
 if(nums.length<3)return null;
 // Last amounts in table are gross, tax, and net; 4th-from-end is unit tariff.
 const tail=nums.slice(-4);
 const bruto=tail.length===4?tail[1].value:tail[0].value;
 const pph=tail.length===4?tail[2].value:tail[1].value;
 const netto=tail.length===4?tail[3].value:tail[2].value;
 const tariff=tail.length===4?tail[0].value:bruto;
 if(bruto<1000||netto>bruto||pph>bruto)return null;
 const prefix=line.slice(0,tail[0].index);
 const {nama,uraianItem}=guessNameDescription(prefix,lastName);
 if(!nama)return null;
 const volumeToken=prefix.match(/(?:^|\s)(\d{1,2})\s*$/);
 const volume=volumeToken?Number(volumeToken[1]):tariff>0&&bruto%tariff===0?bruto/tariff:1;
 return {id:'import-'+index,nama,uraianItem,volume:Math.max(1,volume),satuan:'JP',tarifSatuan:tariff,
 bruto,ppnNominal:0,pphNominal:pph,netto};
}

const sourceHint=(input:string):'RM'|'PNBP'|null=>{
 if(/\b(?:BPP\s*PNBP|Bendahara\s+Pengeluaran\s+Pembantu[\s\S]{0,110}\bPNBP\b)/i.test(input))return 'PNBP';
 if(/\b(?:BPP\s*RM|Bendahara\s+Pengeluaran\s+Pembantu[\s\S]{0,110}\bRM\b)/i.test(input))return 'RM';
 return null;
};
const individualName=(lines:string[]):string=>{
 const anchor=lines.findIndex(s=>/\bYang\s+menerima\b/i.test(s));
 if(anchor<0)return '';
 for(const line of lines.slice(anchor+1,anchor+8)){
  if(/^Jumlah\s*:/i.test(line))continue;
  if(/(?:Setuju Dibayar|Kuasa Pengguna Anggaran|Pejabat Pembuat Komitmen|Bendahara Pengeluaran|BBPK|NIP\b)/i.test(line))break;
  const candidate=line.trim().replace(/\s{2,}/g,' ');
  if(candidate.length>=4 && candidate.length<=110 && /[A-Za-z]/.test(candidate) && !/^\d+$/.test(candidate)){
   return candidate.replace(/[.,\s]+$/,'').trim();
  }
 }
 return '';
};
const labeledAmount=(lines:string[],pattern:RegExp):number|null=>{
 const line=lines.find(s=>pattern.test(s));
 if(!line)return null;
 const amounts=moneyMatches(line);
 return amounts.length?amounts.at(-1)!.value:null;
};
function parseIndividualReceipt(input:string,lines:string[]):{
 row:ImportedRow;date:string;description:string;source:'RM'|'PNBP'|null;warnings:string[];
}|null{
 if(!/\b(?:Banyaknya\s+Uang|Bersih\s+diterima|Jumlah\s+honor|Yang\s+menerima)\b/i.test(input))return null;
 const honorLine=lines.find(s=>/\bJumlah\s+honor\b/i.test(s))||'';
 const taxLine=lines.find(s=>/\b(?:Potong\s+PPh|Potongan\s+PPh|PPh\s+15%)\b/i.test(s))||'';
 const netLine=lines.find(s=>/\b(?:Bersih\s+diterima|Jumlah\s+diterima|Netto)\b/i.test(s))||'';
 const bruto=labeledAmount(lines,/\bJumlah\s+honor\b/i)
   ??labeledAmount(lines,/\bJumlah\s*:\s*Rp/i)
   ??labeledAmount(lines,/\bBanyaknya\s+Uang\b/i);
 const pph=labeledAmount(lines,/\b(?:Potong\s+PPh|Potongan\s+PPh)\b/i);
 const netto=labeledAmount(lines,/\b(?:Bersih\s+diterima|Jumlah\s+diterima|Netto)\b/i);
 if(bruto===null || netto===null)return null; // no fictional amounts
 const volumeMatch=honorLine.match(/\b(\d{1,3})\s*(JP|OJ|OK|JPL|Hari|Jam|Paket|Kali)\b/i);
 const unitPriceMatch=honorLine.match(/@\s*Rp\.?\s*([\d.,]+)/i);
 const volume=volumeMatch?Number(volumeMatch[1]):1;
 const satuan=volumeMatch?volumeMatch[2].toUpperCase():'JP';
 const tariff=unitPriceMatch?parseIdr(unitPriceMatch[1]):volume>0?bruto/volume:bruto;
 const name=individualName(lines);
 const paymentIndex=lines.findIndex(s=>/\bUntuk\s+Pembayaran\b/i.test(s));
 const paymentParts:string[]=[];
 if(paymentIndex>=0){
  const first=lines[paymentIndex].replace(/^.*?Untuk\s+Pembayaran\s*:\s*/i,'').trim();
  if(first)paymentParts.push(first);
  for(const line of lines.slice(paymentIndex+1,paymentIndex+5)){
   if(/^(?:Jumlah\s+honor|Potong\s+PPh|Bersih\s+diterima|Makassar|Jumlah\s*:|Yang\s+menerima)\b/i.test(line))break;
   paymentParts.push(line);
  }
 }
 const description=paymentParts.join(' ').replace(/\s+terlampir\s+dengan\s+rincian\s*:\s*$/i,'').trim();
 const warning:string[]=[];
 if(!name)warning.push('Nama penerima individual belum dikenali; isi sesuai dokumen asli.');
 if(!description)warning.push('Uraian pembayaran individual belum terbaca.');
 if(!volumeMatch || !unitPriceMatch)warning.push('Volume atau tarif tidak lengkap; periksa rincian honor.');
 if(pph===null)warning.push('Nominal potongan PPh belum ditemukan; periksa kolom pajak.');
 if(Math.abs(bruto-(pph||0)-netto)>1)warning.push('Bruto, potongan PPh, dan bersih diterima tidak sesuai.');
 if(Math.abs(volume*tariff-bruto)>1)warning.push('Volume × tarif tidak sesuai jumlah honor.');
 const percent=taxLine.match(/\b(\d{1,2}(?:[.,]\d+)?)\s*%/);
 if(percent && pph!==null && Math.abs(bruto*parseIdr(percent[1])/100-pph)>1){
  warning.push('Persentase PPh pada dokumen berbeda dengan nominal pajak.');
 }
 return {row:{id:'import-individual-1',nama:name,uraianItem:description,volume,satuan,
   tarifSatuan:tariff,bruto,ppnNominal:0,pphNominal:pph||0,netto},
  date:findDate(lines.filter(s=>/\b(?:Makassar|Yang\s+menerima|Tanggal)\b/i.test(s)).join('\n'))||findDate(input),
  description,source:sourceHint(input),warnings:warning};
}

export function parseReceiptText(text:string):ParsedReceipt{
 const input=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ').trim();
 const lines=input.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 const warnings:string[]=[];
 const individual=parseIndividualReceipt(input,lines);
 if(individual){
  const warnings=individual.warnings.slice();
  if(!individual.date)warnings.push('Tanggal kuitansi tidak ditemukan; wajib diisi sebelum simpan.');
  warnings.push('Kode akun belum tersedia pada dokumen individual; isi sesuai DIPA/POK, jangan menebak.');
  if(individual.source)warnings.push('Sumber dana '+individual.source+' hanya indikasi dari nama Bendahara Pembantu; pastikan dengan dokumen.');
  warnings.push('Nomor SPTB baru akan diterbitkan oleh SIP-BP setelah simpan Draft.');
  return {rows:[individual.row],tanggalKuitansi:individual.date,kodeAkun:'',kegiatan:individual.description,
   nomorAsal:'',documentKind:'individual',suggestedSource:individual.source,
   totalBruto:individual.row.bruto,totalPPN:0,totalPPh:individual.row.pphNominal,totalNetto:individual.row.netto,warnings};
 }
 const rows:ImportedRow[]=[];
 let lastName='';
 let active='';
 for(const line of lines){
  if(/^\s*(?:JUMLAH|TOTAL|Makassar|Mengetahui|Pejabat Pembuat|Bendahara Pengeluaran)\b/i.test(line))continue;
  const starts=/^(\d{1,2})[.)]?\s+/.test(line) && !/^\d{1,2}\s+(?:Januari|Februari|Maret|April)/i.test(line);
  if(starts){
   if(active){
    const parsed=parseLine(active,lastName,rows.length+1);
    if(parsed){rows.push(parsed);lastName=parsed.nama;}
   }
   active=line;
  }else if(active){
   active+=' '+line;
   // If a receipt line already has full monetary columns, flush before the next line.
   if(moneyMatches(active).length>=4){
    const parsed=parseLine(active,lastName,rows.length+1);
    if(parsed){rows.push(parsed);lastName=parsed.nama;active='';}
   }
  }
 }
 if(active){const parsed=parseLine(active,lastName,rows.length+1);if(parsed)rows.push(parsed);}
 // Fallback: some OCR engines join the whole row and place '1' on a separate line.
 if(!rows.length){
  lines.filter(s=>moneyMatches(s).length>=3 && !/\b(?:JUMLAH|TOTAL)\b/i.test(s))
   .forEach(line=>{const r=parseLine(line,lastName,rows.length+1);if(r){rows.push(r);lastName=r.nama;}});
 }
 const totalLine=lines.find(s=>/^\s*(?:JUMLAH|TOTAL)\b/i.test(s))||'';
 const totals=moneyMatches(totalLine).map(x=>x.value);
 const totalBruto=totals.length>=3?totals[totals.length-3]:null;
 const totalPPh=totals.length>=3?totals[totals.length-2]:null;
 const totalNetto=totals.length>=3?totals[totals.length-1]:null;
 const nomorAsal=input.match(/\b(?:SPTB|KUI)[/-][A-Z0-9/_-]{4,70}/i)?.[0]||'';
 const kodeAkun=input.match(/\b(?:kode\s+akun\s*[:\-]?\s*|akun\s*[:\-]?\s*)(\d{6})\b/i)?.[1]||'';
 if(!rows.length)warnings.push('Rincian kuitansi tidak terbaca otomatis. Tambahkan baris secara manual atau perbaiki hasil OCR.');
 if(!findDate(input))warnings.push('Tanggal kuitansi tidak ditemukan; pilih tanggal dokumen asli sebelum menyimpan.');
 if(!kodeAkun)warnings.push('Kode akun tidak terbaca; isi enam digit sesuai dokumen sumber.');
 if(rows.some(r=>Math.abs(r.bruto-r.pphNominal-r.ppnNominal-r.netto)>1))warnings.push('Ada nominal bruto, pajak dan netto yang tidak seimbang.');
 if(totalBruto!==null && rows.length && Math.abs(rows.reduce((n,r)=>n+r.bruto,0)-totalBruto)>1)
   warnings.push('Jumlah bruto hasil OCR tidak cocok dengan baris rincian. Periksa gambar sumber.');
 if(totalNetto!==null && rows.length && Math.abs(rows.reduce((n,r)=>n+r.netto,0)-totalNetto)>1)
   warnings.push('Jumlah netto hasil OCR tidak cocok dengan baris rincian.');
 warnings.push('Nomor kuitansi/SPTB asli tidak diimpor sebagai nomor resmi: SIP-BP menerbitkan nomor SPTB baru ketika Draft disimpan.');
 return {rows,tanggalKuitansi:findDate(input),kodeAkun,kegiatan:titleOrActivity(input),nomorAsal,
 documentKind:rows.length?'collective':'unknown',suggestedSource:sourceHint(input),
 totalBruto,totalPPN:null,totalPPh,totalNetto,warnings};
}
