/**
 * ifco —— 在库项目管理（数据层）
 *
 * 项目库管理 · 四库（策划库/储备库/实施库/已退出）在库项目。
 * 字段契约对齐《项目库管理字段表》（2026-09-09）：基本信息 = 项目编号→入库时间；
 * 年度计划编制（采纳状态/年份）、建设性质等归其他模块，不在本模型。
 * 命名铁律：行政区=district、复数概念=List 后缀、不省略语义单词
 * （fiveReform/sixBring/investEstimate/reportOrg 为用户指定词）。
 *
 * 当前后端尚未介入：各选项清单（行政区/主管部门/责任部门/主体/片区）为静态假数据，
 * 接口就绪后统一换成字典/接口拉取；统计卡数字与表格前 5 行照设计稿逐字抄录，
 * 其余 45 条按固定规则确定性生成凑满 50 条（刷新即恢复，无随机值）。
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

/** 行政区选项：武汉市各行政区（先不含功能区；后端接入后换接口） */
export { REPORT_UNITS as DISTRICTS };

/** 项目归属：市级更新片区内项目与前期规划已入库更新片区关联 */
export type ProjectAffiliation = 'city-area' | 'district-area' | 'scattered';

export const PROJECT_AFFILIATION_OPTIONS = [
  { label: '市级更新片区内', value: 'city-area' },
  { label: '区级更新片区内', value: 'district-area' },
  { label: '片区外零星项目', value: 'scattered' },
] as const;

export const PROJECT_AFFILIATION_LABEL: Record<string, string> = {
  'city-area': '市级更新片区内',
  'district-area': '区级更新片区内',
  scattered: '片区外零星项目',
};

/** 市级更新片区（前期规划已入库片区假数据：选择片区后带出批次/功能定位，二者不可改） */
export type CityRenewalArea = {
  name: string;
  batch: 'first' | 'second';
  orientationList: string[];
};

export const CITY_RENEWAL_AREA_LIST: CityRenewalArea[] = [
  { name: '新兴街片', batch: 'first', orientationList: ['COD', 'TOD'] },
  { name: '一元片', batch: 'first', orientationList: ['TOD', 'SOD'] },
  { name: '二七沿江片', batch: 'first', orientationList: ['TOD', 'HOD'] },
  { name: '四马片', batch: 'second', orientationList: ['COD', 'EOD'] },
  { name: '黑泥湖片', batch: 'second', orientationList: ['IOD'] },
  { name: '龟北片', batch: 'second', orientationList: ['COD'] },
];

/** 区级更新片区（假数据；区级片区不在前期规划库，仅有名称） */
export const DISTRICT_RENEWAL_AREA_LIST = ['红钢城片', '街道口片', '吴家山片', '纸坊片', '前川片'];

/** 片区功能定位（多选） */
export const FUNCTION_ORIENTATION_OPTIONS = [
  { label: '交通导向（TOD）', value: 'TOD' },
  { label: '文旅导向（COD）', value: 'COD' },
  { label: '公服导向（SOD）', value: 'SOD' },
  { label: '生态导向（EOD）', value: 'EOD' },
  { label: '产业导向（IOD）', value: 'IOD' },
  { label: '康养导向（HOD）', value: 'HOD' },
] as const;

/** 片区批次 */
export const RENEWAL_AREA_BATCH_OPTIONS = [
  { label: '第一批', value: 'first' },
  { label: '第二批', value: 'second' },
] as const;

export const RENEWAL_AREA_BATCH_LABEL: Record<string, string> = {
  first: '第一批',
  second: '第二批',
};

/** 五改类别（key 与 ifco 填报类目同口径） */
export const FIVE_REFORM_TYPE_OPTIONS = [
  { label: '既有建筑改造', value: 'existing-building' },
  { label: '老旧小区改造', value: 'old-community' },
  { label: '老旧街区改造', value: 'old-street' },
  { label: '老旧厂区改造', value: 'old-factory' },
  { label: '城中村改造', value: 'urban-village' },
] as const;

