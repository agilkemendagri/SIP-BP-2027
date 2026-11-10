import React,{useState} from 'react';
import type {KuitansiType} from '../../types';
import type {ImportedRow} from '../../utils/receiptExtractor';
import {KuitansiExtractorView} from './KuitansiExtractorView';
import {FilePenLine,ScanLine} from 'lucide-react';
export type ExtractedReceiptData={rows:ImportedRow[];date:string;account:string;activity:string;description:string;sourceNumber?:string;tanggalSppd?:string};
export const KuitansiWithExtractor:React.FC<{type:KuitansiType;children:React.ReactElement}>=({type,children})=>{
 const [mode,setMode]=useState<'manual'|'ekstraktor'>('manual');
 const [applied,setApplied]=useState<ExtractedReceiptData|null>(null);
 const apply=(data:ExtractedReceiptData)=>{setApplied(data);setMode('manual');};
 return <section className="space-y-4">
  <nav aria-label="Metode pengisian kuitansi" className="flex flex-wrap gap-2 border-b pb-3">
   <button type="button" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode==='manual'?'bg-blue-700 text-white':'bg-white border text-slate-700'}`}><FilePenLine size={16}/>Isi Manual</button>
   <button type="button" aria-pressed={mode==='ekstraktor'} onClick={()=>setMode('ekstraktor')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode==='ekstraktor'?'bg-blue-700 text-white':'bg-white border text-slate-700'}`}><ScanLine size={16}/>Ekstraktor Kuitansi</button>
  </nav>
  {mode==='manual'?React.cloneElement(children as React.ReactElement<{extracted?:ExtractedReceiptData}>,{extracted:applied||undefined}):<KuitansiExtractorView key={type} fixedType={type} onApplyToForm={apply}/>}
 </section>;
};