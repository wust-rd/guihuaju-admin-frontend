/**
 * ifco —— 在库项目管理（数据层）
 *
 * 项目库管理 · 四库（策划库/储备库/实施库/已退出）在库项目查询。
 * 策划库→储备库→实施库为项目三段生命周期，项目可随时退出，
 * 退出的项目归集到已退出库（状态显示「已退出」，只能查看）。
 * 当前后端尚未介入：统计卡数字与表格前 5 行照设计稿逐字抄录，
 * 其余 45 条按固定规则确定性生成凑满 50 条（刷新即恢复，无随机值）。
 * 接口就绪后：LIBRARY_CARDS 统计与 PROJECTS 明细替换为 defHttp 查询，
 * filterProjects 的过滤条件原样翻译为接口参数即可。
 */

import { REPORT_UNITS } from '../common';

/** 库：统计卡点选 = 表格筛选维度，经路由 ?library= 持久化 */
export type LibraryKey = 'planning' | 'reserve' | 'implementing' | 'exited';

/** 库 key → 中文名（生命周期步骤条/退出环节展示用） */
export const LIBRARY_LABELS: Record<LibraryKey, string> = {
  planning: '策划库',
  reserve: '储备库',
  implementing: '实施库',
  exited: '已退出',
};

/** 四库统计卡 */
export type LibraryCard = {
  key: LibraryKey;
  label: string;
  /** 卡片副文案（入库口径说明） */
  description: string;
  /** 项目数（照设计稿静态数字，非按表格行数统计） */
  count: number;
  /** 总投资（亿元，展示两位小数；已退出库设计稿无此项） */
  invest?: number;
};

/** 在库项目行 */
export type ProjectLibraryItem = {
  code: string;
  name: string;
  district: string;
  /** 片区名称（可空，页面空值显示 /） */
  areaName: string;
  /** 五改类型 */
  renewalType: string;
  /** 投资估算（亿元） */
  investEstimate: number;
  /** 资金来源（可空，页面空值显示 /） */
  fundSource: string;
  ownership: string;
  /** 实施主体（可空，页面空值显示 /） */
  implementOrg: string;
  /** 统筹主体（可空，页面空值显示 /） */
  coordinateOrg: string;
  /** 最新项目状态 */
  status: string;
  library: LibraryKey;
  /** 入库年份（仅搜索维度，表格不展示） */
  storeYear: number;
  /** 退出环节（仅已退出库项目有值：退出前所处的生命周期库） */
  exitedFrom?: LibraryKey;
  /** 退出时间（仅已退出库项目有值） */
  exitDate?: string;
  /** 退出原因（仅已退出库项目有值） */
  exitReason?: string;
};

/** 查询条件（行政区/五改类型等来自搜索表单，library 来自统计卡） */
export type ProjectLibraryQuery = {
  library?: LibraryKey;
  name?: string;
  district?: string;
  renewalType?: string;
  storeYear?: number | string;
  status?: string;
  ownership?: string;
};

/** 行政区选项：武汉市各行政区（与填报模块报送单位同口径） */
export { REPORT_UNITS as DISTRICTS };

/** 四库统计卡（点选即筛选表格，再点一次取消回到全部） */
export const LIBRARY_CARDS: LibraryCard[] = [
  {
    key: 'planning',
    label: '策划库',
    description: '区住建局统一录入，纳入统筹主体/实施主体',
    count: 1800,
    invest: 3000,
  },
  {
    key: 'reserve',
    label: '储备库',
    description: '统筹主体/实施主体申报且审核通过',
    count: 900,
    invest: 1500,
  },
  {
    key: 'implementing',
    label: '实施库',
    description: '具备施工条件，统筹主体/实施主体申报且审核通过',
    count: 830,
    invest: 1300,
  },
  {
    key: 'exited',
    label: '已退出',
    description: '4块退出机制，检索只读',
    count: 70,
  },
];

/** 五改类型选项 */
export const RENEWAL_TYPES = ['老旧街区改造', '城中村改造', '老旧厂区改造'];

