import type {ImportedRow,ParsedReceipt} from './receiptExtractor';
const months:Record<string,string>={januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12'};
const num=(s:string)=>Number(s.replace(/(?:Rp|\s)/gi,'').replace(/[.,](?=\d{3}(?:\D|$))/g,'').replace(',','.'))||0;
const cash='(?:\\d{1,3}(?:[.,]\\d{3})+|\\d{4,})';
const monetary=new RegExp('\\b('+cash+')\\b','g');
function date(text:string){const a=[...text.matchAll(/\b(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(20\d{2})\b/gi)].at(-1);return a?a[3]+'-'+months[a[2].toLowerCase()]+'-'+a[1].padStart(2,'0'):'';}
function money(line:string){return [...line.matchAll(monetary)].map(m=>({n:num(m[1]),start:m.index||0})).filter(x=>x.n>=1000);}
const clean=(s:string)=>s.replace(/\s+/g,' ').replace(/^(?:\d{1,2}[.)]?\s+)/,'').trim();
function makeRow(idx:number,nama:string,uraian:string,jp:number,tarif:number,bruto:number,pph:number,netto:number):ImportedRow{return {id:'prof-'+idx,nama:clean(nama),uraianItem:clean(uraian),volume:jp||1,satuan:'JP',tarifSatuan:tarif||0,bruto:bruto||0,ppnNominal:0,pphNominal:pph||0,netto:netto||0};}
function base(text:string,rows:ImportedRow[],warnings:string[],totals:number[]=[]):ParsedReceipt{
 const kodeAkun=text.match(/(?:kode\s*akun|akun\s*belanja)\s*[:\-]?\s*(\d{6})/i)?.[1]||'';
 const t=totals.length>=3?totals.slice(-3):[];
 if(!kodeAkun)warnings.push('Kode akun tidak tercantum dalam kuitansi; isi sesuai dokumen anggaran.');
 if(!date(text))warnings.push('Tanggal kuitansi belum terbaca.');
 if(!rows.length)warnings.push('Rincian belum dikenali; perbaiki teks OCR atau masukkan manual.');
 if(t.length===3&&rows.length){const sums=rows.reduce((o,r)=>[o[0]+r.bruto,o[1]+r.pphNominal,o[2]+r.netto],[0,0,0]);if(sums.some((n,i)=>Math.abs(n-t[i])>1))warnings.push('Total pada tabel tidak cocok dengan rincian. Periksa dokumen sumber.');}
 for(const r of rows)if(r.nama===''||r.uraianItem===''||r.volume*r.tarifSatuan!==r.bruto||Math.abs(r.bruto-r.pphNominal-r.netto)>1)warnings.push('Baris '+r.id+' perlu koreksi: nama/uraian atau nominal tidak seimbang.');
 return {rows,tanggalKuitansi:date(text),kodeAkun,kegiatan:rows[0]?.uraianItem||'',nomorAsal:'',totalBruto:t[0]??null,totalPPN:0,totalPPh:t[1]??null,totalNetto:t[2]??null,warnings};
}
export function parseProfessionReceipt(text:string):ParsedReceipt|null{
 const raw=text.replace(/\r/g,'').replace(/[\u00a0\u2007]/g,' ').trim();
 if(!/TANDA\s+TERIMA|HONOR(?:ARIUM)?|PEMATERI|\bJP\b/i.test(raw))return null;
 const lines=raw.split(/\n/).map(clean).filter(Boolean);
 // Individual: read explicit JP x tariff and amounts, and recipient near signature.
 const joint=lines.join(' ');
 if(/Banyaknya\s+Uang|Bersih\s+diterima/i.test(raw)){
  const work=joint.match(/(?:Jumlah\s+honor|honor)\s*:?\s*(\d+)\s*JP\s*x\s*@?\s*Rp\.?\s*([\d.,]+)/i);
  const brut=joint.match(/(?:Jumlah\s+honor)[^\n]{0,85}?(Rp\.?\s*[\d.,]+)\s*(?:Potong|Bersih)/i);
  const tax=joint.match(/Potong\s*PPh[^\n]{0,80}?Rp\.?\s*([\d.,]+)/i);
  const net=joint.match(/Bersih\s+diterima\s*(?:Rp\.?)?\s*([\d.,]+)/i);
  const nama=joint.match(/Yang\s+menerima,?\s+([^\n]{4,100}?)(?=Setuju\s+Dibayar|Pejabat\s+Pembuat|Bendahara|$)/i)?.[1]?.trim()||lines.find(x=>/^(?:Hamzah|Dr\.)/i.test(x))||'';
  const description=joint.match(/Untuk\s+Pembayaran\s*:\s*(.*?)(?=Jumlah\s+honor|Potong\s*PPh)/i)?.[1]?.trim()||'Honorarium Jasa Profesi';
  if(work){const jp=Number(work[1]),tarif=num(work[2]);const bruto=brut?num(brut[1]):jp*tarif,pph=tax?num(tax[1]):0,netto=net?num(net[1]):bruto-pph;return base(raw,[makeRow(1,nama,description,jp,tarif,bruto,pph,netto)],[]);}
 }
 // Collective: detect numbered item starts and monetary quartet: tariff, gross, withholding, net.
 const starts=[...raw.matchAll(/(?:^|\n)\s*(\d{1,2})\s+(?=[A-Z][^\n]{2,})/g)];
 const rows:ImportedRow[]=[];
 for(let i=0;i<starts.length;i++){
  const part=raw.slice((starts[i].index||0)+starts[i][0].indexOf(starts[i][1])+starts[i][1].length,i+1<starts.length?starts[i+1].index:raw.length);
  if(/\bJUMLAH\b|Setuju Dibayar/i.test(part.slice(0,45)))continue;
  const vals=money(part);if(vals.length<4)continue;
  const tail=vals.slice(-4),tarif=tail[0].n,bruto=tail[1].n,pph=tail[2].n,netto=tail[3].n;
  if(bruto<1000||netto>bruto||Math.abs(bruto-pph-netto)>1)continue;
  const prefix=clean(part.slice(0,tail[0].start));
  const jpMatch=prefix.match(/\b(\d{1,2})\s*$/),jp=jpMatch?Number(jpMatch[1]):Math.round(bruto/tarif);
  const nameMatch=prefix.match(/^((?:Dr\.?\s*)?(?:Hj\.?\s*)?[A-Z][\w.'-]+(?:[,\s]+(?:S\.?Sos\.?|S\.?E\.?|M\.?M\.?|MM\.?|[A-Z][a-z]+)){0,8})/);
  const nama=(nameMatch?.[1]||prefix.split(/\bHonor\b/i)[0]||'').trim();
  const uraian=prefix.slice(nama.length).replace(/\b\d{1,2}\s*$/,'').trim()||'Honorarium Jasa Profesi';
  rows.push(makeRow(rows.length+1,nama,uraian,jp,tarif,bruto,pph,netto));
 }
 const total=lines.find(x=>/^JUMLAH\b/i.test(x))||'';
 if(rows.length)return base(raw,rows,[],money(total).map(x=>x.n));
 return null;
}
