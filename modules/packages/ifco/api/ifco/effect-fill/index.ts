/**
 * ifco —— 项目实施成效填报：指标清单、数据模型与汇总计算
 *
 * 纯假数据阶段：数据存模块级内存仓库（effectFillStore，成效填报页与将来的成效统计页
 * 共享；与进展填报的 progressFillStore 相互独立）。后端接入后整体替换为接口读写。
 *
 * 与进展填报的结构差异（用户定案）：成效填报**没有类目维度**——
 * 不分一级/二级类目 tab、没有总览 tab，一张表直接填写各项目的全部指标；
 * 数据按「年份 × 季度 × 报送单位」组织，每个单位只有一份项目列表。
 *
 * 指标清单源自《项目实施成效情况.csv》：
 * - 「一、～八、」8 个节标题行仅作长表分组展示（加粗、不填写），不是类目表头；
 * - 「数|面积」双值行（226/227/245/246）为单行 dual：每格存二元组 [数, 面积]，
 *   编辑时两个输入框，显示/导出用竖线拼接（导出纯数字不带千分位）；
 * - 缩进 = 全角空格数直传（照 CSV 半角空格换算：5→4、20→8、40→12）；
 * - 无汇总行/count 行/合计级录入行：全部数据行均为直接填报，「其中：/合计中：」
 *   仅是名称前缀与视觉层级，不参与任何自动求和。
 */

import { reactive } from 'vue';
import type { ProjectColumn } from '../common';
import { SAMPLE_PROJECT_NAMES, hashSeed } from '../common';

/** 指标行类型：fill=直接填报行；section=节标题行（一、～八、，不填写） */
export type EffectIndicatorKind = 'fill' | 'section';

/** 指标（表格行）定义 */
export type EffectIndicatorDef = {
  /** 稳定 key（数据行 r<代码>，双值行拆分用 a/b 后缀；节标题行 s1～s8） */
  key: string;
  /** 指标名称（含层级缩进与「其中：/合计中：」前缀） */
  name: string;
  /** 计量单位（节标题行为空） */
  unit: string;
  /** 指标代码（节标题行为空） */
  code: string;
  /** 行类型 */
  kind: EffectIndicatorKind;
  /** 双值行（数|面积）：一格存二元组 [数, 面积]，编辑时两个输入框，显示/导出用竖线拼接 */
  dual?: boolean;
};

/** 单个报送单位在一个周期的成效数据：只有一份项目列表（无类目维度） */
export type EffectUnitData = {
  projects: ProjectColumn[];
};

/** 成效数据仓库：周期 key（`${year}-Q${quarter}`）→ 报送单位 → 单位数据 */
export type EffectStore = Record<string, Record<string, EffectUnitData>>;

/** 层级缩进：全角空格数直传 */
const INDENT = (indent: number) => '\u3000'.repeat(indent);

function row(
  key: string,
  indent: number,
  name: string,
  unit: string,
  code = '',
  kind: EffectIndicatorKind = 'fill',
  dual = false,
): EffectIndicatorDef {
  return { key, name: `${INDENT(indent)}${name}`, unit, code, kind, dual };
}

function section(key: string, name: string): EffectIndicatorDef {
  return { key, name, unit: '', code: '', kind: 'section' };
}

/**
 * 指标清单（行序与《项目实施成效情况.csv》一致，含节标题行）。
 * 双值行拆分：226/227/245/246 → 数(a)/面积(b)两行，共用代码。
 */
