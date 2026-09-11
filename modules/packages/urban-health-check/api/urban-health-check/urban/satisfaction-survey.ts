/**
 * 市住更局 —— 满意度调查 接口层（后端 modules/check，/cityCheck/survey）
 *
 * 调查行：{id, code(sort_no), year, reportDate, dataSource, questionCount,
 *   validQuestionnaireCount, overallSatisfaction, submitStatus, remarks}
 * 问题行：{id, code(sort_no), questionName, target, 五档占比(合计100), remarks}
 * 综合满意度在提交时按五档加权(5~1)自动计算，不可手改。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 满意度调查(年度记录)实体 */
export type SatisfactionSurvey = {
  id?: string;
  code?: string; // 序号(sort_no，下钻路由 {id} 用)
  year?: string; // 调查年份
  reportDate?: string; // 填报时间(yyyy-MM-dd)
  dataSource?: string; // 数据来源(第三方调查机构 / 在线问卷平台 / 社区入户调查)
  questionCount?: number; // 调查问题数量(项；提交时按问题明细自动同步)
  validQuestionnaireCount?: number; // 有效调查问卷数(份)
  overallSatisfaction?: number; // 综合满意度(百分比数字，提交时按五档加权自动计算)
  submitStatus?: string; // 提交状态（0 待提交 / 1 已提交）
  remarks?: string;
};

/** 满意度调查问题(某年调查的下钻明细)实体 */
export type SurveyQuestion = {
  id?: string;
  code?: number | string; // 序号(sort_no)
  year?: string; // 所属调查年份
  questionName?: string; // 调查问题
  target?: string; // 面向对象(全体居民 / 社区居民 / 企业经营者)
  verySatisfied?: number; // 非常满意(%)
  satisfied?: number; // 满意(%)
  neutral?: number; // 一般(%)
  dissatisfied?: number; // 不满意(%)
  veryDissatisfied?: number; // 非常不满意(%)
  remarks?: string;
};

/** 分页查询调查（BasicTable api 直用；搜索字段 year → 后端 surveyYear） */
export async function surveyPage(params: Recordable) {
  const { year, ...rest } = params ?? {};
  return pageGet<SatisfactionSurvey>(CHECK_API + '/survey/page', { ...rest, surveyYear: year });
}

/** 调查详情（idOrCode：主键或序号；含 questionList 问题明细） */
export async function surveyInfo(idOrCode: string): Promise<SatisfactionSurvey & { questionList?: SurveyQuestion[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/survey/${idOrCode}` }));
}

/** 保存调查（新增/修改合一；调查年份每年一次唯一） */
export async function surveySave(data: Partial<SatisfactionSurvey>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/save', data }));
}

/** 批量删除调查（级联删除问题明细） */
export async function surveyDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/delete', data: { ids } }));
}

/** 提交调查（按五档加权自动计算综合满意度并写回，提交后只读） */
export async function surveySubmit(id: string): Promise<{ overallSatisfaction: number }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/survey/submit', data: { id } }));
}

/**
 * 问卷问题整单保存（先删旧再写新：编辑/删除单个问题 = 取当前列表改完后整单提交）
 * 五档占比任一档有值时合计必须为 100。
 */
export async function surveyQuestionSaveList(surveyId: string, items: Partial<SurveyQuestion>[]) {
  return unwrap(
    await defHttp.postJson({ url: CHECK_API + '/survey/question/saveList', data: { surveyId, items } }),
  );
}
