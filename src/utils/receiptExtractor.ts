/** Rule-based preliminary extraction. Every financial field must be confirmed by an operator. */
export type ImportedRow={
 id:string;
 nama:string;uraianItem:string;volume:number;satuan:string;tarifSatuan:number;
 bruto:number;ppnNominal:number;pphNominal:number;netto:number;
};
export type ParsedReceipt={
 rows:ImportedRow[];tanggalKuitansi:string;kodeAkun:string;kegiatan:string;
 nomorAsal:string;totalBruto:number|null;totalPPN:number|null;totalPPh:number|null;totalNetto:number|null;
 warnings:string[];
};
const months:Record<string,string>={
 januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',juli:'07',agustus:'08',
 september:'09',oktober:'10',november:'11',desember:'12'
};
export const parseIdr=(s:string):number=>{
 const text=s.replace(/Rp\.?\s*/gi,'').replace(/\s/g,'').trim();
 if(!text)return 0;
 const compact=/^\d{1,3}(?:[.,]\d{3})+$/.test(text)?text.replace(/[.,]/g,''):text.replace(/\./g,'').replace(',','.');
 const n=Number(compact);return Number.isFinite(n)?n:0;
};
const amountRe=/\\b(?:Rp\\.?\\s*)?(\\d{1,3}(?:[.,]\\d{3})+(?:,\\d{1,2})?|\\d{4,}(?:,\\d{1,2})?)\\b/gi;
const moneyMatches=(line:string)=>[...line.matchAll(amountRe)].map(m=>({value:parseIdr(m[1]),index:m.index??0,raw:m[0]})).filter(x=>x.value>=1000);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
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
export function parseReceiptText(text:string):ParsedReceipt{
 const input=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ').trim();
 const lines=input.split(/\n+/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
 const warnings:string[]=[];
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
 totalBruto,totalPPN:null,totalPPh,totalNetto,warnings};
}
