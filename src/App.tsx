import React from "react";
import {AuthPortal} from "./components/AuthPortal";
import {isDevAuthConfigured} from "./lib/sipBpAuth";

/** DEV branch: no localStorage fallback, and no unauthenticated financial data. */
export default function App(){
 if(!isDevAuthConfigured)return <main className="min-h-screen bg-slate-50 grid place-items-center p-6">
  <section className="rounded-2xl border bg-white p-7 max-w-lg text-center">
   <h1 className="font-bold text-lg">SIP-BP — Konfigurasi belum lengkap</h1>
   <p className="mt-3 text-sm text-slate-600">Hubungi pengelola: variabel Supabase DEV hanya tersedia pada Preview branch yang diizinkan.</p>
  </section>
 </main>;
 return <AuthPortal/>;
}