export const FIVE_REFORM_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  FIVE_REFORM_TYPE_OPTIONS.map((item) => [item.value, item.label]),
);

/** 五改细分类别（按五改类别级联） */
export const FIVE_REFORM_SUB_TYPE_MAP: Record<string, string[]> = {
  'existing-building': ['危旧房改造', '历史建筑保护'],
  'old-community': ['老旧小区改造', '完整社区建设'],
  'old-street': ['老旧街区改造', '道路沿线片区更新', '历史街区保护利用', '环大学片区更新', '重大项目片区更新'],
  'old-factory': ['老旧工业园区和厂区'],
  'urban-village': ['城中村改造', '景中村改造'],
};

/** 六带类型（多选） */
export const SIX_BRING_TYPE_OPTIONS = ['带建设', '带保护', '带开发', '带整治', '带管理', '带改造'];

/** 资金来源（国统制[2026]19表3资金分类，分组多选；值为完整分类名） */
export const FUND_SOURCE_OPTIONS = [
  {
    label: '中央预算资金',
    options: [
      '中央预算资金-中央预算内投资',
      '中央预算资金-其他中央财政资金',
      '中央预算资金-国债（增发国债）',
      '中央预算资金-超长期特别国债',
    ].map((name) => ({ label: name, value: name })),
  },
  {
    label: '其他资金',
    options: [
      '省级预算资金',
      '市级及以下预算资金—市级',
      '市级及以下预算资金—区级',
      '地方政府一般债券',
      '地方政府专项债券',
      '产权单位出资',
      '规模化实施运营主体出资',
      '金融机构信贷资金',
      '居民出资',
      '其他资金',
    ].map((name) => ({ label: name, value: name })),
  },
];

/** 全部资金来源平铺（假数据生成用） */
export const FUND_SOURCE_ALL = FUND_SOURCE_OPTIONS.flatMap((group) => group.options.map((item) => item.value));

/** 行业主管部门（先按字段表示例+市发改委凑四个联合审查机构，后端接入后换接口；多选） */
export const INDUSTRY_SUPERVISION_DEPT_LIST = ['市住更局', '市财政局', '市水务局', '市发改委'];

/** 责任部门（假数据：各区住更局 + 市级行业主管部门；转库申请的主审单位） */
export const RESPONSIBLE_DEPT_LIST = [
  ...REPORT_UNITS.map((name) => `${name}住更局`),
  ...INDUSTRY_SUPERVISION_DEPT_LIST,
];

/** 统筹主体（假数据；候选清单由工具栏「配置统筹主体/实施主体」维护，接口待接入） */
export const COORDINATE_ORG_LIST = ['市发改委', '市财政局'];

/** 实施主体（假数据：各类建工单位） */
export const IMPLEMENT_ORG_LIST = [
  '武汉建工集团',
  '武汉城建集团',
  '中建三局',
  '湖北工建集团',
  '武汉地铁集团',
  '武汉生态投资集团',
];

