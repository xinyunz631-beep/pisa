import type { Dish, Order, OrderItem, OrderStatus, Store } from '../types';
import { mulberry32, pad, pick } from './util';

/**
 * Mock 数据库（内存）。
 * 页面所有增删改操作都改这里，刷新后恢复初始数据 —— 这就是“无后端原型”的边界。
 */
export const rng = mulberry32(20261104);

/** 演示用“今天”，与 mock 数据时间保持一致。 */
export const TODAY = new Date(2026, 10, 4, 18, 30);

export function dayOffset(base: Date, offset: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() - offset);
  return d;
}

function dateTime(offset: number, hour: number, minute: number): string {
  const d = dayOffset(TODAY, offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(hour)}:${pad(minute)}`;
}

const storeSeed: Array<[string, string, string, string]> = [
  ['上海静安店', '上海', '静安区南京西路 1266 号', '周明'],
  ['上海徐汇店', '上海', '徐汇区衡山路 890 号', '李婷'],
  ['北京朝阳店', '北京', '朝阳区三里屯路 19 号', '王强'],
  ['北京海淀店', '北京', '海淀区中关村大街 27 号', '赵雪'],
  ['广州天河店', '广州', '天河区天河路 208 号', '陈磊'],
  ['深圳南山店', '深圳', '南山区海德三道 199 号', '刘洋'],
  ['杭州西湖店', '杭州', '西湖区延安路 258 号', '孙倩'],
  ['成都春熙店', '成都', '锦江区春熙路 88 号', '吴昊'],
  ['南京新街口店', '南京', '秦淮区中山南路 1 号', '郑楠'],
  ['武汉江汉路店', '武汉', '江汉区江汉路 66 号', '何静'],
  ['西安钟楼店', '西安', '碑林区南大街 30 号', '马超'],
  ['苏州观前店', '苏州', '姑苏区观前街 120 号', '沈悦'],
];

export const stores: Store[] = storeSeed.map(([name, city, address, manager], i) => {
  const status = i === 3 || i === 9 ? 'preparing' : i === 11 ? 'closed' : 'open';
  return {
    id: `ST${String(i + 1).padStart(3, '0')}`,
    name,
    city,
    address,
    manager,
    status,
    turnover: Math.round((80_000 + rng() * 220_000) / 100) * 100,
    orders: Math.round(600 + rng() * 900),
  } as Store;
});

const dishSeed: Array<[string, string, number, number, string]> = [
  ['麻辣香锅', '招牌主菜', 68, 26, '招牌麻辣锅底，可选微辣/中辣/特辣'],
  ['酸菜鱼', '招牌主菜', 78, 32, '老坛酸菜配黑鱼片，酸辣开胃'],
  ['宫保鸡丁', '招牌主菜', 38, 14, '鸡腿肉配花生米，酸甜微辣'],
  ['红烧肉', '招牌主菜', 56, 22, '慢炖三小时，肥而不腻'],
  ['干锅花菜', '小炒', 32, 11, '有机花菜配五花肉片'],
  ['鱼香肉丝', '小炒', 34, 13, '经典川味，配木耳笋丝'],
  ['番茄炒蛋', '小炒', 26, 8, '现炒番茄，鸡蛋嫩滑'],
  ['麻婆豆腐', '小炒', 28, 9, '郫县豆瓣，麻辣鲜香'],
  ['蛋炒饭', '主食', 18, 5, '粒粒分明，配火腿丁'],
  ['阳春面', '主食', 16, 4, '清汤细面，葱花飘香'],
  ['小笼包（6只）', '主食', 24, 9, '皮薄汁多，现包现蒸'],
  ['玉米排骨汤', '汤羹', 36, 14, '慢火煲制，清甜滋补'],
  ['番茄蛋花汤', '汤羹', 18, 5, '清爽解腻'],
  ['酸梅汤', '饮品', 12, 3, '乌梅古法熬制，冰镇更佳'],
  ['鲜榨橙汁', '饮品', 22, 7, '当日鲜橙现榨，无添加'],
  ['杨枝甘露', '甜品', 26, 9, '芒果西柚西米，港式经典'],
  ['红豆双皮奶', '甜品', 20, 6, '顺德双皮奶配蜜红豆'],
  ['冰粉', '甜品', 12, 3, '红糖冰粉，配山楂碎'],
  ['毛血旺', '招牌主菜', 72, 28, '鸭血毛肚黄喉，红油翻滚'],
  ['水煮牛肉', '招牌主菜', 82, 34, '嫩牛肉配豆芽，麻辣过瘾'],
  ['回锅肉', '小炒', 42, 17, '二刀肉配蒜苗，灯盏窝'],
  ['酸辣土豆丝', '小炒', 22, 6, '爽脆酸辣，下饭神器'],
  ['口水鸡', '凉菜', 36, 13, '红油花椒，麻辣鲜香'],
  ['拍黄瓜', '凉菜', 18, 5, '蒜香清爽，开胃小菜'],
  ['担担面', '主食', 24, 7, '芝麻酱配花椒面，川味经典'],
  ['南瓜粥', '主食', 14, 4, '小米南瓜慢熬'],
  ['可乐', '饮品', 8, 2, '冰镇听装'],
  ['柠檬水', '饮品', 10, 2, '鲜柠檬片，微酸解腻'],
];

export const dishes: Dish[] = dishSeed.map(([name, category, price, cost, description], i) => ({
  id: `D${String(i + 1).padStart(3, '0')}`,
  name,
  category,
  price,
  cost,
  sales: Math.round(80 + rng() * 2400),
  status: i === 6 || i === 21 ? 'off' : 'on',
  description,
  updatedAt: dateTime(1 + (i % 4), 9 + (i % 10), (i * 7) % 60),
}));

const customerSeed = [
  '张伟',
  '王芳',
  '李娜',
  '刘敏',
  '陈杰',
  '杨静',
  '黄磊',
  '周涛',
  '林小雨',
  '徐子涵',
  '赵强',
  '孙丽',
];
const statusPool: OrderStatus[] = [
  'completed',
  'completed',
  'completed',
  'completed',
  'serving',
  'pending',
  'refunded',
];
const channels = ['dine-in', 'takeaway', 'delivery'] as const;

function buildOrder(index: number, offset: number): Order {
  const store = pick(rng, stores);
  const channel = pick(rng, channels);
  const itemCount = 1 + Math.floor(rng() * 4);
  const items: OrderItem[] = Array.from({ length: itemCount }, () => {
    const dish = pick(rng, dishes);
    return {
      dishId: dish.id,
      name: dish.name,
      qty: 1 + Math.floor(rng() * 3),
      price: dish.price,
    };
  });
  const amount = items.reduce<number>((sum, item) => sum + item.price * item.qty, 0);
  const hour = 10 + Math.floor(rng() * 12);
  const minute = Math.floor(rng() * 60);
  const createdAt = dateTime(offset, hour, minute);
  const compact = createdAt.replace(/[-: ]/g, '').slice(0, 8);
  return {
    id: `BS${compact}${String(index + 1).padStart(4, '0')}`,
    storeId: store.id,
    storeName: store.name,
    channel,
    status: pick(rng, statusPool),
    tableNo:
      channel === 'dine-in' ? `A${String(1 + Math.floor(rng() * 30)).padStart(2, '0')}` : undefined,
    customer: pick(rng, customerSeed),
    phone: `1${pick(rng, ['38', '39', '86', '58', '77'])}****${String(Math.floor(rng() * 9000) + 1000)}`,
    amount,
    items,
    createdAt,
  };
}

/** 近 7 天订单，今天(offset=0)也有数据，方便看板展示。 */
export const orders: Order[] = [
  ...Array.from({ length: 48 }, (_, i) => buildOrder(i, 0)),
  ...Array.from({ length: 40 }, (_, i) => buildOrder(100 + i, 1)),
  ...Array.from({ length: 34 }, (_, i) => buildOrder(200 + i, 2)),
  ...Array.from({ length: 28 }, (_, i) => buildOrder(300 + i, 3)),
  ...Array.from({ length: 22 }, (_, i) => buildOrder(400 + i, 4)),
  ...Array.from({ length: 18 }, (_, i) => buildOrder(500 + i, 5)),
  ...Array.from({ length: 14 }, (_, i) => buildOrder(600 + i, 6)),
];
