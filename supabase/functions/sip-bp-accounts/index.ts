import { withSupabase } from "npm:@supabase/server@1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const respond = (data: unknown, status = 200) => Response.json(data, { status, headers: cors });
const userPattern = /^[a-z][a-z0-9._-]{2,31}$/;
const bppRole = (v: unknown): v is "bpp_rm" | "bpp_pnbp" => v === "bpp_rm" || v === "bpp_pnbp";
const tempPassword = () => {
  // Every temporary password satisfies required uppercase/lowercase/digit/symbol.
  const sets = [
    "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "abcdefghijkmnopqrstuvwxyz",
    "23456789",
    "!@#%"
  ];
  const randomIndex = (max: number) => {
    const n = crypto.getRandomValues(new Uint32Array(1))[0];
    return n % max;
  };
  const chars = sets.map(s => s[randomIndex(s.length)]);
  const alphabet = sets.join("");
  for (let i = chars.length; i < 24; i++) chars.push(alphabet[randomIndex(alphabet.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};
const handler = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);
  const actorId = ctx.userClaims?.id;
  if (!actorId) return respond({ error: "Tidak terautentikasi" }, 401);
  const { data: actor, error: actorError } = await ctx.supabase
    .from("profiles").select("role,aktif,wajib_ganti_password")
    .eq("user_id", actorId).single();
  if (actorError || !actor || !actor.aktif || actor.role !== "bendahara" || actor.wajib_ganti_password) {
    return respond({ error: "Hanya Bendahara aktif yang boleh mengelola akun BPP" }, 403);
  }
  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return respond({ error: "JSON tidak valid" }, 400); }
  const action = String(input.action || "");
  if (action === "create_bpp") {
    const username = String(input.username || "").trim().toLowerCase();
    const nama = String(input.nama_lengkap || "").trim();
    const role = input.role;
    if (!userPattern.test(username) || !nama || nama.length > 160 || !bppRole(role)) {
      return respond({ error: "Username, nama, atau peran BPP tidak valid" }, 400);
    }
    const password = tempPassword();
    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email: username + "@sip-bp.example", password, email_confirm: true
    });
    if (createError || !created.user) return respond({ error: createError?.message || "Gagal membuat akun" }, 400);
    const userId = created.user.id;
    const { error: profileError } = await ctx.supabaseAdmin.from("profiles").insert({
      user_id: userId, username, nama_lengkap: nama,
      nip: String(input.nip || "").trim() || null,
      jabatan: String(input.jabatan || "").trim(),
      email_kontak: String(input.email_kontak || "").trim() || null,
      role, aktif: true, wajib_ganti_password: true
    });
    if (profileError) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      return respond({ error: "Gagal menyimpan profil akun" }, 409);
    }
    await ctx.supabaseAdmin.from("account_events").insert({
      actor_user_id: actorId, target_user_id: userId, event_type: "create_bpp"
    });
    return respond({ success: true, user_id: userId, temporary_password: password }, 201);
  }
  const targetId = String(input.user_id || "");
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(targetId)) return respond({ error: "ID pengguna tidak valid" }, 400);
  const { data: target } = await ctx.supabaseAdmin.from("profiles")
    .select("user_id,role,aktif").eq("user_id", targetId).maybeSingle();
  if (!target || target.role === "bendahara") return respond({ error: "Akun BPP tidak ditemukan" }, 404);
  if (action === "update_bpp") {
    const patch: Record<string, unknown> = {};
    if (input.role !== undefined) {
      if (!bppRole(input.role)) return respond({ error: "Peran harus BPP RM atau BPP PNBP" }, 400);
      patch.role = input.role;
    }
    if (input.nama_lengkap !== undefined) {
      if (!String(input.nama_lengkap).trim()) return respond({ error: "Nama tidak boleh kosong" }, 400);
      patch.nama_lengkap = String(input.nama_lengkap).trim();
    }
    if (input.nip !== undefined) patch.nip = String(input.nip).trim() || null;
    if (input.jabatan !== undefined) patch.jabatan = String(input.jabatan).trim();
    if (input.aktif !== undefined) {
      if (typeof input.aktif !== "boolean") return respond({ error: "Status aktif harus boolean" }, 400);
      patch.aktif = input.aktif;
    }
    if (Object.keys(patch).length === 0) return respond({ error: "Tidak ada perubahan" }, 400);
    patch.updated_at = new Date().toISOString();
    const { error } = await ctx.supabaseAdmin.from("profiles").update(patch).eq("user_id", targetId);
    if (error) return respond({ error: "Gagal mengubah akun" }, 400);
    const event = input.aktif === false ? "deactivate_bpp" : input.aktif === true ? "activate_bpp" : "update_bpp";
    await ctx.supabaseAdmin.from("account_events").insert({
      actor_user_id: actorId, target_user_id: targetId, event_type: event
    });
    return respond({ success: true });
  }
  if (action === "reset_bpp_password") {
    const reason = String(input.reason || "").trim();
    if (reason.length < 8 || reason.length > 500) return respond({ error: "Alasan reset minimal 8 karakter" }, 400);
    const password = tempPassword();
    const { error } = await ctx.supabaseAdmin.auth.admin.updateUserById(targetId, { password });
    if (error) return respond({ error: "Gagal mereset password" }, 400);
    const { error: updateError } = await ctx.supabaseAdmin.from("profiles").update({
      wajib_ganti_password: true, updated_at: new Date().toISOString()
    }).eq("user_id",targetId);
    if (updateError) return respond({ error: "Password berubah, tetapi status profil perlu diperiksa administrator" }, 500);
    await ctx.supabaseAdmin.from("account_events").insert({
      actor_user_id: actorId, target_user_id: targetId,
      event_type: "reset_bpp_password", reason
    });
    return respond({ success: true, temporary_password: password });
  }
  return respond({ error: "Aksi tidak dikenal" }, 400);
});

export default {
  fetch(req: Request) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    return handler(req);
  }
};
