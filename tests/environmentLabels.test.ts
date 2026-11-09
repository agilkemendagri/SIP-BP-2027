import {describe,it,expect} from "bun:test";
import {readFileSync} from "node:fs";

describe("Isolasi nama dan sesi PROD/DEV",()=>{
 it("menetapkan label sidebar sesuai env, tidak menampilkan teks DEV secara statis",()=>{
  const sidebar=readFileSync("src/components/layout/Sidebar.tsx","utf8");
  expect(sidebar).toContain("sipBpEnvironmentLabel");
  expect(sidebar).toContain("BBPKA PDN IV · Kemendagri");
  expect(sidebar).not.toContain("Data Supabase DEV");
  expect(sidebar).not.toContain("Balai Besar Pengawasan Keuangan IV");
 });
 it("memisahkan browser sessionStorage dan URL environment",()=>{
  const auth=readFileSync("src/lib/sipBpAuth.ts","utf8");
  const env=readFileSync("src/lib/sipBpEnvironment.ts","utf8");
  expect(auth).toContain("sip_bp_prod_auth_v1");
  expect(auth).toContain("sip_bp_dev_auth_v1");
  expect(env).toContain('VITE_SIP_BP_ENV === "production"');
 });
});