/** 在库项目行（基本信息字段全集；library/status/退出信息为系统与流程字段） */
export type ProjectLibraryItem = {
  /** 项目编号（自动生成：片区内=片区唯一号+顺序号；零星=行政区首字母+年份+编码） */
  projectCode: string;
  projectName: string;
  /** 项目代码（发改委备案赋码，可空） */
  projectApprovalCode: string;
  district: string;
  projectAffiliation: ProjectAffiliation;
  /** 片区名称（市级/区级从下拉选择带出；零星为空） */
  renewalAreaName: string;
  /** 片区功能定位（市级选片区后带出，不可改；其余为空） */
  functionOrientationList: string[];
  /** 片区批次（市级选片区后带出，不可改；其余为空） */
  renewalAreaBatch: string;
  fiveReformType: string;
  /** 五改细分类别（与五改类别级联，可空） */
  fiveReformSubType: string;
  /** 六带类型（可空数组） */
  sixBringTypeList: string[];
  mainConstructionContent: string;
  /** 建设地点（可空） */
  constructionSite: string;
  /** 总体投资估算（亿元，2位小数；片区全部项目投资估算之和，系统自动计算，恒只读显示） */
  totalInvestEstimate: number;
  /** 项目投资估算（亿元，4位小数） */
  investEstimate: number;
  fundSourceList: string[];
  /** 资金情况备注说明（可空） */
  fundSituationRemark: string;
  industrySupervisionDeptList: string[];
  responsibleDept: string;
  /** 统筹主体（可空数组） */
  coordinateOrgList: string[];
  /** 实施主体（可空数组） */
  implementOrgList: string[];
  /** 指定填报主体（多个实施主体中指定一家，由实施主体清单中选择） */
  reportOrg: string;
  /** 填报人（可空） */
  reportPerson: string;
  /** 联系方式（可空） */
  reportPhone: string;
  /** 备注（可空） */
  remarks: string;
  library: LibraryKey;
  status: string;
  /** 入库时间（自动生成，恒只读显示） */
  inLibraryDate: string;
  /** 退出环节（仅已退出库项目有值：退出前所处的生命周期库） */
  exitedFrom?: LibraryKey;
  /** 退出时间（仅已退出库项目有值） */
  exitDate?: string;
  /** 退出原因（仅已退出库项目有值） */
  exitReason?: string;
  /** 立项审批或核准备案文件（审查文件页签；政府投资=立项审批，企业投资=核准/备案；多文件不限量） */
  projectApprovalOrFilingFileList?: string[];
  /** 是否符合国土空间规划（审查文件页签；是/否） */
  complyTerritorialSpacePlan?: string;
  /** 是否涉及规划调整（审查文件页签；是/否） */
  involvePlanAdjustment?: string;
  /** 国土空间规划相关文件（审查文件页签；多文件不限量） */
  territorialSpacePlanFileList?: string[];
  /** 项目实施方案文件（审查文件页签；多文件不限量） */
  projectImplementationPlanFileList?: string[];
  /** 地理数据（GeoJSON 字符串；上传 shp/dwg 经后端解析，或地图编辑产出） */
  locationGeoJson?: string;
  /** 地理数据源文件名（.shp/.dwg） */
  locationFileName?: string;
  // ── 联合审查机构审查（行业主管部门=联合审查单位，对每个文件区块/地理数据出具） ──
  /** 立项审批或核准备案文件 · 各机构审查（key=机构名） */
  approvalOrFilingReviewMap?: ProjectReviewEntryMap;
  /** 国土空间规划符合情况 · 各机构审查 */
  territorialSpacePlanReviewMap?: ProjectReviewEntryMap;
  /** 项目实施方案 · 各机构审查 */
  projectImplementationPlanReviewMap?: ProjectReviewEntryMap;
  /** 地理数据 · 各机构审查 */
  geoDataReviewMap?: ProjectReviewEntryMap;
};

/** 是否选项（是/否） */
export const YES_NO_OPTIONS = [
  { label: '是', value: '是' },
  { label: '否', value: '否' },
];

/** 联合审查结论（三选一） */
export const REVIEW_RESULT_OPTIONS = ['符合', '不符合', '不涉及'];

/** 单个机构对单个区块的审查（结论三选一 + 意见） */
export type ProjectReviewEntry = {
  /** 审查结论（符合/不符合/不涉及，空=未审查） */
  result: string;
  /** 审查意见 */
  opinion: string;
};

/** 一个区块的各机构审查（key=机构名） */
export type ProjectReviewEntryMap = Record<string, ProjectReviewEntry>;

/** 地理数据示例（武汉两地块红线；假数据阶段模拟后端解析结果） */
export const SAMPLE_LOCATION_GEO_JSON = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '示例地块一' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.245, 30.515],
            [114.285, 30.512],
            [114.29, 30.545],
            [114.252, 30.548],
            [114.245, 30.515],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: '示例地块二' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [114.302, 30.522],
            [114.322, 30.522],
            [114.322, 30.538],
            [114.302, 30.538],
            [114.302, 30.522],
          ],
        ],
      },
    },
  ],
});

