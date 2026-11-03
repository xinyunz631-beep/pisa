/** 模拟网络延迟，方便展示 loading 状态；换成真实后端时删掉即可。 */
export function sleep(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 前端分页：真实接口一般由后端分页，这里仅用于 Mock。 */
export function paginate<T>(list: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize;
  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    pageSize,
  };
}

/** 可复现的伪随机数，保证每次刷新 Mock 数据一致。 */
export function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0');
}

export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
