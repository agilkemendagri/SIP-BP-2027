import {describe,it,expect} from "bun:test";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {TandaTerimaIndividual} from "../src/components/kuitansi/templates/TandaTerimaIndividual";
import {TandaTerimaKolektif} from "../src/components/kuitansi/templates/TandaTerimaKolektif";

describe("Render template cetak tanpa mengubah database",()=>{
  it("membuat markup tanda terima individual dari data fiktif",()=>{
    const html=renderToStaticMarkup(React.createElement(TandaTerimaIndividual,{
      namaPenerima:"PENERIMA UJI",uraianKegiatan:"Simulasi Jasa Profesi",
      sumberDana:"RM",kota:"Makassar",tanggalIndo:"10 November 2026",
      ppkNama:"PPK UJI",ppkNip:"",bppNama:"BENDAHARA UJI",bppNip:"",
      sesiList:[{id:"uji",uraianSesi:"Honorarium Simulasi",volume:2,satuan:"OJ",tarifSatuan:500000,subtotal:1000000}],
      totalBruto:1000000,pphRate:5,pphNominal:50000,totalNetto:950000
    }));
    expect(html).toContain("PENERIMA UJI");
    expect(html).toContain("TANDA TERIMA");
    expect(html).toContain("Makassar");
    expect(html).toContain("BENDAHARA UJI");
    expect(html).not.toContain("KEMENTERIAN PERDAGANGAN");
  });
  it("membuat markup tanda terima kolektif dua penerima dari data fiktif",()=>{
    const html=renderToStaticMarkup(React.createElement(TandaTerimaKolektif,{
      sumberDana:"PNBP",kota:"Makassar",tanggalIndo:"10 November 2026",
      ppkNama:"PPK UJI",ppkNip:"",bppNama:"BENDAHARA UJI",bppNip:"",
      rows:[
        {id:"a",nama:"PENERIMA ALFA",untukPembayaran:"Honor A",jp:1,tarifSatuan:500000,bruto:500000,pph:25000,netto:475000},
        {id:"b",nama:"PENERIMA BETA",untukPembayaran:"Honor B",jp:1,tarifSatuan:500000,bruto:500000,pph:25000,netto:475000}
      ],
      totalBruto:1000000,totalPPh:50000,totalNetto:950000
    }));
    expect(html).toContain("PENERIMA ALFA");
    expect(html).toContain("PENERIMA BETA");
    expect(html).toContain("TANDA TERIMA");
    expect(html).toContain("Makassar");
    expect(html).not.toContain("KEMENTERIAN PERDAGANGAN");
  });
});