/** 项目归属选项 */
export const OWNERSHIPS = ['市级更新片区内', '区级更新片区内', '片区外零星项目'];

/** 最新项目状态选项 */
export const STATUS_OPTIONS = [
  '待提交',
  '待储备库审核',
  '待储备库回收',
  '已提交',
  '待重新预提交',
  '已退出',
];

/** 各状态可用操作（设计稿：操作列按钮随项目状态变化） */
export const ACTIONS_BY_STATUS: Record<string, string[]> = {
  待提交: ['查看', '编辑'],
  待储备库审核: ['查看'],
  待储备库回收: ['查看', '编辑'],
  已提交: ['查看', '申请转储备', '申请退出'],
  待重新预提交: ['查看', '编辑'],
  已退出: ['查看'],
};

/** 设计稿抄录的前 5 行（项目编号 20263556~20263609，互为相邻号段） */
const VERBATIM_ROWS: ProjectLibraryItem[] = [
  {
    code: '20263609',
    name: '三旧改造之重点项目（一元片区）等',
    district: '江岸区',
    areaName: '一元片',
    renewalType: '老旧街区改造',
    investEstimate: 1.8,
    fundSource: '',
    ownership: '市级更新片区内',
    implementOrg: '',
    coordinateOrg: '江岸区住建局',
    status: '待提交',
    library: 'planning',
    storeYear: 2026,
  },
  {
    code: '20263559',
    name: '佛山街（二辉路-三阳路）道路改造',
    district: '江岸区',
    areaName: '一元片',
    renewalType: '老旧街区改造',
    investEstimate: 0.28,
    fundSource: '历史风貌区专项债',
    ownership: '市级更新片区内',
    implementOrg: '江岸区住建局',
    coordinateOrg: '江岸区住建局',
    status: '待储备库审核',
    library: 'reserve',
    storeYear: 2026,
  },
  {
    code: '20263558',
    name: '西马片房地产新模式试点项目等',
    district: '江岸区',
    areaName: '四马片',
    renewalType: '老旧街区改造',
    investEstimate: 2.03,
    fundSource: '企业资金',
    ownership: '区级更新片区内',
    implementOrg: '和纵盛地产公司',
    coordinateOrg: '江岸区住建局',
    status: '待储备库回收',
    library: 'reserve',
    storeYear: 2026,
  },
  {
    code: '20263557',
    name: '黑泥湖村城中村改造项目等',
    district: '江岸区',
    areaName: '黑泥湖片',
    renewalType: '城中村改造',
    investEstimate: 11.6,
    fundSource: '中央专项借款、地方政府专项债',
    ownership: '区级更新片区内',
    implementOrg: '江岸区园林局',
    coordinateOrg: '江岸区住建局',
    status: '已提交',
    library: 'implementing',
    storeYear: 2026,
  },
  {
    code: '20263556',
    name: '大智门火车站旧址修缮等',
    district: '江岸区',
    areaName: '',
    renewalType: '老旧街区改造',
    investEstimate: 0.1846,
    fundSource: '国家专项资金',
    ownership: '片区外零星项目',
    implementOrg: '江岸区文旅局',
    coordinateOrg: '',
    status: '待重新预提交',
    library: 'planning',
    storeYear: 2026,
  },
];

/** 库 → 生成行可轮转的状态 */
const GEN_STATUSES: Record<LibraryKey, string[]> = {
  planning: ['待提交', '待重新预提交'],
  reserve: ['待储备库审核', '待储备库回收'],
  implementing: ['已提交'],
  exited: ['已退出'],
};

/** 生成行的库分布：策划 18 / 储备 13 / 实施 10 / 已退出 4（加抄录 5 条共 50 条） */
const GEN_LIBRARY_PLAN: LibraryKey[] = [
  ...(Array(18).fill('planning') as LibraryKey[]),
  ...(Array(13).fill('reserve') as LibraryKey[]),
  ...(Array(10).fill('implementing') as LibraryKey[]),
  ...(Array(4).fill('exited') as LibraryKey[]),
];

