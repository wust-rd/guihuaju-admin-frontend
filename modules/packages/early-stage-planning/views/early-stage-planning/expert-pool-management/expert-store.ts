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
import { dateUtil } from '@jeesite/core/utils/dateUtil';

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
export const EXPERT_FIELDS = [
  '城乡规划学',
  '建筑学',
  '土木工程',
  '测绘科学与技术',
  '交通运输工程',
  '环境科学与工程',
  '土木水利',
  '风景园林',
  '管理科学与工程',
  '公共管理',
  '工程管理',
  '生态学',
  '测绘工程',
  '计算机科学与技术',
  '软件工程',
  '经济学',
  '法学',
] as const;

/** 职称选项 */
export const EXPERT_TITLES = ['高级工程师', '正高级工程师'] as const;

/** 单位性质选项 */
export const EXPERT_ORG_TYPES = ['民营企业', '国有企业', '党政机关', '事业单位', '其他'] as const;

// ---- 假数据生成（24 条，真实感中文姓名 + 武汉市规划/设计单位） ----

const FIELDS = [...EXPERT_FIELDS];
const TITLES = [...EXPERT_TITLES];
const ORG_TYPES = [...EXPERT_ORG_TYPES];

/** 真实感中文姓名池（互不相同，避免满屏同姓） */
const EXPERT_NAMES = [
  '张伟',
  '王芳',
  '李娜',
  '刘洋',
  '陈静',
  '杨帆',
  '赵磊',
  '黄敏',
  '周强',
  '吴婷',
  '徐鹏',
  '孙丽',
  '马超',
  '朱琳',
  '胡斌',
  '郭雪',
  '林峰',
  '何洁',
  '高翔',
  '罗丹',
  '郑凯',
  '梁爽',
  '谢军',
  '宋佳',
] as const;

/** 单位池（武汉市规划/设计/高校） */
const ORGS = [
  '武汉市规划设计研究院',
  '中南建筑设计院',
  '湖北省城市规划设计研究院',
  '华中科技大学建筑与城市规划学院',
  '武汉大学城市设计学院',
  '武汉市政工程设计研究院',
  '中国城市规划设计研究院',
  '武汉市园林建筑规划设计院',
] as const;

const GENDERS: Expert['gender'][] = ['男', '男', '女', '男', '女'];
const AGES = [33, 36, 39, 42, 45, 48, 51];

/** 履历池（按领域轮换，避免所有专家文案雷同） */
const CAREERS = [
  '长期从事城市总体规划与片区控制性详细规划编制，主持多项市重点片区城市设计，具备丰富评审经验。',
  '深耕建筑设计二十余年，主持完成多栋超高层与大型公建项目，多次获省部级优秀设计奖。',
  '专注市政道路与综合管廊设计，参与多项市级重大市政工程，熟悉全流程造价与进度管理。',
  '从事交通规划与公共交通研究，牵头城市轨道线网与枢纽换乘方案，发表多篇核心期刊论文。',
  '长期开展环境科学与海绵城市研究，主持多项水环境治理与生态修复项目，兼任高校客座专家。',
  '主攻风景园林与滨水景观设计，主持多个城市公园与绿道系统规划，作品入选省级示范项目。',
] as const;

const REVIEWS = [
  '多次担任市规委会专家评审、重点片区方案征集评审专家。',
  '受聘市住建局专家库，参与年度优秀工程评选与验收评审。',
  '长期参与省级规划成果评优及重大项目咨询论证。',
  '担任多所高校研究生论文评审与答辩专家。',
] as const;

function createMockExperts(): Expert[] {
  return EXPERT_NAMES.map((name, i) => ({
    id: i + 1,
    name,
    gender: GENDERS[i % GENDERS.length],
    age: AGES[i % AGES.length] + (i % 3),
    phone: `1${[38, 39, 50, 51, 86, 88][i % 6]}${String(10000000 + i * 173291).slice(0, 8)}`,
    idCard: `4201xxxxxxxx${String(1000 + i * 37).slice(-4)}`,
    field: FIELDS[i % FIELDS.length],
    title: TITLES[i % 3 === 1 ? 1 : 0],
    org: ORGS[(i * 3) % ORGS.length],
    orgType: ORG_TYPES[(i + 1) % ORG_TYPES.length],
    joinDate: dateUtil()
      .subtract(i * 7, 'day')
      .format('YYYY-MM-DD'),
    selected: false,
    career: CAREERS[i % CAREERS.length],
    reviewExperience: REVIEWS[i % REVIEWS.length],
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

    /** 新增专家（插到最前；入库时间由系统在新增时自动生成为当天，不可手动修改；TODO: 后端就绪后改为接口提交） */
    addExpert(data: Partial<Expert>) {
      const id = this.experts.reduce((max, e) => Math.max(max, e.id), 0) + 1;
      this.experts = [
        { ...createDefaultExpert(), ...data, id, joinDate: dateUtil().format('YYYY-MM-DD') },
        ...this.experts,
      ];
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

    /** 将指定专家标记为「已入选三师」（随机抽取确认选用后调用） */
    markSelected(ids: number[]) {
      this.experts = this.experts.map((e) => (ids.includes(e.id) ? { ...e, selected: true } : e));
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
