/**
 * 市住更局 —— 三师库管理 · 专家数据 store（Pinia）
 *
 * 三个子模块（信息管理 / 随机抽取 / 考评分析）共用同一套专家数据：
 * 信息管理里新增/修改/删除专家，随机抽取的候补池与考评分析的列表即时同步；
 * 考评打分生成的评价记录与历史页共享。
 * 风格对齐项目 Pinia store（Options API：state / getters / actions，见 core/store/modules）。
 * 当前后端尚未介入：数据为 mock，接口就绪后把 actions 内实现替换为 defHttp 调用。
 */

import { defineStore } from 'pinia';

/** 专家实体（三个子模块共用：列表/表单/候补/考评） */
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

/** 评价记录实体（考评分析打分生成；历史记录页展示） */
export type EvaluationRecord = {
  id: number;
  /** 专家 id（关联 Expert.id） */
  expertId: number;
  /** 活跃度星数（0.5 步进，半星；一颗星 2 分） */
  activityStars: number;
  /** 专业覆盖度星数 */
  coverageStars: number;
  /** 评审效率星数 */
  efficiencyStars: number;
  /** 三维度得分（星数 × 2，满分各 10） */
  activityScore: number;
  coverageScore: number;
  efficiencyScore: number;
  /** 评价时间（YYYY-MM-DD） */
  time: string;
  /** 评价人 */
  evaluator: string;
  /** 评价单位 */
  org: string;
  /** 评价说明 */
  comment: string;
};

/** 专业领域选项（表单/搜索/抽取筛选共用） */
export const EXPERT_FIELDS = ['城市规划', '建筑学', '市政工程', '交通规划', '环境科学', '园林景观'] as const;

/** 职称选项 */
export const EXPERT_TITLES = ['高级工程师', '正高级工程师'] as const;

/** 单位性质选项 */
export const EXPERT_ORG_TYPES = ['民营企业', '国有企业', '政府机构', '事业单位'] as const;

// ---- 假数据生成（20 条，李xx 系列对齐原型） ----

const FIELDS = [...EXPERT_FIELDS];
const TITLES = [...EXPERT_TITLES];
const ORG_TYPES = [...EXPERT_ORG_TYPES];
const ORGS = ['xxx设计有限公司', 'xxx设计研究院', 'xxx局', 'xxx咨询有限公司'];
const GENDERS: Expert['gender'][] = ['男', '女'];
const CAREER_TEXT = '长期从事城市规划与设计工作，主持多项省市级重点片区控规与城市设计项目，具有丰富的评审与咨询经验。';

