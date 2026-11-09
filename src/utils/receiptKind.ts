/** Individual when several sessions belong to the same recipient. */
export const isCollectiveReceipt = (rows: ReadonlyArray<{nama: string}>): boolean =>
  rows.length > 1 && new Set(rows.map(row => row.nama)).size > 1;
