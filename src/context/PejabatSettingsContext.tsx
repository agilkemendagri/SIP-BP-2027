import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';
import {defaultPejabatSettings,fetchPejabatSettings,updatePejabatSettings,type PejabatSettings} from '../lib/sipBpPejabatSettings';
type Value={value:PejabatSettings;ready:boolean;loading:boolean;error:string;reload:()=>Promise<void>;save:(next:PejabatSettings)=>Promise<void>};
const Context=createContext<Value|null>(null);
export const PejabatSettingsProvider:React.FC<{children:React.ReactNode}>=({children})=>{
 const [value,setValue]=useState(defaultPejabatSettings);const [ready,setReady]=useState(false);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 const reload=useCallback(async()=>{setLoading(true);setError('');try{setValue(await fetchPejabatSettings());setReady(true);}catch(e){setReady(false);setError(e instanceof Error?e.message:'Gagal memuat konfigurasi');}finally{setLoading(false);}},[]);
 useEffect(()=>{reload().catch(()=>{});},[reload]);
 const save=async(next:PejabatSettings)=>{const updated=await updatePejabatSettings(next);setValue(updated);setReady(true);};
 return <Context.Provider value={{value,ready,loading,error,reload,save}}>{children}</Context.Provider>;
};
export const usePejabatSettings=()=>{const ctx=useContext(Context);if(!ctx)throw Error('Missing PejabatSettingsProvider');return ctx;};
export const signerForFunding=(s:PejabatSettings,source:'RM'|'PNBP')=>source==='RM'?{nama:s.bppRmNama,nip:s.bppRmNip}:{nama:s.bppPnbpNama,nip:s.bppPnbpNip};