function createMockExperts(): Expert[] {
  return Array.from({ length: 20 }, (_, i) => ({
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
}

/** 专家库 state 形状 */
type ExpertPoolState = {
  experts: Expert[];
  evalRecords: EvaluationRecord[];
};

export const useExpertPoolStore = defineStore('expertPool', {
  state: (): ExpertPoolState => ({
    experts: createMockExperts(),
    evalRecords: [],
  }),

  getters: {
    /** 信息管理顶部统计卡 */
    expertStats: (state) => ({
      total: state.experts.length,
      senior: state.experts.filter((e) => e.title === '正高级工程师').length,
      selected: state.experts.filter((e) => e.selected).length,
    }),

    /** 按专家历史评价计算三维度平均分与评价次数（返回函数式 getter） */
    avgScoreOf: (state) => {
      return (expertId: number) => {
        const list = state.evalRecords.filter((r) => r.expertId === expertId);
        if (list.length === 0) return { activity: 0, coverage: 0, efficiency: 0, count: 0 };
        const avg = (pick: (r: EvaluationRecord) => number) =>
          Math.round((list.reduce((sum, r) => sum + pick(r), 0) / list.length) * 10) / 10;
        return {
          activity: avg((r) => r.activityScore),
          coverage: avg((r) => r.coverageScore),
          efficiency: avg((r) => r.efficiencyScore),
          count: list.length,
        };
      };
    },
  },

  actions: {
    /** 星数 → 得分（一颗星 2 分、半颗星 1 分，满分 5 星 = 10 分） */
    starsToScore(stars: number): number {
      return Math.round(stars * 2 * 10) / 10;
    },

    /** 新增专家（插到最前；TODO: 后端就绪后改为接口提交） */
    addExpert(data: Partial<Expert>) {
      const id = this.experts.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      this.experts = [{ ...createDefaultExpert(), ...data, id }, ...this.experts];
    },

    /** 修改专家（原地合并；TODO: 后端就绪后改为接口提交） */
    updateExpert(id: number, data: Partial<Expert>) {
      this.experts = this.experts.map((e) => (e.id === id ? { ...e, ...data } : e));
    },

    /** 删除专家（同时清理其评价记录；TODO: 后端就绪后改为接口提交） */
    removeExpert(id: number) {
      this.experts = this.experts.filter((e) => e.id !== id);
      this.evalRecords = this.evalRecords.filter((r) => r.expertId !== id);
    },

    /** 按条件查询专家（name/org 模糊、selected 精确 'yes'/'no'） */
    queryExperts(params: Recordable): Expert[] {
      const name = String(params.name ?? '').trim();
      const org = String(params.org ?? '').trim();
      const { selected } = params;
      return this.experts.filter((e) => {
        if (name && !e.name.includes(name)) return false;
        if (org && !e.org.includes(org)) return false;
        if (selected === 'yes' && !e.selected) return false;
        if (selected === 'no' && e.selected) return false;
        return true;
      });
    },

    /** 新增评价记录（三维度星数，得分自动换算；TODO: 后端就绪后改为接口提交） */
    addEvaluation(payload: {
      expertId: number;
      activityStars: number;
      coverageStars: number;
      efficiencyStars: number;
      evaluator?: string;
      time?: string;
      org?: string;
      comment?: string;
    }) {
      const id = this.evalRecords.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      this.evalRecords = [
        {
          id,
          expertId: payload.expertId,
          activityStars: payload.activityStars,
          coverageStars: payload.coverageStars,
          efficiencyStars: payload.efficiencyStars,
          activityScore: this.starsToScore(payload.activityStars),
          coverageScore: this.starsToScore(payload.coverageStars),
          efficiencyScore: this.starsToScore(payload.efficiencyStars),
          time: payload.time ?? '',
          evaluator: payload.evaluator ?? '管理员',
          org: payload.org ?? '',
          comment: payload.comment ?? '',
        },
        ...this.evalRecords,
      ];
    },

    /** 删除评价记录（TODO: 后端就绪后改为接口提交） */
    removeEvaluation(id: number) {
      this.evalRecords = this.evalRecords.filter((r) => r.id !== id);
    },

    /** 某专家的评价记录（按时间倒序，新在前） */
    recordsOf(expertId: number): EvaluationRecord[] {
      return this.evalRecords.filter((r) => r.expertId === expertId);
    },

    /** 随机抽取：按专业领域集合过滤 + 排除已展示者，洗牌取 count 名（TODO: 后端就绪后改为接口调用） */
    drawExperts(count: number, fields: string[], excludeIds: number[] = []): Expert[] {
      let pool = this.experts.filter((e) => fields.includes(e.field));
      if (excludeIds.length > 0) pool = pool.filter((e) => !excludeIds.includes(e.id));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    },
  },
});

/** 新增专家的默认值（addExpert 合并用） */
function createDefaultExpert(): Expert {
  return {
    id: 0,
    name: '',
    gender: '男',
    age: 35,
    phone: '',
    idCard: '',
    field: undefined as unknown as string,
    title: undefined as unknown as string,
    org: '',
    orgType: undefined as unknown as string,
    joinDate: '',
    selected: false,
    career: '',
    reviewExperience: '',
  };
}
