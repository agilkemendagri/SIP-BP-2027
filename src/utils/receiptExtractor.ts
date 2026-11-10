/** Rule-based preliminary extraction. Every financial field must be confirmed by an operator. */
export type ImportedRow={
 id:string;
 nama:string;nip?:string;uraianItem:string;volume:number;satuan:string;tarifSatuan:number;
 bruto:number;ppnNominal:number;pphNominal:number;netto:number;
};
export type ParsedReceipt={
 rows:ImportedRow[];tanggalKuitansi:string;kodeAkun:string;kegiatan:string;
 nomorAsal:string;documentKind:'individual'|'collective'|'travel'|'unknown';suggestedSource:'RM'|'PNBP'|null;
 suggestedType?:'jasa_profesi'|'perjadin_luar_kota'|'perjadin_dalam_kota';
 recipientNip?:string;documentDate?:string;signatureDate?:string;
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
 // Both a payment breakdown and a net-received line are required.
 // Avoid classifying a collective table as individual merely because a signer says 'Yang menerima'.
 if(!/\b(?:Jumlah\s+honor|Banyaknya\s+Uang)\b/i.test(input) || !/\b(?:Bersih\s+diterima|Jumlah\s+diterima)\b/i.test(input))return null;
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

/** Parses perincian biaya SPPD. Never interpret 30% accommodation as a tax.
 * The actual reimbursable amount is the line total; we preserve the 30% rate
 * and underlying ceiling in uraianItem, with effective tariff=bruto/volume.
 */
function parseTravelReceipt(input:string,lines:string[]):ParsedReceipt|null {
 if(!/\b(?:PERINCIAN\s+BIAYA|PERHITUNGAN\s+SPPD\s+RAMPUNG)\b/i.test(input)
  || !/\b(?:SPPD|SPD)\b/i.test(input))return null;
 const warnings:string[]=[];
 const documentNumber=input.match(/(?:Lampiran\s+SPPD\s+Nomor|SPPD\s+Nomor)\s*:\s*([^\s\n]+)/i)?.[1]||'';
 const docDateLine=lines.find(s=>/^Tanggal\s*:/i.test(s))||'';
 const documentDate=findDate(docDateLine);
 const signatureLine=lines.find(s=>/\b(?:Makassar|Jakarta|Surabaya|Bandung)\s*,\s*\d{1,2}\s+\w+\s+20\d\d/i.test(s))||'';
 const signatureDate=findDate(signatureLine);
 // The two dates are different meanings, yet a year mismatch requires manual review.
 const receiptDate=signatureDate && documentDate && signatureDate.slice(0,4)!==documentDate.slice(0,4)
   ? '' : (signatureDate||'');
 if(signatureDate && documentDate && signatureDate.slice(0,4)!==documentDate.slice(0,4)){
  warnings.push('PERBEDAAN TAHUN: tanggal SPPD '+documentDate+' tetapi tanda tangan '+signatureDate+
   '. Tanggal kuitansi sengaja dikosongkan; verifikasi dokumen sumber sebelum simpan.');
 }
 if(!signatureDate)warnings.push('Tanggal tanda tangan perjalanan dinas tidak ditemukan; isi tanggal kuitansi secara manual.');
 if(!documentDate)warnings.push('Tanggal pada lampiran SPPD tidak ditemukan.');
 const start=lines.findIndex(s=>/\bPERINCIAN\s+BIAYA\b/i.test(s));
 const end=lines.findIndex((s,i)=>i>start && /^\s*JUMLAH\b/i.test(s));
 const detailLines=lines.slice(start+1,end>start?end:undefined);
 const rows:ImportedRow[]=[];
 // PDF text and OCR may split a row: concatenate fragments until the next numbered item.
 const combined:string[]=[];
 for(const line of detailLines){
  if(/^\s*\d{1,2}\s+(?:Uang|Biaya|Transport|Tiket|Penginapan|Representatif)/i.test(line)){
   combined.push(line);
  }else if(combined.length && !/^(?:NO\s|KETERANGAN|JUMLAH\b)/i.test(line)){
   combined[combined.length-1]+=' '+line;
  }
 }
 for(const line of combined){
  const m=line.match(/^\s*(\d{1,2})\s+(.+)$/);
  if(!m)continue;
  const amounts=moneyMatches(m[2]);
  const last=amounts.at(-1);
  if(!last)continue;
  const bruto=last.value;
  const prefix=m[2].slice(0,last.index).replace(/\s*Rp\.?\s*$/i,'').trim();
  const volumeInfo=prefix.match(/\b(\d{1,3})\s*(Hari|Malam|Kali|OK|OH|JP|Orang|Paket)\s*[x×]\s*@\s*\.?\s*Rp\.?\s*([\d.,]+)/i);
  const percent=prefix.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
  const volume=volumeInfo?Number(volumeInfo[1]):1;
  const satuan=volumeInfo?volumeInfo[2]:'Kali';
  const nominalTarif=volumeInfo?parseIdr(volumeInfo[3]):bruto;
  const rawName=prefix.replace(/\s+\d{1,3}\s*(?:Hari|Malam|Kali|OK|OH|JP|Orang|Paket)\s*[x×]\s*@\s*\.?\s*Rp\.?\s*[\d.,]+/i,'').replace(/\s+\d{1,3}(?:[.,]\d+)?\s*%/,'').trim();
  if(!rawName)continue;
  const percentage=percent?Number(percent[1].replace(',','.')):null;
  const effectiveTariff=bruto/volume;
  let uraianItem=rawName;
  if(percentage!==null){
   uraianItem+=' ('+percentage+'% dari tarif '+new Intl.NumberFormat('id-ID').format(nominalTarif)+')';
   if(Math.abs(nominalTarif*volume*percentage/100-bruto)>1)
    warnings.push('Rincian '+m[1]+': tarif × persentase tidak cocok dengan jumlah baris; periksa nilai.');
  }else if(volumeInfo && Math.abs(nominalTarif*volume-bruto)>1){
   warnings.push('Rincian '+m[1]+': volume × tarif tidak cocok dengan nilai baris.');
  }
  rows.push({id:'import-travel-'+m[1],nama:'',uraianItem,volume,satuan,
   tarifSatuan:effectiveTariff,bruto,ppnNominal:0,pphNominal:0,netto:bruto});
 }
 // In a two-column signatory table, the recipient is in the right column,
 // not the left-column Bendahara Pengeluaran.
 const receivedIndex=lines.findIndex(s=>/\bYang\s+Menerima\b/i.test(s));
 const signArea=receivedIndex>=0?lines.slice(receivedIndex+1,receivedIndex+9):[];
 const nameLine=signArea.find(s=>/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(s)
   && !/\b(?:NIP|PERHITUNGAN|SPPD|Bendahara|Pejabat)\b/i.test(s));
 let recipient='';
 if(nameLine){
  const splits=nameLine.split(/\s{3,}/).map(v=>v.trim()).filter(Boolean);
  recipient=(splits.length>1?(splits.at(-1)||nameLine):nameLine).trim();
 }
 const recipientNipLine=signArea.find(s=>/\bNIP\.?\s*[\d\s]{18,}/i.test(s))||'';
 const nipMatches=[...recipientNipLine.matchAll(/NIP\.?\s*(\d{18})/gi)];
 const recipientNip=nipMatches.at(-1)?.[1]||'';
 if(!recipient)warnings.push('Nama penerima perjalanan dinas belum terbaca dengan pasti; wajib dilengkapi.');
 if(!recipientNip)warnings.push('NIP penerima belum terbaca; periksa dan lengkapi bila tersedia.');
 for(const row of rows){row.nama=recipient;row.nip=recipientNip;}
 const totalLine=end>start?lines[end]:'';
 const total=moneyMatches(totalLine).at(-1)?.value??null;
 const rowTotal=rows.reduce((acc,row)=>acc+row.bruto,0);
 if(!rows.length)warnings.push('Rincian biaya SPPD belum terbaca otomatis; periksa tabel sumber.');
 if(total!==null && Math.abs(total-rowTotal)>1)
  warnings.push('Total SPPD '+total+' berbeda dengan penjumlahan baris '+rowTotal+'. Jangan simpan sebelum diperiksa.');
 // SPPD number is source provenance, never reused as a new SIP-BP SPTB number.
 if(!documentNumber)warnings.push('Nomor SPPD sumber tidak terbaca; isi referensi dokumen sumber secara manual.');
 warnings.push('Sumber dana dan kode akun tidak dapat dipastikan dari SPPD ini; isi sesuai DIPA/POK.');
 warnings.push('PPN dan PPh tidak ditampilkan pada tabel SPPD; nilai 0 masih harus diverifikasi, bukan dianggap bebas pajak.');
 warnings.push('Jenis perjalanan luar kota hanya saran dari rute perjalanan; verifikasi jenis pembayaran.');
 const isOutOfTown=/\b[A-Z]{3}\s*[-–]\s*[A-Z]{3}\b/i.test(input)||/\b(?:Tiket\s+Pesawat|Luar\s+Kota)\b/i.test(input);
 return {rows,tanggalKuitansi:receiptDate,kodeAkun:'',kegiatan:'Perjalanan dinas',
  nomorAsal:documentNumber,documentKind:'travel',suggestedSource:sourceHint(input),
  suggestedType:isOutOfTown?'perjadin_luar_kota':undefined,recipientNip,
  documentDate,signatureDate,
  totalBruto:total,totalPPN:0,totalPPh:0,totalNetto:total,warnings};
}

export function parseReceiptText(text:string):ParsedReceipt{
 const input=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ').trim();
 const lines=input.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 const warnings:string[]=[];
 const travel=parseTravelReceipt(input,lines);
 if(travel)return travel;
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
