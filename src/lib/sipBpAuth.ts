/**
 * SIP-BP - Thin Supabase Auth REST adapter for DEV and PROD.
 * No secret/service-role keys in this browser module.
 * Session persisted in sessionStorage only (cleared when browser session ends).
 */
const url = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const storageKey = (import.meta.env.VITE_SIP_BP_ENV === "production") ? "sip_bp_prod_auth_v1" : "sip_bp_dev_auth_v1";
const authDomain = "sip-bp.example"; // Reserved domain, never accepts incoming mail
export const isDevAuthConfigured = Boolean(url && publishableKey);

export type SipRole = "bendahara" | "bpp_rm" | "bpp_pnbp";
export interface SipProfile {
  user_id: string;
  username: string;
  nama_lengkap: string;
  nip: string | null;
  jabatan: string;
  email_kontak: string | null;
  role: SipRole;
  aktif: boolean;
  wajib_ganti_password: boolean;
}
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
}
let current: Session | null = null;
try {
  if (typeof sessionStorage !== "undefined") {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) current = JSON.parse(raw);
  }
} catch { /* storage unavailable */ }
const save = (session: Session | null) => {
  current = session;
  try {
    if (session) sessionStorage.setItem(storageKey, JSON.stringify(session));
    else sessionStorage.removeItem(storageKey);
  } catch { /* private browsing */ }
};
async function request(path: string, init: RequestInit = {}, accessToken?: string) {
  if (!isDevAuthConfigured) throw new Error("Supabase belum dikonfigurasi.");
  const res = await fetch(url + path, {
    ...init,
    headers: {
      "apikey": publishableKey,
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
      ...(init.headers || {})
    },
    cache: "no-store"
  });
  let data: any = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error(
    data.error_description || data.msg || data.error || data.message || "Permintaan gagal (" + res.status + ")"
  );
  return data;
}
function storeAuth(data: any) {
  if (!data.access_token || !data.refresh_token || !data.user?.id) throw new Error("Sesi login tidak lengkap");
  const s: Session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now()/1000) + Number(data.expires_in || 3600),
    user: { id: data.user.id, email: data.user.email }
  };
  save(s);
  return s;
}
export async function sessionToken() {
  if (!current) return null;
  if (current.expires_at - 60 <= Math.floor(Date.now()/1000)) {
    try {
      const data = await request("/auth/v1/token?grant_type=refresh_token",{
        method: "POST", body: JSON.stringify({refresh_token: current.refresh_token})
      });
      storeAuth(data);
    } catch {
      save(null); return null;
    }
  }
  return current?.access_token || null;
}
export async function signInUsername(username: string,password: string) {
  const name=username.trim().toLowerCase();
  // First Production Bendahara may use a verified institutional email.
  // BPP accounts can continue using their local usernames without exposing profiles publicly.
  const emailLogin = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name);
  if(!emailLogin && !/^[a-z][a-z0-9._-]{2,31}$/.test(name)) throw new Error("Username atau email tidak valid");
  const email=emailLogin ? name : name+"@"+authDomain;
  const data = await request("/auth/v1/token?grant_type=password",{
    method:"POST",body:JSON.stringify({email,password})
  });
  storeAuth(data);
  try {
    const p=await ownProfile();
    if (!p || !p.aktif || (!emailLogin && p.username!==name)) throw new Error("Akun SIP-BP tidak aktif atau belum terdaftar");
    return p;
  } catch(e) { await signOut(); throw e; }
}
export async function ownProfile():Promise<SipProfile|null> {
  const token=await sessionToken();
  if(!token||!current) return null;
  const identity=await request("/auth/v1/user",{},token);
  if(identity.id!==current.user.id) { save(null); return null; }
  const profiles=await request(
    "/rest/v1/profiles?select=user_id,username,nama_lengkap,nip,jabatan,email_kontak,role,aktif,wajib_ganti_password&user_id=eq."+encodeURIComponent(identity.id),
    {},token);
  return Array.isArray(profiles) ? profiles[0] || null : null;
}
export async function listProfiles():Promise<SipProfile[]> {
  const token=await sessionToken(); if(!token) throw new Error("Sesi berakhir");
  return request("/rest/v1/profiles?select=user_id,username,nama_lengkap,nip,jabatan,email_kontak,role,aktif,wajib_ganti_password&order=role.asc,username.asc",{},token);
}
export async function adminAccount(action: string, fields: Record<string,unknown>) {
  const token=await sessionToken(); if(!token) throw new Error("Sesi berakhir");
  return request("/functions/v1/sip-bp-accounts",{
    method:"POST",body:JSON.stringify({action,...fields})
  },token);
}
export async function changeOwnPassword(currentPassword:string,newPassword:string) {
  const token=await sessionToken(); if(!token || !current) throw new Error("Sesi berakhir");
  if(newPassword.length<12||!/[A-Z]/.test(newPassword)||!/[a-z]/.test(newPassword)||!/[0-9]/.test(newPassword)||!/[^A-Za-z0-9]/.test(newPassword)||currentPassword===newPassword)
    throw new Error("Password baru minimal 12 karakter, dengan huruf besar/kecil, angka, simbol, dan harus berbeda");
  // Re-authenticate with the old password before allowing the change.
  await request("/auth/v1/token?grant_type=password",{
    method:"POST",
    body:JSON.stringify({email:current.user.email,password:currentPassword})
  });
  await request("/auth/v1/user",{
    method:"PUT",body:JSON.stringify({password:newPassword})
  },token);
  // Database auth.users trigger clears the mandatory-password flag after a real hash update.
  await signOut();
}
export async function signOut() {
  const token=current?.access_token;
  save(null);
  if(token) {try {await request("/auth/v1/logout",{method:"POST"},token);} catch {/* local session already cleared */}}
}

/** Update only the authenticated Bendahara's own identity fields.
 * Permissions and field validation are enforced independently by the server RPC.
 */
export async function updateBendaharaProfile(fields:{nama_lengkap:string;nip:string;jabatan:string}):Promise<SipProfile> {
 const token=await sessionToken();
 if(!token) throw new Error("Sesi login berakhir. Silakan login kembali.");
 const nama=fields.nama_lengkap.trim();
 const nip=fields.nip.trim();
 const jabatan=fields.jabatan.trim();
 if(nama.length<3||nama.length>160) throw new Error("Nama lengkap harus 3–160 karakter.");
 if(nip && !/^\\d{18}$/.test(nip)) throw new Error("NIP harus 18 digit angka atau kosong.");
 if(jabatan.length<3||jabatan.length>160) throw new Error("Jabatan harus 3–160 karakter.");
 await request("/rest/v1/rpc/sip_bp_update_own_profile",{
  method:"POST",body:JSON.stringify({p_nama_lengkap:nama,p_nip:nip,p_jabatan:jabatan})
 },token);
 const updated=await ownProfile();
 if(!updated || updated.role!=="bendahara")throw new Error("Profil berhasil disimpan, tetapi tidak dapat dimuat ulang. Silakan login ulang.");
 return updated;
}