/**
 * 模拟后端解析：上传 shp/dwg → 后端解析返回 GeoJSON。
 * 假数据阶段延迟后返回示例 GeoJSON；接口就绪后替换为真实上传 + 解析调用。
 */
export function parseGeoLocationFile(_file: File): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(SAMPLE_LOCATION_GEO_JSON), 800);
  });
}

/** 查询条件（projectName/fiveReformType 等来自搜索表单，library 来自统计卡） */
export type ProjectLibraryQuery = {
  library?: LibraryKey;
  projectName?: string;
  district?: string;
  fiveReformType?: string;
  /** 入库年份（按 inLibraryDate 年份过滤） */
  inLibraryYear?: number | string;
  status?: string;
  projectAffiliation?: string;
};

/** 四库统计卡（点选即筛选表格，再点一次取消回到全部） */
export type LibraryCard = {
  key: LibraryKey;
  label: string;
  description: string;
  count: number;
  /** 总投资（亿元，展示两位小数；已退出库无此项） */
  invest?: number;
};

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

/** 最新项目状态选项 */
export const STATUS_OPTIONS = ['待提交', '待储备库审核', '待储备库回收', '已提交', '待重新预提交', '已退出'];

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
    projectCode: '20263609',
    projectName: '三旧改造之重点项目（一元片区）等',
    projectApprovalCode: '',
    district: '江岸区',
    projectAffiliation: 'city-area',
    renewalAreaName: '一元片',
    functionOrientationList: ['TOD', 'SOD'],
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    fiveReformSubType: '老旧街区改造',
    sixBringTypeList: [],
    mainConstructionContent: '一元片区内危旧房改造、历史建筑保护利用及周边配套市政设施提升。',
    constructionSite: '江岸区一元街道',
    totalInvestEstimate: 1.8,
    investEstimate: 1.8,
    fundSourceList: [],
    fundSituationRemark: '',
    industrySupervisionDeptList: ['市住更局'],
    responsibleDept: '江岸区住更局',
    coordinateOrgList: ['江岸区住建局'],
    implementOrgList: [],
    reportOrg: '',
    reportPerson: '',
    reportPhone: '',
    remarks: '',
    library: 'planning',
    status: '待提交',
    inLibraryDate: '2026-08-12',
  },
  {
    projectCode: '20263559',
    projectName: '佛山街（二辉路-三阳路）道路改造',
    projectApprovalCode: '2310-420103-04-01-670407',
    district: '江岸区',
    projectAffiliation: 'city-area',
    renewalAreaName: '一元片',
    functionOrientationList: ['TOD', 'SOD'],
    renewalAreaBatch: 'first',
    fiveReformType: 'old-street',
    fiveReformSubType: '道路沿线片区更新',
    sixBringTypeList: ['带整治'],
    mainConstructionContent: '佛山街（二辉路-三阳路）道路及周边区域综合改造提升。',
    constructionSite: '江岸区二七街道',
    totalInvestEstimate: 2.08,
    investEstimate: 0.28,
    fundSourceList: ['地方政府专项债券'],
    fundSituationRemark: '拟申报专项债资金约2800万元。',
    industrySupervisionDeptList: ['市住更局', '市水务局'],
    responsibleDept: '江岸区住更局',
    coordinateOrgList: ['江岸区住建局'],
    implementOrgList: ['江岸区住建局'],
    reportOrg: '江岸区住建局',
    reportPerson: '夏传虎',
    reportPhone: '15902770001',
    remarks: '',
    library: 'reserve',
    status: '待储备库审核',
    inLibraryDate: '2026-07-03',
  },
  {
    projectCode: '20263558',
    projectName: '西马片房地产新模式试点项目等',
    projectApprovalCode: '',
    district: '江岸区',
    projectAffiliation: 'district-area',
    renewalAreaName: '四马片',
    functionOrientationList: [],
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    fiveReformSubType: '老旧街区改造',
    sixBringTypeList: [],
    mainConstructionContent: '西马片老旧街区更新改造及房地产新模式试点。',
    constructionSite: '江岸区四唯街道',
    totalInvestEstimate: 2.03,
    investEstimate: 2.03,
    fundSourceList: ['产权单位出资', '金融机构信贷资金'],
    fundSituationRemark: '一期企业自有资金加银行贷款，二期拟引入社会资本。',
    industrySupervisionDeptList: ['市住更局', '市财政局'],
    responsibleDept: '江岸区住更局',
    coordinateOrgList: ['江岸区住建局'],
    implementOrgList: ['和纵盛地产公司'],
    reportOrg: '和纵盛地产公司',
    reportPerson: '张明',
    reportPhone: '15902770002',
    remarks: '',
    library: 'reserve',
    status: '待储备库回收',
    inLibraryDate: '2026-06-18',
  },
  {
    projectCode: '20263557',
    projectName: '黑泥湖村城中村改造项目等',
    projectApprovalCode: '2310-420103-04-01-670408',
    district: '江岸区',
    projectAffiliation: 'city-area',
    renewalAreaName: '黑泥湖片',
    functionOrientationList: ['IOD'],
    renewalAreaBatch: 'second',
    fiveReformType: 'urban-village',
    fiveReformSubType: '城中村改造',
    sixBringTypeList: ['带建设', '带改造'],
    mainConstructionContent: '黑泥湖村城中村改造，含村民安置房、配套商业及市政基础设施建设。',
    constructionSite: '江岸区后湖街道',
    totalInvestEstimate: 11.6,
    investEstimate: 11.6,
    fundSourceList: ['中央预算资金-超长期特别国债', '地方政府专项债券'],
    fundSituationRemark: '拟申报超长期特别国债约6亿元，专项债约5.6亿元。',
    industrySupervisionDeptList: ['市住更局', '市财政局', '市水务局'],
    responsibleDept: '江岸区住更局',
    coordinateOrgList: ['江岸区住建局'],
    implementOrgList: ['江岸区园林局', '武汉城建集团'],
    reportOrg: '武汉城建集团',
    reportPerson: '李建国',
    reportPhone: '15902770003',
    remarks: '',
    library: 'implementing',
    status: '已提交',
    inLibraryDate: '2026-03-18',
  },
  {
    projectCode: '20263556',
    projectName: '大智门火车站旧址修缮等',
    projectApprovalCode: '',
    district: '江岸区',
    projectAffiliation: 'scattered',
    renewalAreaName: '',
    functionOrientationList: [],
    renewalAreaBatch: '',
    fiveReformType: 'old-street',
    fiveReformSubType: '历史街区保护利用',
    sixBringTypeList: ['带保护'],
    mainConstructionContent: '大智门火车站旧址及沿线历史建筑保护性修缮。',
    constructionSite: '江岸区大智街道',
    totalInvestEstimate: 0.1846,
    investEstimate: 0.1846,
    fundSourceList: ['中央预算资金-中央预算内投资'],
    fundSituationRemark: '',
    industrySupervisionDeptList: ['市住更局'],
    responsibleDept: '江岸区住更局',
    coordinateOrgList: [],
    implementOrgList: ['江岸区文旅局'],
    reportOrg: '江岸区文旅局',
    reportPerson: '',
    reportPhone: '',
    remarks: '',
    library: 'planning',
    status: '待重新预提交',
    inLibraryDate: '2026-05-06',
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

const GEN_STREETS = ['一元街道', '四唯街道', '永清街道', '车站街道', '大智街道', '后湖街道'];
const GEN_MAIN_CONTENTS = [
  '片区内老旧建筑改造、道路整治、雨污分流及配套市政设施提升。',
  '拆除更新与保留提升并举，完善公共服务设施与绿地系统。',
  '历史风貌建筑保护性修缮，活化利用为文创与社区服务空间。',
];
const GEN_PERSONS = ['夏传虎', '张明', '李建国', '王芳', '刘志强'];
const GEN_EXIT_FROM: LibraryKey[] = ['planning', 'reserve', 'implementing', 'implementing'];
const GEN_EXIT_DATES = ['2026-03-18', '2026-05-06', '2025-11-30', '2026-07-22'];
const GEN_EXIT_REASONS = ['规划调整，项目取消', '项目已竣工交付', '资金未落实，暂缓实施', '实施主体变更，协商退出'];
const GEN_APPROVAL_FILE_NAMES = [
  '区发展和改革委员会关于项目建议书的批复.pdf',
  '企业投资项目备案证明.pdf',
  '项目核准文件.pdf',
];

function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length];
}

