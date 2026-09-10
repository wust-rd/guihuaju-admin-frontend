/**
 * ifco —— 项目进展/成效填报共用：类目、报送单位、周期与通用数据类型。
 * progress-fill 与 effect-fill 两个填报域从本文件引入，
 * 页面层仍从各自 api（progress-fill / effect-fill）导入，未直接依赖此文件。
 */

import { reactive } from 'vue';

/** 填报类目：一级类目，嵌套类目（老旧街区、老旧厂区、城中村等更新改造）含二级 */
export type CategoryDef = {
  key: string;
  label: string;
  children?: CategoryDef[];
};

/** 项目列（表格列） */
export type ProjectColumn = {
  key: string;
  name: string;
  /** 是否为「带入上一季度」生成的列（二三四季度不可删除，一季度带入的可删除） */
  imported: boolean;
  /** 单元格值：指标 key → 数值（文字行为字符串；双值行存二元组 [数,面积]，成效域使用；无值 = 未填） */
  values: Record<string, number | string | [number, number]>;
};

/** 单个叶子类目的填报数据（成效域无合计级录入行，totals 不使用） */
export type TabFillData = {
  projects: ProjectColumn[];
  /** 合计级录入行（如进展填报的新增就业岗位）：指标 key → 直接录入的合计值 */
  totals?: Record<string, number>;
};

/** 单个报送单位在一个周期内全部叶子类目的数据 */
export type PeriodFillData = Record<string, TabFillData>;

/** 全部数据：周期 key（`${year}-Q${quarter}`）→ 报送单位 → 周期数据 */
export type FillStore = Record<string, Record<string, PeriodFillData>>;

/** 一级类目（第一项为只读的总览） */
export const CATEGORIES: CategoryDef[] = [
  { key: 'overview', label: '总览' },
  { key: 'existing-building', label: '既有建筑改造利用' },
  { key: 'old-community', label: '城镇老旧小区整治改造' },
  { key: 'complete-community', label: '完整社区建设' },
  {
    key: 'renewal-complex',
    label: '老旧街区、老旧厂区、城中村等更新改造',
    children: [
      { key: 'old-street', label: '老旧街区更新改造' },
      { key: 'old-factory', label: '老旧厂区更新改造' },
      { key: 'urban-village', label: '城中村改造' },
    ],
  },
  { key: 'city-function', label: '城市功能完善' },
  { key: 'city-infrastructure', label: '城市基础设施建设改造' },
  { key: 'ecological-restoration', label: '城市生态修复' },
  { key: 'historical-culture', label: '城市历史文化保护传承' },
];

export const CATEGORY_MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.flatMap((cat) => [cat, ...(cat.children ?? [])].map((item) => [item.key, item])),
);

/** 除总览外的全部一级类目（总览聚合、导出分组用） */
export const DATA_CATEGORIES = CATEGORIES.filter((cat) => cat.key !== 'overview');

/** 叶子类目（实际持有项目列的 tab）：简单类目自身，嵌套类目的二级 */
export const LEAF_CATEGORIES: CategoryDef[] = DATA_CATEGORIES.flatMap(
  (cat) => cat.children ?? [cat],
);

/** 季度选项 */
export const QUARTER_OPTIONS = [
  { label: '一季度', value: '1' },
  { label: '二季度', value: '2' },
  { label: '三季度', value: '3' },
  { label: '四季度', value: '4' },
];

const QUARTER_LABELS: Record<string, string> = {
  '1': '一季度',
  '2': '二季度',
  '3': '三季度',
  '4': '四季度',
};

export function quarterLabel(quarter: string): string {
  return QUARTER_LABELS[quarter] ?? quarter;
}

/** 项目报送单位：市级单位在前（市财政厅/市发改委/市直单位），其后为武汉市各行政区（与体检模块 DISTRICTS 同口径） */
export const REPORT_UNITS = [
  '市财政厅',
  '市发改委',
  '市直单位',
  '江岸区',
  '江汉区',
  '硚口区',
  '汉阳区',
  '武昌区',
  '青山区',
  '洪山区',
  '东西湖区',
  '蔡甸区',
  '江夏区',
  '黄陂区',
  '新洲区',
  '汉南区',
] as const;

/** 报送单位默认值：市财政厅（单位清单第一项） */
export const DEFAULT_REPORT_UNIT: string = '市财政厅';

/** 周期 key：`${year}-Q${quarter}` */
export function toPeriodKey(year: number | string, quarter: string): string {
  return `${year}-Q${quarter}`;
}

/** 上一周期：一季度回到上一年四季度 */
export function prevPeriod(year: number, quarter: string): { year: number; quarter: string } {
  return quarter === '1'
    ? { year: year - 1, quarter: '4' }
    : { year, quarter: String(Number(quarter) - 1) };
}

/** 示例项目列名（每个叶子类目预置 20 列） */
export const SAMPLE_PROJECT_NAMES = [
  'A1', 'A2', 'A3',
  'B1', 'B2', 'B3',
  'C1', 'C2', 'C3',
  'D1', 'D2', 'D3',
  'E1', 'E2', 'E3',
  'F1', 'F2', 'F3',
  'G1', 'G2',
];

/** FNV-1a 字符串哈希：让示例值随（类目,项目,指标）确定生成、每次渲染不变 */
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 创建一个懒初始化的填报数据仓库（进展/成效两个域各自持有实例） */
export function createFillStore(): FillStore {
  return reactive<FillStore>({});
}
