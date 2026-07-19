/** 將 public/ 入面嘅相對路徑轉成可用 URL（兼容 Capacitor 嘅 './' base） */
export function assetUrl(p: string): string {
  // 自製卡嘅 object URL / data URL / 外連直接用
  if (/^(blob:|data:|https?:)/i.test(p)) return p;
  const base = import.meta.env.BASE_URL || './';
  return `${base}${p}`;
}