/** 全部在库项目（内存假数据） */
export const PROJECTS: ProjectLibraryItem[] = [
  ...VERBATIM_ROWS,
  ...GEN_LIBRARY_PLAN.map((library, i): ProjectLibraryItem => {
    const district = REPORT_UNITS[i % REPORT_UNITS.length];
    const industrySupervisionDeptList =
      i % 4 === 0 ? [...INDUSTRY_SUPERVISION_DEPT_LIST] : [pick(INDUSTRY_SUPERVISION_DEPT_LIST, i)];
    const affiliation = pick(PROJECT_AFFILIATION_OPTIONS, i).value as ProjectAffiliation;
    const cityArea = affiliation === 'city-area' ? pick(CITY_RENEWAL_AREA_LIST, i) : undefined;
    const statuses = GEN_STATUSES[library];
    const implementOrgList =
      i % 3 === 2 ? [] : [pick(IMPLEMENT_ORG_LIST, i), ...(i % 4 === 0 ? [pick(IMPLEMENT_ORG_LIST, i + 2)] : [])];
    const fiveReformType = pick(FIVE_REFORM_TYPE_OPTIONS, i).value;
    return {
      projectCode: String(20263555 - i),
      projectName:
        GEN_NAMES[i % GEN_NAMES.length] +
        (i < GEN_NAMES.length ? '' : i < GEN_NAMES.length * 2 ? '（二期）' : '（三期）'),
      projectApprovalCode: i % 3 === 0 ? `2310-420103-04-01-6704${String(100 + i)}` : '',
      district,
      projectAffiliation: affiliation,
      renewalAreaName: cityArea
        ? cityArea.name
        : affiliation === 'district-area'
          ? pick(DISTRICT_RENEWAL_AREA_LIST, i)
          : '',
      functionOrientationList: cityArea ? cityArea.orientationList : [],
      renewalAreaBatch: cityArea ? cityArea.batch : '',
      fiveReformType,
      fiveReformSubType: pick(FIVE_REFORM_SUB_TYPE_MAP[fiveReformType] ?? [], i),
      sixBringTypeList: i % 2 === 0 ? [pick(SIX_BRING_TYPE_OPTIONS, i)] : [],
      mainConstructionContent: pick(GEN_MAIN_CONTENTS, i),
      constructionSite: `${district}${pick(GEN_STREETS, i)}`,
      totalInvestEstimate: Number(((((i * 37) % 1200) / 100 + 0.3) * 2.5).toFixed(2)),
      investEstimate: Number((((i * 37) % 1200) / 100 + 0.3).toFixed(4)),
      fundSourceList: [pick(FUND_SOURCE_ALL, i), ...(i % 3 === 0 ? [pick(FUND_SOURCE_ALL, i + 4)] : [])],
      fundSituationRemark: i % 3 === 1 ? pick(GEN_MAIN_CONTENTS, i + 1) : '',
      industrySupervisionDeptList,
      responsibleDept: `${district}住更局`,
      coordinateOrgList: i % 2 === 1 ? [pick(COORDINATE_ORG_LIST, i)] : [],
      implementOrgList,
      reportOrg: implementOrgList[0] ?? '',
      reportPerson: i % 2 === 1 ? pick(GEN_PERSONS, i) : '',
      reportPhone: i % 2 === 1 ? `1590277${String(1000 + i).padStart(4, '0')}` : '',
      remarks: '',
      library,
      status: statuses[i % statuses.length],
      inLibraryDate: pick(['2026-03-18', '2025-11-30', '2026-05-06'], i),
      ...(library === 'exited'
        ? {
            exitedFrom: GEN_EXIT_FROM[i % GEN_EXIT_FROM.length],
            exitDate: GEN_EXIT_DATES[i % GEN_EXIT_DATES.length],
            exitReason: GEN_EXIT_REASONS[i % GEN_EXIT_REASONS.length],
          }
        : {}),
      // 立项审批或核准备案文件：i%3===0 的行预置 1-2 个文件
      ...(i % 3 === 0
        ? {
            projectApprovalOrFilingFileList: (i % 6 === 0
              ? GEN_APPROVAL_FILE_NAMES.slice(0, 2)
              : GEN_APPROVAL_FILE_NAMES.slice(0, 1)
            ).slice(),
          }
        : {}),
      // 国土空间规划符合情况：偶数行给是否结论，i%5===0 附一个文件
      complyTerritorialSpacePlan: i % 2 === 0 ? (i % 4 === 0 ? '是' : '否') : undefined,
      involvePlanAdjustment: i % 2 === 0 ? (i % 6 === 0 ? '是' : '否') : undefined,
      ...(i % 5 === 0 ? { territorialSpacePlanFileList: ['国土空间规划符合性核查意见.pdf'] } : {}),
      // 项目实施方案文件：i%4===1 的行预置一个
      ...(i % 4 === 1 ? { projectImplementationPlanFileList: ['项目实施方案（评审稿）.pdf'] } : {}),
      // 地理数据：i%3===1 的行预置示例红线
      ...(i % 3 === 1 ? { locationGeoJson: SAMPLE_LOCATION_GEO_JSON, locationFileName: '项目红线.shp' } : {}),
      // 联合审查：按本项目已选行业主管部门逐机构出具（轮转覆盖四个区块，部分留未审查）
      ...((): Record<string, ProjectReviewEntryMap | undefined> => {
        function buildMap(pattern: boolean, seed: number): ProjectReviewEntryMap | undefined {
          if (!pattern) return undefined;
          return Object.fromEntries(
            industrySupervisionDeptList.map((org, k) => [
              org,
              (i + seed + k) % 4 === 3
                ? { result: '', opinion: '' }
                : {
                    result: pick(REVIEW_RESULT_OPTIONS, i + seed + k),
                    opinion: (i + seed + k) % 2 === 0 ? '材料齐备，同意通过。' : '',
                  },
            ]),
          );
        }
        return {
          approvalOrFilingReviewMap: buildMap(i % 2 === 0, 0),
          territorialSpacePlanReviewMap: buildMap(i % 3 === 0, 1),
          projectImplementationPlanReviewMap: buildMap(i % 2 === 1, 2),
          geoDataReviewMap: buildMap(i % 3 === 1, 3),
        };
      })(),
    };
  }),
];

/** 本地过滤（无后端：查询/重置/统计卡点选都走这里） */
export function filterProjects(params: ProjectLibraryQuery): ProjectLibraryItem[] {
  const keyword = (params.projectName ?? '').trim();
  const year =
    params.inLibraryYear === undefined || params.inLibraryYear === '' ? undefined : String(params.inLibraryYear);
  return PROJECTS.filter(
    (item) =>
      (!params.library || item.library === params.library) &&
      (!keyword || item.projectName.includes(keyword)) &&
      (!params.district || item.district === params.district) &&
      (!params.fiveReformType || item.fiveReformType === params.fiveReformType) &&
      (!params.status || item.status === params.status) &&
      (!params.projectAffiliation || item.projectAffiliation === params.projectAffiliation) &&
      (!year || item.inLibraryDate.startsWith(year)),
  );
}
