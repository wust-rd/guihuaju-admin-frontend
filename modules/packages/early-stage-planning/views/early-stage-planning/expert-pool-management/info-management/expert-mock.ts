/**
 * 市住更局 —— 三师库管理 · 信息管理（本地假数据）
 *
 * 当前后端尚未介入：统计卡与专家列表均来自此文件（mock），
 * 接口就绪后删除 mock 数据、替换 list.vue 中的加载逻辑为 defHttp 调用即可。
 */

/** 专家实体（列表/表单/查看共用） */
export type Expert = {
  id: number;
  /** 专家姓名 */
  name: string;
  /** 性别（男/女） */
  gender: '男' | '女';
  /** 年龄 */
  age: number;
  /** 联系电话 */
  phone: string;
  /** 身份证号（脱敏展示） */
  idCard: string;
  /** 专业领域 */
  field: string;
  /** 职称 */
  title: string;
  /** 单位名称 */
  org: string;
  /** 单位性质 */
  orgType: string;
  /** 入库时间（YYYY-MM-DD） */
  joinDate: string;
  /** 是否已入选三师 */
  selected: boolean;
  /** 主要学习和工作经历 */
  career: string;
  /** 过往评审经历 */
  reviewExperience: string;
};

/** 顶部统计卡数据 */
export type ExpertStat = {
  /** 入库专家总数 */
  total: number;
  /** 正高级工程师数 */
  senior: number;
  /** 已入选三师数 */
  selected: number;
};

/** 专业领域选项（表单/搜索下拉共用） */
export const EXPERT_FIELDS = ['城市规划', '建筑学', '市政工程', '交通规划', '环境科学', '园林景观'] as const;

/** 职称选项 */
export const EXPERT_TITLES = ['高级工程师', '正高级工程师'] as const;

/** 单位性质选项 */
export const EXPERT_ORG_TYPES = ['民营企业', '国有企业', '政府机构', '事业单位'] as const;

/** 统计卡（按下方列表实时统计，mock 修改后自动联动） */
export function statOf(list: Expert[]): ExpertStat {
  return {
    total: list.length,
    senior: list.filter((e) => e.title === '正高级工程师').length,
    selected: list.filter((e) => e.selected).length,
  };
}

const FIELDS = [...EXPERT_FIELDS];
const TITLES = [...EXPERT_TITLES];
const ORG_TYPES = [...EXPERT_ORG_TYPES];
const ORGS = ['xxx设计有限公司', 'xxx设计研究院', 'xxx局', 'xxx咨询有限公司'];
const GENDERS: Expert['gender'][] = ['男', '女'];

const CAREER_TEXT = '长期从事城市规划与设计工作，主持多项省市级重点片区控规与城市设计项目，具有丰富的评审与咨询经验。';

/** 生成 20 条假数据（李xx 系列对齐原型） */
export const MOCK_EXPERTS: Expert[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `李xx${i > 8 ? String(i + 1) : ''}`,
  gender: GENDERS[i % 2],
  age: [40, 35, 38][i % 3],
  phone: '12345789511',
  idCard: '420122xxxxxx3232',
  field: FIELDS[i % FIELDS.length],
  title: TITLES[i % 3 === 1 ? 1 : 0],
  org: ORGS[i % ORGS.length],
  orgType: ORG_TYPES[i % ORG_TYPES.length],
  joinDate: '2026-10-12',
  selected: i % 3 !== 2,
  career: CAREER_TEXT,
  reviewExperience: '多次担任市规委会专家评审、重点片区方案征集评审专家。',
}));
