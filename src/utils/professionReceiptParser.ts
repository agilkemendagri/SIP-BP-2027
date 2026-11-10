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

/**
 * Parse scanned collective receipts in reading order. Fixed-column slicing alone
 * is unsafe: OCR joins neighboring table cells and can place dates in Nama.
 */
function collectiveReadingOrder(text:string):ImportedRow[]{
 const lines=text.split(/\r?\n/);
 const tableStart=lines.findIndex(x=>/\bNo\b.*\bNama\b.*\bUntuk Pembayaran\b.*\bJP\b/i.test(x.replace(/\s+/g,' ')));
 const tableEnd=lines.findIndex((x,i)=>i>tableStart&&/^\s*JUMLAH\b/i.test(x));
 if(tableStart<0||tableEnd<0)return [];
 const body=lines.slice(tableStart+1,tableEnd).map(compact).filter(Boolean);
 const starts:number[]=[];
 let expected=1;
 for(let i=0;i<body.length;i++){
  // Number must be at the start of a row, not a date/quantity within a cell.
  const match=/^(\d{1,2})(?:[.)]?\s+|[.)]$)/.exec(body[i]);
  if(match&&Number(match[1])===expected&&!/^\d+\.\s*\.{2,}/.test(body[i])){
   starts.push(i);expected++;
  }
 }
 if(!starts.length)return [];
 const results:ImportedRow[]=[];
 for(let k=0;k<starts.length;k++){
  const group=body.slice(starts[k],starts[k+1]??body.length);
  const segment=group.join(' ');
  const matched=moneyLine.exec(segment);
  if(!matched)continue;
  const quantity=Number(matched[1]),tariff=money(matched[2]),gross=money(matched[3]),tax=money(matched[4]),net=money(matched[5]);
  if(quantity<1||tariff*quantity!==gross||gross-tax!==net)continue;
  const prefix=compact(segment.slice(0,matched.index).replace(/^\d{1,2}[.)]?\s*/, ''));
  const separator=/\bHonor(?:arium)?\b/i.exec(prefix);
  if(!separator)continue;
  const name=compact(prefix.slice(0,separator.index).replace(/[,;|\s]+$/,''));
  const description=compact(prefix.slice(separator.index));
  // Do not guess a name if dates or a payment phrase leaked into it.
  if(!name||/\b(?:Honor|tanggal|Latsar|CPNS|April|Mei|Juni|November|20\d{2})\b/i.test(name)||!description)continue;
  results.push(makeRow(k+1,name,description,quantity,tariff,gross,tax,net));
 }
 return results;
}
const reliableLayout=(rows:ImportedRow[])=>rows.length>0&&rows.every(r=>
 r.nama.length>=3&&!/\b(?:Honor|Pembinaan|tanggal|Latsar|CPNS|April|Mei|Juni|November|20\d{2})\b/i.test(r.nama)
 &&/^(?:Honor|Honorarium)\b/i.test(r.uraianItem)
 &&r.volume*r.tarifSatuan===r.bruto&&r.bruto-r.pphNominal===r.netto
);

/** Parse OCR where table cells have | separators and row headings wrap across lines.
 * Never mix date/activity fragments into the recipient name.  Amount correction
 * based on net+tax is explicitly reported as a warning for human review.
 */
