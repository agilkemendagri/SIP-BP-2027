import {sessionToken} from './sipBpAuth';
const url=(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'');
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
export type PejabatSettings={id:number;kota:string;satkerPanjang:string;satkerPendek:string;ppkNama:string;ppkNip:string;bppRmNama:string;bppRmNip:string;bppPnbpNama:string;bppPnbpNip:string};
export const defaultPejabatSettings:PejabatSettings={id:1,kota:'Makassar',satkerPanjang:'Balai Besar Pengembangan Kompetensi Aparatur Pemerintahan Dalam Negeri IV',satkerPendek:'BBPK APDN IV',ppkNama:'',ppkNip:'',bppRmNama:'',bppRmNip:'',bppPnbpNama:'',bppPnbpNip:''};
const keys=['kota','satkerPanjang','satkerPendek','ppkNama','ppkNip','bppRmNama','bppRmNip','bppPnbpNama','bppPnbpNip'] as const;
const dbKey={kota:'kota',satkerPanjang:'satker_panjang',satkerPendek:'satker_pendek',ppkNama:'ppk_nama',ppkNip:'ppk_nip',bppRmNama:'bpp_rm_nama',bppRmNip:'bpp_rm_nip',bppPnbpNama:'bpp_pnbp_nama',bppPnbpNip:'bpp_pnbp_nip'} as const;
const normalize=(d:Record<string,unknown>)=>{const s={...defaultPejabatSettings};for(const k of keys)if(typeof d[dbKey[k]]==='string')s[k]=d[dbKey[k]] as string;return s;};
async function call(method:'GET'|'PATCH',data?:Record<string,string>){
 if(!url||!key)throw Error('Supabase belum dikonfigurasi');
 const token=await sessionToken();if(!token)throw Error('Sesi login berakhir');
 const resp=await fetch(url+'/rest/v1/sip_bp_pejabat_settings?id=eq.1&select=*',{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',...(method==='PATCH'?{Prefer:'return=representation'}:{})},body:data?JSON.stringify(data):undefined,cache:'no-store'});
 if(!resp.ok)throw Error('Konfigurasi pejabat tidak tersedia ('+resp.status+'). Periksa migrasi database dan hak akses.');
 const rows=await resp.json();if(!Array.isArray(rows)||rows.length!==1)throw Error('Konfigurasi pejabat belum terdaftar.');
 return normalize(rows[0]);
}
export const fetchPejabatSettings=()=>call('GET');
export async function updatePejabatSettings(s:PejabatSettings){
 const data:Record<string,string>={};for(const k of keys){const value=s[k].trim();if(!value&&['kota','satkerPanjang','satkerPendek'].includes(k))throw Error('Identitas satker dan kota tidak boleh kosong.');if(k.toLowerCase().includes('nip')&&value&&!/^\d{18}$/.test(value))throw Error('NIP harus 18 digit atau kosong.');data[dbKey[k]]=value;}
 return call('PATCH',data);
}