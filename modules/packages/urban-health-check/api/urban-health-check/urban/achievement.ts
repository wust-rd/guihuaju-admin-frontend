/**
 * 市住更局 —— 体检成果 接口层（后端 modules/check，/cityCheck/achievement）
 *
 * 目录行：{id, code(sort_no), year, catalog, reportDate, submitStatus, itemCount, remarks}
 * 明细行：{id, code(sort_no), catalogId, dim1, analysis, degree, remarks}（统一维度分析模型）
 * catalog 枚举（前端五类清单）：问题整治清单/发展机遇清单/更新诉求清单/基础资料库/更新项目储备建议库
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 程度范围 */
export const ACHIEVEMENT_DEGREE = {
  GENERAL: '一般',
  SEVERE: '严重',
  EXTREME: '特别严重',
} as const;

/** 体检成果目录枚举（五类清单） */
export const ACHIEVEMENT_CATALOGS = [
  '问题整治清单',
  '发展机遇清单',
  '更新诉求清单',
  '基础资料库',
  '更新项目储备建议库',
] as const;

/** 体检成果(目录)实体 */
export type Achievement = {
  id?: string;
  code?: string; // 序号(sort_no，下钻路由 {id} 用)
  year?: string; // 体检年份
  catalog?: string; // 体检成果目录(五类清单名)
  reportDate?: string; // 填报时间(yyyy-MM-dd)
  submitStatus?: string; // 提交状态(0 待提交 / 1 已提交，复用 indicator-system 的 SUBMIT_STATUS)
  itemCount?: number; // 明细条数
  remarks?: string;
};

/** 成果分析明细(某目录下的下钻记录)实体 */
export type AchievementAnalysis = {
  id?: string;
  code?: number | string; // 序号(sort_no)
  catalog?: string; // 所属体检成果目录
  catalogId?: string; // 所属目录主键
  dim1?: string; // 一级维度
  analysis?: string; // 分析描述
  degree?: string; // 程度范围(一般 / 严重 / 特别严重)
  remarks?: string;
};

/** 分页查询成果目录（BasicTable api 直用；year/catalog → 后端 setYear/achievementType） */
export async function achievementPage(params: Recordable) {
  const { year, catalog, ...rest } = params ?? {};
  return pageGet<Achievement>(CHECK_API + '/achievement/page', {
    ...rest,
    setYear: year,
    achievementType: catalog,
  });
}

/** 成果详情（idOrCode：主键或序号；含 detailList 维度分析明细） */
export async function achievementInfo(idOrCode: string): Promise<Achievement & { detailList?: AchievementAnalysis[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/achievement/${idOrCode}` }));
}

/** 保存成果目录（新增/修改合一） */
export async function achievementSave(data: Partial<Achievement>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/save', data }));
}

/** 批量删除成果（级联删除明细） */
export async function achievementDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/delete', data: { ids } }));
}

/** 提交成果（提交后只读） */
export async function achievementSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/submit', data: { id } }));
}

/** 拉取目录下全部分析明细（show 页表格 dataSource 用） */
export async function achievementDetailList(catalogIdOrCode: string): Promise<AchievementAnalysis[]> {
  const data = unwrap<{ total: number; list: AchievementAnalysis[] }>(
    await defHttp.get({
      url: CHECK_API + '/achievement/detail/page',
      params: { catalogId: catalogIdOrCode, pageNum: 1, pageSize: 1000 },
    }),
  );
  return data.list ?? [];
}

/** 保存分析明细（新增/修改合一） */
export async function achievementDetailSave(
  data: Partial<AchievementAnalysis> & { catalogId: string },
): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/detail/save', data }));
}

/** 批量删除分析明细 */
export async function achievementDetailDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/achievement/detail/delete', data: { ids } }));
}