function collectivePipeOcr(text:string):{rows:ImportedRow[];warnings:string[]}|null{
 const lines=text.replace(/\r/g,'').split('\n').map(compact).filter(Boolean);
 const indices=lines.flatMap((line,i)=>/^\d{1,2}\s*\|/.test(line)?[i]:[]);
 if(!indices.length)return null;
 const warnings:string[]=[];
 const rows:ImportedRow[]=[];
 const amounts=(s:string)=>Number(s.replace(/[^\d]/g,''));
 const recognizedAmount=(s:string)=>/^\s*(?:Rp\.?\s*)?\d{1,3}(?:[., ]\d{3})*\s*$/.test(s);
 for(let i=0;i<indices.length;i++){
  const pos=indices[i],end=indices[i+1]??lines.length;
  const raw=lines[pos];
  const fields=raw.split('|').map(compact);
  const no=Number(fields[0]),recipientFragment=fields[1]||'';
  if(no!==i+1){warnings.push('Nomor urut OCR tidak berurutan pada baris '+(i+1)+'.');continue;}
  // Lines immediately before numbered row often contain name + description.
  const prev=i===0?0:indices[i-1]+1;
  const prelude=lines.slice(prev,pos).filter(x=>!/^(?:JUMLAH|TOTAL|Makassar|Bendahara|Pejabat|No\s+Nama)/i.test(x));
  const prefixedName=prelude.filter(x=>/^Ryan\b/i.test(x)).at(-1)||'';
  const matchHonor=/\bHonor(?:arium)?\b/i.exec(prefixedName);
  const nameHead=matchHonor?prefixedName.slice(0,matchHonor.index).trim():prefixedName.replace(/\bHonor.*$/i,'').trim();
  const descHead=matchHonor?prefixedName.slice(matchHonor.index).trim():'';
  const nameTail=recipientFragment.replace(/\b(?:Honor|Pembinaan|tanggal|April|Mei|Juni|20\d{2})\b.*$/i,'').trim();
  const name=compact((nameHead+' '+nameTail).replace(/[|]/g,'').replace(/\s+\d\.\s*$/,' S.')).replace(/[, ]+$/,'');
  const usableName=!/\b(?:April|Mei|tanggal|Honor|Latsar)\b/i.test(name)&&name.length>4;
  // Extract the money fields from right to left, since OCR can merge JP and tariff.
  const right=fields.slice(3);
  const numeric=right.map(x=>({raw:x,val:amounts(x)})).filter(x=>x.val>0);
  let qty=0,tariff=0,bruto=0,tax=0,net=0,reportedGross=0;
  if(numeric.length>=5){
   const tail=numeric.slice(0,5);
   qty=tail[0].val;tariff=tail[1].val;bruto=tail[2].val;tax=tail[3].val;net=tail[4].val;
   reportedGross=bruto;
  }else if(numeric.length===4){
   // e.g. OCR "1200 000" instead of "1 | 200.000".
   const first=numeric[0].raw.replace(/[^\d]/g,'');
   if(/^[1-9]\d{6}$/.test(first)){
    qty=Number(first.slice(0,1));tariff=Number(first.slice(1));
    reportedGross=numeric[1].val;tax=numeric[2].val;net=numeric[3].val;
    bruto=reportedGross;
    warnings.push('Baris '+no+': OCR menggabungkan JP dan tarif; pecahan '+qty+' JP × Rp'+tariff.toLocaleString('id-ID')+' perlu diperiksa.');
   }
  }
  if(!usableName||!qty||!tariff||!tax||!net){
   warnings.push('Baris '+no+': kolom nama/nominal tidak cukup jelas; periksa teks OCR asli.');
   continue;
  }
  const calculated=qty*tariff;
  if(bruto!==calculated || bruto-tax!==net){
   if(calculated===net+tax){
    warnings.push('Baris '+no+': bruto terbaca Rp'+reportedGross.toLocaleString('id-ID')+' tetapi JP × tarif dan netto + pajak = Rp'+calculated.toLocaleString('id-ID')+'. Nilai hitung dipakai sementara; WAJIB dicocokkan dengan dokumen.');
    bruto=calculated;
   }else{
    warnings.push('Baris '+no+': nilai bruto, JP × tarif, pajak, atau netto tidak konsisten. Koreksi sebelum simpan.');
   }
  }
  let description=compact(descHead+' '+(fields[2]||''));
  const after=lines.slice(pos+1,end).filter(x=>!/^Ryan\b/i.test(x)&&!/^(?:JUMLAH|TOTAL|Makassar|Bendahara|Pejabat)/i.test(x));
  if(after.length)description=compact(description+' '+after.join(' '));
  if(!/^Honor\b/i.test(description))warnings.push('Baris '+no+': awal uraian Honor tidak terdeteksi sempurna.');
  rows.push(makeRow(no,name,description,qty,tariff,bruto,tax,net));
 }
 if(rows.length!==indices.length)warnings.push('Hanya '+rows.length+' dari '+indices.length+' baris dokumen yang dikenali; lengkapi sebelum menerapkan.');
 if(rows.some(r=>/\b(?:April|Mei|tanggal)\b/i.test(r.nama)))warnings.push('Nama penerima berisi tanggal; koreksi hasil OCR.');
 return {rows,warnings};
}
export function parseProfessionReceipt(text:string):ParsedReceipt|null{
 const input=text.replace(/[\u00a0\u2007]/g,' ');
 const pipeOcr=/\bTANDA\s+TERIMA\b/i.test(input)&&/^\s*\d{1,2}\s*\|/m.test(input)?collectivePipeOcr(input):null;
 const isCollective=Boolean(pipeOcr)||/\bNo\s+Nama\s+Untuk Pembayaran\s+JP\b/i.test(compact(input));
 const isIndividual=/Jumlah\s+honor\s*:/i.test(input);
 if(!isCollective&&!isIndividual)return null;
 const layout=isCollective?collectiveLayout(input):[];
 const reading=isCollective?collectiveReadingOrder(input):[];
 const layoutOk=reliableLayout(layout);
 const readingOk=reliableLayout(reading);
 // Prefer reading order when it contains at least as many complete rows.
 const candidate=isIndividual?individual(input):pipeOcr?pipeOcr.rows:readingOk&&(!layoutOk||reading.length>=layout.length)?reading:layoutOk?layout:[];
 const rows=candidate;
 const totals=new RegExp('JUMLAH\\s+'+nominal+'\\s+'+nominal+'\\s+'+nominal,'i').exec(input);
 const totalBruto=isIndividual?rows[0]?.bruto??null:totals?money(totals[1]):null;
 const totalPPh=isIndividual?rows[0]?.pphNominal??null:totals?money(totals[2]):null;
 const totalNetto=isIndividual?rows[0]?.netto??null:totals?money(totals[3]):null;
 const warnings:string[]=[...(pipeOcr?.warnings||[])];
 if(!rows.length)warnings.push('Rincian jasa profesi tidak dapat dipastikan; perbaiki hasil OCR sebelum menyimpan.');
 if(isCollective&&!pipeOcr&&layout.length!==reading.length)
   warnings.push('Hasil pembacaan tabel berbeda antarmetode. Pastikan seluruh baris tanda terima terdeteksi.');
 if(isCollective && rows.length && rows.some(r=>r.nama.includes('|')||/\d{1,2}\s+(?:April|Mei|Juni)\b/i.test(r.nama)))
   warnings.push('Sebagian uraian/tanggal terbaca sebagai nama. Periksa ulang baris terkait.');
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