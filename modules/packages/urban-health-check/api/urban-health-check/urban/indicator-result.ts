/**
 * 市住更局 —— 指标项结果 接口层（后端 modules/check，/cityCheck/indicatorResult + /dimensionResult）
 *
 * 统计行（statPage）：{id, code, year, indicatorName, indicatorCount, filledCount,
 *   unfilledCount, warningCount} —— 每套体系一行，为派生统计，只读。
 * 结果行（page）：Indicator 契约 + fillStatus/submitStatus（维度列由后端联查指标项表）。
 * 维度行（dimensionResult/page）：{id, dimName, layerCount, layerArea, shpFile}。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap, pageGet } from '../common';
import type { Indicator } from './indicator';

/** 指标项结果统计 实体（每体系一行，只读派生数据） */
export type IndicatorResult = {
  id?: string;
  code?: string; // 编码(对应指标体系编码,如 202601)
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(区级,武汉街道名)
  adminDivision?: string; // 行政区划(区级,武汉行政区名)
  functionPosition?: string[]; // 功能定位(区级,可多选,展示时拼接)
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量(项)
  filledCount?: number; // 已填报结果的指标数量(项)
  unfilledCount?: number; // 未填报结果的指标数量(项)
  warningCount?: number; // 预警指标数量(项)
  remarks?: string;
};

/** 指标项结果行（Indicator + 填报/提交状态） */
export type IndicatorResultRow = Indicator & {
  fillStatus?: number; // 1=已填报（指标值非空）
  submitStatus?: number; // 1=已提交（只读）
};

/** 一级维度行 */
export type DimensionRow = {
  id?: string;
  dimName?: string; // 一级维度名称
  layerCount?: number; // 图层对象数量
  layerArea?: number; // 图层覆盖面积(km²)
  shpFile?: string;
};

/** 分页查询填报统计（BasicTable api 直用；统计为派生数据只读，year/indicatorName → setYear/setName） */
export async function indicatorResultStatPage(params: Recordable) {
  const { year, indicatorName, ...rest } = params ?? {};
  return pageGet<IndicatorResult>(CHECK_API + '/indicatorResult/statPage', {
    ...rest,
    setYear: year,
    setName: indicatorName,
  });
}

/** 按体系编码取单行统计（show 页进度卡：filledCount/indicatorCount） */
export async function indicatorResultStatInfo(setCode: string): Promise<IndicatorResult> {
  const data = unwrap<{ total: number; list: IndicatorResult[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorResult/statPage',
      params: { setCode, pageNum: 1, pageSize: 1 },
    }),
  );
  return data.list?.[0] ?? ({} as IndicatorResult);
}

/** 拉取体系下全部指标项结果行（show 页指标项表：本地分页 + 维度合并） */
export async function indicatorResultListBySet(setCode: string): Promise<IndicatorResultRow[]> {
  const data = unwrap<{ total: number; list: IndicatorResultRow[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorResult/page',
      params: { setId: setCode, pageNum: 1, pageSize: 1000 },
    }),
  );
  return data.list ?? [];
}

/** 保存指标项结果（预警状态按评估结果自动计算，返回本次预警状态） */
export async function indicatorResultSave(
  data: Pick<Indicator, 'id' | 'indicatorValue' | 'standardValue' | 'evalResult'> & { remarks?: string },
): Promise<{ warningStatus: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorResult/save', data }));
}

/** 体系级提交（show 页"提交发布"：提交全部已填报完整且未提交的结果行） */
export async function indicatorResultSubmitSet(setCode: string): Promise<{ submitCount: number }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorResult/submitSet', data: { setCode } }));
}

/** 一级维度表（首次自动按体系指标项的一级维度同步生成） */
export async function dimensionListBySet(setCode: string): Promise<DimensionRow[]> {
  const data = unwrap<{ total: number; list: DimensionRow[] }>(
    await defHttp.get({
      url: CHECK_API + '/dimensionResult/page',
      params: { setId: setCode, pageNum: 1, pageSize: 1000 },
    }),
  );
  return data.list ?? [];
}

/** 保存一级维度图层信息（新增/修改合一；新增需传 dimName） */
export async function dimensionSave(data: Partial<DimensionRow> & { setCode: string }) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/dimensionResult/save', data }));
}
