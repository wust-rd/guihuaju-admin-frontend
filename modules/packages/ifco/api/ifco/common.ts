/**
 * ifco —— 项目进展/成效填报共用：数据类型、周期选项与静态单位清单。
 * 真实接口接入后的定位：
 * - 数据类型（类目/项目列/周期数据）与季度选项、季度文案为两个填报域共用；
 * - REPORT_UNITS 仅供 project-library（在库项目管理，仍为静态假数据阶段）使用，
 *   填报域的单位清单已改为接口拉取（progress-fill/index.ts 的 UNITS）；
 * - 指标/类目字典、填报数据读写均见 progress-fill 与 effect-fill 两个 api 层。
 */

/** 填报类目：一级类目，嵌套类目（老旧街区、老旧厂区、城中村等更新改造）含二级 */
export type CategoryDef = {
  key: string;
  label: string;
  children?: CategoryDef[];
};

/** 项目列（表格列） */
export type ProjectColumn = {
  key: string;
  /** 服务端项目 id（新增未落库的临时列为空；保存成功后回填为 key 同值） */
  id?: string;
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

/** 项目报送单位静态清单：仅供 project-library 假数据阶段使用；填报域已改接口拉取（含 13 区编码） */
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