const GEN_NAMES = [
  '中山大道历史街区保护提升',
  '解放公园路周边旧城更新',
  '永清片老旧街区改造',
  '汉正街中央服务区改造',
  '硚口老工业片区更新',
  '龟北片旧城改造',
  '武昌古城斗级营片区改造',
  '青山红房子亮点片区更新',
  '街道口片区城中村改造',
  '东西湖吴家山旧城更新',
  '蔡甸老城关片区改造',
  '江夏纸坊老旧街区更新',
  '黄陂前川旧城改造',
  '新洲邾城老旧小区成片改造',
  '汉南纱帽老旧街区更新',
  '二七沿江商务区旧改',
  '循礼门片区旧城更新',
  '杨园设计创意片区改造',
];

const GEN_AREA_NAMES = ['一元片', '四马片', '黑泥湖片', '二七片', '', ''];
const GEN_FUND_SOURCES = [
  '市区共担资金',
  '地方政府专项债',
  '企业资金',
  '国家专项资金',
  '中央专项借款、地方政府专项债',
  '',
];
const GEN_ORG_SUFFIXES = ['住建局', '园林局', '文旅局', '水务局'];

/** 已退出行的退出信息（环节/时间/原因按序轮转） */
const GEN_EXIT_FROM: LibraryKey[] = ['planning', 'reserve', 'implementing', 'implementing'];
const GEN_EXIT_DATES = ['2026-03-18', '2026-05-06', '2025-11-30', '2026-07-22'];
const GEN_EXIT_REASONS = ['规划调整，项目取消', '项目已竣工交付', '资金未落实，暂缓实施', '实施主体变更，协商退出'];

/** 全部在库项目（内存假数据） */
export const PROJECTS: ProjectLibraryItem[] = [
  ...VERBATIM_ROWS,
  ...GEN_LIBRARY_PLAN.map((library, i): ProjectLibraryItem => {
    const district = REPORT_UNITS[i % REPORT_UNITS.length];
    const statuses = GEN_STATUSES[library];
    return {
      code: String(20263555 - i),
      name:
        GEN_NAMES[i % GEN_NAMES.length] +
        (i < GEN_NAMES.length ? '' : i < GEN_NAMES.length * 2 ? '（二期）' : '（三期）'),
      district,
      areaName: GEN_AREA_NAMES[i % GEN_AREA_NAMES.length],
      renewalType: RENEWAL_TYPES[i % RENEWAL_TYPES.length],
      investEstimate: Number((((i * 37) % 1200) / 100 + 0.3).toFixed(2)),
      fundSource: GEN_FUND_SOURCES[i % GEN_FUND_SOURCES.length],
      ownership: OWNERSHIPS[i % OWNERSHIPS.length],
      implementOrg: i % 3 === 2 ? '' : `${district}${GEN_ORG_SUFFIXES[i % GEN_ORG_SUFFIXES.length]}`,
      coordinateOrg: `${district}住建局`,
      status: statuses[i % statuses.length],
      library,
      storeYear: [2026, 2025, 2024][i % 3],
      ...(library === 'exited'
        ? {
            exitedFrom: GEN_EXIT_FROM[i % GEN_EXIT_FROM.length],
            exitDate: GEN_EXIT_DATES[i % GEN_EXIT_DATES.length],
            exitReason: GEN_EXIT_REASONS[i % GEN_EXIT_REASONS.length],
          }
        : {}),
    };
  }),
];

/** 本地过滤（无后端：查询/重置/统计卡点选都走这里） */
export function filterProjects(params: ProjectLibraryQuery): ProjectLibraryItem[] {
  const keyword = (params.name ?? '').trim();
  return PROJECTS.filter(
    (item) =>
      (!params.library || item.library === params.library) &&
      (!keyword || item.name.includes(keyword)) &&
      (!params.district || item.district === params.district) &&
      (!params.renewalType || item.renewalType === params.renewalType) &&
      (!params.status || item.status === params.status) &&
      (!params.ownership || item.ownership === params.ownership) &&
      (!params.storeYear || item.storeYear === Number(params.storeYear)),
  );
}