export const EFFECT_INDICATORS: EffectIndicatorDef[] = [
  section('s1', '一、既有建筑改造利用'),
  row('r201', 0, '既有建筑改造面积', '平方米', '201'),
  row('r202', 4, '其中：城镇房屋抗震加固改造面积', '平方米', '202'),
  row('r203', 8, '城镇预制板危旧住房治理改造面积', '平方米', '203'),
  row('r204', 4, '其中：既有居住建筑和公共建筑节能改造面积', '平方米', '204'),
  row('r205', 0, '启动改造城市危旧房数', '套（间）', '205'),
  section('s2', '二、城镇老旧小区整治改造'),
  row('r206', 0, '新开工改造小区涉及居民户数', '户', '206'),
  row('r207', 0, '加装电梯数', '部', '207'),
  row('r208', 0, '小区老化管线管道改造长度', '公里', '208'),
  row('r209', 0, '小区新增电动汽车充电桩数', '个', '209'),
  row('r210', 0, '小区新增公共服务设施数', '个', '210'),
  section('s3', '三、完整社区建设'),
  row('r211', 0, '完整社区建设数', '个', '211'),
  row('r212', 0, '完整社区建设涉及居民户数', '户', '212'),
  row('r213', 0, '新增社区基本公共服务设施数', '个', '213'),
  row('r214', 4, '其中：新增老年服务站（老年人日间照料中心、托老所）数', '个', '214'),
  row('r215', 8, '新增托儿所数', '个', '215'),
  row('r216', 8, '新增社区食堂数', '个', '216'),
  row('r217', 0, '新增社区便民商业服务设施数', '个', '217'),
  row('r218', 0, '新增社区公共活动场地和公共绿地总面积', '平方米', '218'),
  section('s4', '四、老旧街区、老旧厂区、城中村等更新改造'),
  row('r219', 0, '老旧街区改造数', '个', '219'),
  row('r220', 0, '老旧街区改造和新增产业空间面积', '平方米', '220'),
  row('r221', 4, '其中：商业服务设施面积', '平方米', '221'),
  row('r222', 0, '老旧厂区改造数', '个', '222'),
  row('r223', 0, '老旧厂区改造和新增产业空间面积', '平方米', '223'),
  row('r224', 4, '其中：商业服务设施面积', '平方米', '224'),
  row('r225', 0, '启动改造城中村村（居）民户数', '户', '225'),
  section('s5', '五、城市功能完善'),
  row('r226', 0, '新增城市公共服务设施数|面积', '个|平方米', '226', 'fill', true),
  row('r227', 4, '其中：全民健身场地设施建设改造数|面积', '个|平方米', '227', 'fill', true),
  row('r228', 0, '城市公共空间建设面积', '平方米', '228'),
  section('s6', '六、城市基础设施建设改造'),
  row('r229', 0, '城市地下管线管网改造和新增长度', '公里', '229'),
  row('r230', 4, '其中：燃气管道长度', '公里', '230'),
  row('r231', 8, '供热管道长度', '公里', '231'),
  row('r232', 8, '供水管道长度', '公里', '232'),
  row('r233', 8, '排水管道长度', '公里', '233'),
  row('r234', 8, '合计中：污水管道长度', '公里', '234'),
  row('r235', 12, '雨水管道长度', '公里', '235'),
  row('r236', 12, '雨污合流管道长度', '公里', '236'),
  row('r237', 0, '地下综合管廊新建长度', '公里', '237'),
  row('r238', 0, '城市道路改造长度', '公里', '238'),
  row('r239', 0, '城市桥梁改造数', '座', '239'),
  row('r240', 0, '新增停车位数', '个', '240'),
  row('r241', 0, '生活垃圾中转站改造和新增能力', '吨/日', '241'),
  section('s7', '七、城市生态修复'),
  row('r242', 0, '改造和新增城市绿道长度', '公里', '242'),
  row('r243', 0, '改造和新增口袋公园数', '个', '243'),
  section('s8', '八、城市历史文化保护传承'),
  row('r244', 0, '历史文化街区保护提升（修复）数', '片', '244'),
  row('r245', 0, '历史建筑修缮数|面积', '处|平方米', '245', 'fill', true),
  row('r246', 0, '历史建筑活化利用数|面积', '处|平方米', '246', 'fill', true),
  row('r247', 0, '城市历史文化保护传承涉及居民户数', '户', '247'),
];

export const EFFECT_INDICATOR_MAP: Record<string, EffectIndicatorDef> = Object.fromEntries(
  EFFECT_INDICATORS.map((item) => [item.key, item]),
);

/** 示例值区间按计量单位（成效指标全部为量数行） */
const UNIT_SAMPLE_RANGES: Record<string, [number, number]> = {
  平方米: [500, 80000],
  个: [1, 300],
  户: [50, 5000],
  部: [1, 80],
  '套（间）': [10, 800],
  公里: [1, 60],
  座: [1, 30],
  处: [1, 120],
  片: [1, 8],
  '吨/日': [10, 600],
};

