import type {ImportedRow,ParsedReceipt} from './receiptExtractor';

const rupiah=(text:string)=>Number(text.replace(/[.,\s]/g,''))||0;
const amountPattern=/\d{1,3}(?:[.,]\d{3})+|\d{4,}/g;
const monthMap:Record<string,string>={januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12'};
const getDate=(text:string)=>{
 const found=[...text.matchAll(/\b(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})\b/gi)].at(-1);
 return found?found[3]+'-'+monthMap[found[2].toLowerCase()]+'-'+found[1].padStart(2,'0'):'';
};
const makeRow=(i:number,nama:string,uraian:string,volume:number,satuan:string,tarif:number,bruto:number,extra:Partial<ImportedRow>={}):ImportedRow=>({
 id:'perjadin-'+i,nama:nama.trim(),uraianItem:uraian.trim(),volume,satuan,tarifSatuan:tarif,bruto,ppnNominal:0,pphNominal:0,netto:bruto,...extra
});
const finalize=(input:string,rows:ImportedRow[],date:string,expected:number|null,warnings:string[],nomorAsal='',description=''):ParsedReceipt=>{
 if(!rows.length)warnings.push('Tidak ada rincian yang dapat dipastikan otomatis; koreksi OCR sebelum menerapkan.');
 for(const [i,r] of rows.entries()){
  if(!r.uraianItem||!r.nama)warnings.push('Rincian '+(i+1)+' belum memiliki nama atau uraian yang lengkap.');
  if(Math.abs(r.volume*r.tarifSatuan-r.bruto)>1)warnings.push('Volume × tarif tidak sesuai pada rincian '+(i+1)+'.');
 }
 const total=rows.reduce((n,r)=>n+r.bruto,0);
 if(expected!==null&&rows.length&&Math.abs(total-expected)>1)warnings.push('TOTAL BERBEDA: tabel Rp '+expected+' tetapi baris terbaca Rp '+total+'.');
 if(!date)warnings.push('Tanggal dokumen tidak terbaca; periksa dokumen asli.');
 warnings.push('Kode akun tidak tercantum; periksa dan isi sesuai dokumen anggaran.');
 return {rows,tanggalKuitansi:date,kodeAkun:'',kegiatan:description||rows[0]?.uraianItem||'',nomorAsal,totalBruto:expected,totalPPN:0,totalPPh:0,totalNetto:expected,warnings};
};
const tokenMoney=(line:string)=>[...line.matchAll(amountPattern)].map(m=>({text:m[0],value:rupiah(m[0]),index:m.index||0})).filter(x=>x.value>=1000);
export function parseOutsideTravelReceipt(text:string):ParsedReceipt|null{
 const input=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ');
 if(!/PERINCIAN\s+BIAYA/i.test(input)||!/PERHITUNGAN\s+SPPD\s+RAMPUNG/i.test(input))return null;
 const lines=input.split('\n');
 const top=lines.findIndex(x=>/\bPERINCIAN\s+BIAYA\b/i.test(x));
 const bottom=lines.findIndex((x,i)=>i>top&&/^\s*JUMLAH\b/i.test(x));
 const table=bottom>=0?lines.slice(top+1,bottom):lines.slice(top+1);
 const recipientLine=lines.findIndex(x=>/Yang\s+Menerima/i.test(x));
 const firstNip=lines.findIndex((x,i)=>i>recipientLine&&/NIP\.?\s*\d{18}/i.test(x));
 const person=firstNip>=0?(lines[firstNip-1]||'').trim().split(/\s{4,}/).at(-1)||'':'';
 const receiver=person.replace(/^\s*(?:Bendahara\s+Pengeluaran)\s*/i,'');
 const rows:ImportedRow[]=[];
 for(const line of table){
  const no=/^\s*(\d{1,2})\s+(.+)$/.exec(line);
  if(!no)continue;
  const after=no[2].trim();
  const values=tokenMoney(after);
  if(!values.length)continue;
  const gross=values.at(-1)!.value;
  const lastIndex=values.at(-1)!.index;
  const left=after.slice(0,lastIndex).replace(/\bRp\.?\s*$/i,'').trim();
  let quantity=1,satuan='Paket',tarif=gross,description=left,metadata:Partial<ImportedRow>={};
  const rate=/(\d{1,3})\s+(Hari|Malam|OH|Orang|Kali)\s*x\s*@\.?\s*Rp\.?\s*([\d.,]+)(?:\s+(\d{1,3})\s*%)?/i.exec(left);
  if(rate){
   quantity=Number(rate[1]);satuan=rate[2];const baseRate=rupiah(rate[3]);
   const share=rate[4]?Number(rate[4]):0;
   tarif=share?gross/quantity:baseRate;
   description=left.slice(0,rate.index).trim();
   if(share){description+=' ('+share+'% dari Rp '+baseRate.toLocaleString('id-ID')+')';metadata={tarifDasar:baseRate,persentase:share};}
  }else{
   description=left.replace(/\bRp\.?\s*$/i,'').trim();
  }
  const tail=after.slice(lastIndex+values.at(-1)!.text.length).trim();
  if(tail)metadata.keterangan=tail;
  rows.push(makeRow(Number(no[1]),receiver||'Penerima SPPD',description,quantity,satuan,tarif,gross,metadata));
 }
 const totalText=bottom>=0?lines[bottom]:'';
 const expected=tokenMoney(totalText).at(-1)?.value??null;
 const nomor=/Lampiran\s+SPPD\s+Nomor\s*:\s*(\S+)/i.exec(input)?.[1]||'';
 const dateText=lines.slice(bottom+1).join('\n');
 const receiptDate=getDate(dateText);
 const warnings:string[]=[];
 const headerDate=getDate(lines.slice(0,top).join('\n'));
 if(headerDate&&receiptDate&&headerDate.slice(0,4)!==receiptDate.slice(0,4))warnings.push('Tahun tanggal SPPD ('+headerDate+') berbeda dari tanggal kuitansi ('+receiptDate+'); pastikan tanggal sumber benar.');
 if(!receiver)warnings.push('Nama penerima perjalanan tidak terbaca jelas; lengkapi sebelum menyimpan.');
 return finalize(input,rows,receiptDate,expected,warnings,nomor);
}
export function parseInsideTravelReceipt(text:string):ParsedReceipt|null{
 const input=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ');
 if(!/DAFTAR\s+PENERIMAAN/i.test(input)||!/\bOH\b/i.test(input)||!/\bHari\b/i.test(input))return null;
 const lines=input.split('\n');
 const head=lines.findIndex(x=>/NO\s+NAMA/i.test(x));
 const totalIndex=lines.findIndex((x,i)=>i>head&&/^\s*JUMLAH\b/i.test(x));
 if(head<0||totalIndex<0)return null;
 const nameEnd=Math.max(30,lines[head].indexOf('PELAKSANAAN')>0?lines[head].indexOf('PELAKSANAAN')-8:42);
 const nameStart=Math.max(0,lines[head].indexOf('NAMA')-6);
 const section=lines.slice(head+1,totalIndex);
 const anchors:number[]=[];
 for(let i=0;i<section.length;i++){
  const found=/^\s*(\d{1,2})\s+/.exec(section[i]);
  if(found&&Number(found[1])===anchors.length+1&&tokenMoney(section[i]).length>=2)anchors.push(i);
 }
 const rows:ImportedRow[]=[];
 let prevEnd=0;
 for(let k=0;k<anchors.length;k++){
  const index=anchors[k];
  let start=index;
  while(start>prevEnd&&section[start-1].trim()!=='')start--;
  let end=index;
  while(end+1<section.length&&section[end+1].trim()!=='')end++;
  prevEnd=end+1;
  const chunk=section.slice(start,end+1);
  const names:string[]=[],dates:string[]=[];
  for(const line of chunk){
   const name=line.slice(nameStart,nameEnd).replace(/^\s*\d{1,2}\s+/,'').trim();
   if(name&&!/^(?:NAMA|NO)$/i.test(name)&&!/\b\d{1,3}[.,]\d{3}\b/.test(name))names.push(name);
   const d=line.slice(nameEnd).trim();
   if(d)dates.push(d);
  }
  const line=section[index];
  const numeric=tokenMoney(line);
  if(numeric.length<2)continue;
  const total=numeric.at(-1)!.value,rate=numeric.at(-2)!.value;
  const middle=line.slice(numeric.at(-2)!.index+numeric.at(-2)!.text.length,numeric.at(-1)!.index);
  const days=Number(middle.match(/\b(\d{1,2})\b/)?.[1]||1);
  const rawDate=dates.join(' ');
  const rowDate=getDate(rawDate);
  rows.push(makeRow(k+1,names.join(' '),'Perjalanan dinas dalam kota',days,'Hari',rate,total,{tanggalPelaksanaan:rowDate}));
 }
 const expected=tokenMoney(lines[totalIndex]).at(-1)?.value??null;
 const receiptDate=getDate(lines.slice(totalIndex+1).join('\n'));
 const description=lines.slice(0,head).filter(x=>!/(?:DAFTAR PENERIMAAN|TANGGAL)/i.test(x)).map(x=>x.trim()).filter(Boolean).join(' ');
 const warnings:string[]=[];
 if(rows.some(r=>!r.tanggalPelaksanaan))warnings.push('Ada tanggal pelaksanaan yang belum terbaca.');
 return finalize(input,rows,receiptDate,expected,warnings,'',description);
}