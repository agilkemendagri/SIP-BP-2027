import React,{useState} from 'react';
import type {KuitansiType} from '../../types';
import {KuitansiExtractorView} from './KuitansiExtractorView';
import {FilePenLine,ScanLine} from 'lucide-react';
export const KuitansiWithExtractor:React.FC<{type:KuitansiType;children:React.ReactNode}>=({type,children})=>{
 const [mode,setMode]=useState<'manual'|'ekstraktor'>('manual');
 return <section className="space-y-4">
  <nav aria-label="Metode pengisian kuitansi" className="flex flex-wrap gap-2 border-b pb-3">
   <button type="button" aria-pressed={mode==='manual'} onClick={()=>setMode('manual')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode==='manual'?'bg-blue-700 text-white':'bg-white border text-slate-700'}`}><FilePenLine size={16}/>Isi Manual</button>
   <button type="button" aria-pressed={mode==='ekstraktor'} onClick={()=>setMode('ekstraktor')} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${mode==='ekstraktor'?'bg-blue-700 text-white':'bg-white border text-slate-700'}`}><ScanLine size={16}/>Ekstraktor Kuitansi</button>
  </nav>
  {mode==='manual'?children:<KuitansiExtractorView key={type} fixedType={type}/>}
 </section>;
};