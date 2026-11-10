import type {ImportedRow,ParsedReceipt} from './receiptExtractor';
const months:Record<string,string>={januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12'};
const compact=(v:string)=>v.replace(/\s+/g,' ').trim();
const money=(v:string)=>Number(v.replace(/[.,\s]/g,''));
const nominal='(\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})';
const moneyLine=new RegExp('(?:^|\\s)(\\d{1,2})\\s+'+nominal+'\\s+'+nominal+'\\s+'+nominal+'\\s+'+nominal+'(?=\\s|$)','i');
const makeRow=(idx:number,name:string,description:string,quantity:number,tariff:number,gross:number,tax:number,net:number):ImportedRow=>({id:'prof-'+idx,nama:compact(name),uraianItem:compact(description),volume:quantity,satuan:'JP',tarifSatuan:tariff,bruto:gross,ppnNominal:0,pphNominal:tax,netto:net});
const dateOf=(text:string)=>{const m=[...text.matchAll(/\b(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})\b/gi)].at(-1);return m?m[3]+'-'+months[m[2].toLowerCase()]+'-'+m[1].padStart(2,'0'):'';};
function individual(text:string):ImportedRow[]{
 text=text.replace(/[ \t]+/g,' ');
 const h=new RegExp('Jumlah\\s+honor\\s*:\\s*(\\d{1,2})\\s*JP\\s*x\\s*@?Rp\\.?\\s*'+nominal+'\\s+Rp\\.?\\s*'+nominal,'i').exec(text);
 const tax=new RegExp('Potong\\s+PPH\\.?\\s*(?:\\d+(?:[.,]\\d+)?%\\s*)?Rp\\.?\\s*'+nominal,'i').exec(text);
 const net=new RegExp('Bersih\\s+diterima\\s+Rp\\.?\\s*'+nominal,'i').exec(text);
 const detail=/Untuk Pembayaran\s*:\s*([\s\S]*?)(?=Jumlah honor\s*:)/i.exec(text)?.[1]||'';
 const receiver=/Yang menerima,\s*([\s\S]*?)(?:Setuju Dibayar|Pejabat Pembuat)/i.exec(text)?.[1]||'';
 const name=receiver.split('\n').map(compact).filter(s=>/[a-z]{3}/i.test(s)&&!/(?:Jumlah|Rp\.|Honor|Potong)/i.test(s)).at(-1)||'';
 if(!h||!net||!name)return [];
 return [makeRow(1,name,detail,Number(h[1]),money(h[2]),money(h[3]),tax?money(tax[1]):0,money(net[1]))];
}
function collectiveLayout(text:string):ImportedRow[]{
 const lines=text.split(/\r?\n/);
 const anchors=lines.flatMap((line,i)=>{
  const amounts=moneyLine.exec(line);
  if(!amounts||!/\b[1-9]\d?\s+/.test(line.slice(0,amounts.index+amounts[0].length)))return [];
  const rowNo=/^\s*(\d{1,2})\s{2,}/.exec(line);
  return rowNo?[{i,no:Number(rowNo[1]),values:amounts}]:[];
 });
 if(!anchors.length)return [];
 const records:ImportedRow[]=[];
 const header=lines.find(l=>/\bNo\b.*\bNama\b.*\bUntuk Pembayaran\b.*\bJP\b/i.test(l))||'';
 const nameStart=header?header.indexOf('No')+5:7;
 const descriptionStart=header?header.indexOf('Untuk Pembayaran')-5:29;
 const descriptionEnd=header?header.indexOf('JP',descriptionStart+1)-1:61;
 for(let a=0;a<anchors.length;a++){
  const hit=anchors[a],prev=anchors[a-1]?.i??-1,next=anchors[a+1]?.i??lines.length;
  let start=hit.i,end=hit.i;
  while(start>prev+1 && lines[start-1].trim() && !/^\s*JUMLAH\b/i.test(lines[start-1]))start--;
  while(end+1<next && lines[end+1].trim() && !/^\s*JUMLAH\b/i.test(lines[end+1]))end++;
  const names:string[]=[],descriptions:string[]=[];
  for(let i=start;i<=end;i++){
   const l=lines[i];
   const name=compact(l.slice(nameStart,descriptionStart));
   const desc=compact(l.slice(descriptionStart,moneyLine.test(l)?descriptionEnd:undefined).replace(/\b\d{1,2}\.\s*\.{2,}/g,''));
   if(name&&!/^(?:Nama|No)$/i.test(name))names.push(name);
   if(desc&&!/^(?:Untuk Pembayaran|JP)$/i.test(desc))descriptions.push(desc);
  }
  const m=hit.values;
  records.push(makeRow(hit.no,names.join(' '),descriptions.join(' '),Number(m[1]),money(m[2]),money(m[3]),money(m[4]),money(m[5])));
 }
 return records;
}
function collectiveReadingOrder(text:string):ImportedRow[]{
 const between=text.split(/\r?\n/);
 const tableStart=between.findIndex(x=>/\bNo\b.*\bNama\b.*\bUntuk Pembayaran\b.*\bJP\b/i.test(x));
 const tableEnd=between.findIndex((x,i)=>i>tableStart&&/^\s*JUMLAH\b/i.test(x));
 if(tableStart<0||tableEnd<0)return [];
 const body=between.slice(tableStart+1,tableEnd).map(compact).filter(Boolean);
 const markers:number[]=[];
 for(let i=0,expected=1;i<body.length;i++){
  const m=/^(\d{1,2})(?:\s+|$)/.exec(body[i]);
  if(m&&Number(m[1])===expected && !moneyLine.test(body[i]) && !/^\d+\.\s*\.{2}/.test(body[i])){markers.push(i);expected++;}
 }
 if(markers.length===0)return [];
 const results:ImportedRow[]=[];
 for(let k=0;k<markers.length;k++){
  const segment=body.slice(markers[k],markers[k+1]??body.length).join(' ');
  const extracted=moneyLine.exec(segment);
  if(!extracted)continue;
  const before=segment.slice(0,extracted.index).replace(/^\d{1,2}\s*/, '');
  const separator=/\bHonor(?:arium)?\b/i.exec(before);
  if(!separator)continue;
  const nama=before.slice(0,separator.index).trim(),uraian=before.slice(separator.index).trim();
  if(!nama||!uraian)continue;
  const m=extracted;
  results.push(makeRow(k+1,nama,uraian,Number(m[1]),money(m[2]),money(m[3]),money(m[4]),money(m[5])));
 }
 return results;
}
export function parseProfessionReceipt(text:string):ParsedReceipt|null{
 const input=text.replace(/[\u00a0\u2007]/g,' ');
 const isCollective=/\bNo\s+Nama\s+Untuk Pembayaran\s+JP\b/i.test(compact(input));
 const isIndividual=/Jumlah\s+honor\s*:/i.test(input);
 if(!isCollective&&!isIndividual)return null;
 const layout=isCollective?collectiveLayout(input):[];
 const rows=isIndividual?individual(input):layout.length&&layout.every(r=>r.nama&&r.uraianItem&&r.volume*r.tarifSatuan===r.bruto&&r.bruto-r.pphNominal===r.netto)?layout:collectiveReadingOrder(input);
 const totals=new RegExp('JUMLAH\\s+'+nominal+'\\s+'+nominal+'\\s+'+nominal,'i').exec(input);
 const totalBruto=isIndividual?rows[0]?.bruto??null:totals?money(totals[1]):null;
 const totalPPh=isIndividual?rows[0]?.pphNominal??null:totals?money(totals[2]):null;
 const totalNetto=isIndividual?rows[0]?.netto??null:totals?money(totals[3]):null;
 const warnings:string[]=[];
 if(!rows.length)warnings.push('Rincian jasa profesi tidak dapat dipastikan; perbaiki hasil OCR sebelum menyimpan.');
 if(rows.some(r=>!r.nama||!r.uraianItem))warnings.push('Nama atau uraian rincian tidak lengkap.');
 if(rows.some(r=>r.volume*r.tarifSatuan!==r.bruto||r.bruto-r.pphNominal!==r.netto))warnings.push('Perhitungan nominal baris tidak cocok dengan dokumen.');
 if(totalBruto!==null&&rows.reduce((n,r)=>n+r.bruto,0)!==totalBruto)warnings.push('Total bruto berbeda dari penjumlahan rincian.');
 if(totalPPh!==null&&rows.reduce((n,r)=>n+r.pphNominal,0)!==totalPPh)warnings.push('Total PPh berbeda dari penjumlahan rincian.');
 if(totalNetto!==null&&rows.reduce((n,r)=>n+r.netto,0)!==totalNetto)warnings.push('Total netto berbeda dari penjumlahan rincian.');
 const tanggalKuitansi=dateOf(input);
 if(!tanggalKuitansi)warnings.push('Tanggal kuitansi tidak terdeteksi.');
 warnings.push('Kode akun tidak ditemukan otomatis; pastikan sesuai dokumen anggaran.');
 return {rows,tanggalKuitansi,kodeAkun:'',kegiatan:rows[0]?.uraianItem||'',nomorAsal:'',totalBruto,totalPPN:0,totalPPh,totalNetto,warnings};
}