function sampleSingleValue(unit: string, seed: number): number {
  const [min, max] = UNIT_SAMPLE_RANGES[unit] ?? [1, 100];
  return min + (seed % (max - min + 1));
}

function sampleCellValue(tabKey: string, columnKey: string, item: EffectIndicatorDef): number | [number, number] {
  const base = `${tabKey}|${columnKey}|${item.key}`;
  if (item.dual) {
    // 双值行按位取值：单位串「个|平方米」拆成两槽各自的量级
    const [unitA = '个', unitB = '平方米'] = item.unit.split('|');
    return [sampleSingleValue(unitA, hashSeed(`${base}#0`)), sampleSingleValue(unitB, hashSeed(`${base}#1`))];
  }
  return sampleSingleValue(item.unit, hashSeed(base));
}

/** 示例项目列（20 列，A1…G2），为全部填报行生成示例值 */
export function createEffectSampleProjects(unit: string): ProjectColumn[] {
  return SAMPLE_PROJECT_NAMES.map((name) => {
    const key = `${unit}-${name}`;
    const values: Record<string, number | string | [number, number]> = {};
    for (const item of EFFECT_INDICATORS) {
      if (item.kind === 'section') continue;
      values[item.key] = sampleCellValue(unit, key, item);
    }
    return { key, name, imported: false, values };
  });
}

// ── 内存假数据仓库（模块级单例，与进展域 progressFillStore 相互独立） ──
export const effectFillStore: EffectStore = reactive({});

/** 取某周期某报送单位的数据（懒初始化：首次访问生成 20 列示例数据） */
export function ensureEffectUnitData(periodKey: string, unit: string): EffectUnitData {
  if (!effectFillStore[periodKey]) {
    effectFillStore[periodKey] = {};
  }
  if (!effectFillStore[periodKey]![unit]) {
    effectFillStore[periodKey]![unit] = { projects: createEffectSampleProjects(unit) };
  }
  return effectFillStore[periodKey]![unit];
}

/** 只读取某周期某报送单位的数据（不触发懒初始化） */
export function getEffectUnitData(periodKey: string, unit: string): EffectUnitData | undefined {
  return effectFillStore[periodKey]?.[unit];
}

// ── 取值与汇总（全部数据行为直接填报，节标题行恒为空） ─────────────────

/** 单元格取值：双值行返回二元组；填报行 = 已填值；节标题行不落单元格 */
export function cellValue(
  item: EffectIndicatorDef,
  column: ProjectColumn,
): number | string | [number, number] | undefined {
  if (item.kind === 'section') return undefined;
  const value = column.values[item.key];
  if (item.dual) {
    return Array.isArray(value) ? value : undefined;
  }
  return value === undefined || value === '' || Array.isArray(value) ? undefined : value;
}

/** 一行指标的「合计」：双值行按位求和返回二元组；普通行 = 数值之和；节标题行无合计 */
export function rowTotal(
  item: EffectIndicatorDef,
  data: EffectUnitData | undefined,
): number | [number, number] | undefined {
  if (item.kind === 'section') return undefined;
  if (item.dual) {
    let sumA = 0;
    let sumB = 0;
    for (const column of data?.projects ?? []) {
      const value = cellValue(item, column);
      if (Array.isArray(value)) {
        sumA += value[0];
        sumB += value[1];
      }
    }
    return [sumA, sumB];
  }
  let sum = 0;
  for (const column of data?.projects ?? []) {
    const value = cellValue(item, column);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}

/** 统计口径：一批单位聚合后的行合计（双值行按位求和返回二元组；节标题行无合计） */
export function rowTotalOfUnits(
  item: EffectIndicatorDef,
  units: EffectUnitData[],
): number | [number, number] | undefined {
  if (item.kind === 'section') return undefined;
  if (item.dual) {
    let sumA = 0;
    let sumB = 0;
    for (const data of units) {
      const value = rowTotal(item, data);
      if (Array.isArray(value)) {
        sumA += value[0];
        sumB += value[1];
      }
    }
    return [sumA, sumB];
  }
  let sum = 0;
  for (const data of units) {
    const value = rowTotal(item, data);
    if (typeof value === 'number') sum += value;
  }
  return sum;
}
