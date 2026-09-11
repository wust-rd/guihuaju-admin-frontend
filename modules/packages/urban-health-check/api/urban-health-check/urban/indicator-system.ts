/**
 * 市住更局 —— 体检指标体系 接口层（后端 modules/check，/cityCheck/indicatorSet）
 *
 * 响应协议与分页映射见 ../common.ts；行字段即后端序列化的前端契约：
 * {id, code(sys_no), year, indicatorName, indicatorCount, reportUnit,
 *  reportDate, enabled('0'/'1'), submitStatus('0'/'1'), remarks}
 * 保存/启停/提交/删除传主键 id（列表行携带），下钻路由传 code。
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { dateUtil } from '@jeesite/core/utils/dateUtil';
import { CHECK_API, unwrap, pageGet } from '../common';

/** 提交状态：0 待提交，1 已提交 */
export const SUBMIT_STATUS = {
  PENDING: '0',
  SUBMITTED: '1',
} as const;

/** 启用状态：0 停用，1 启用 */
export const ENABLED_STATUS = {
  DISABLED: '0',
  ENABLED: '1',
} as const;

/** 体检年份下拉选项（近 5 年，按当前年份动态生成，倒序） */
export const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => {
  const year = String(dateUtil().year() - i);
  return { label: `${year} 年`, value: year };
});

/** 体检指标体系 实体 */
export type IndicatorSystem = {
  // 业务字段
  code?: string; // 业务编码 sys_no（如 202601，下钻路由 {id} 用）
  year?: string; // 体检年份
  surveyArea?: string; // 体检片区(区级,武汉街道名)
  adminDivision?: string; // 行政区划(区级,武汉行政区名)
  functionPosition?: string[]; // 功能定位(区级,可多选:TOD/COD/HOD/IOD/EOD,展示时拼接)
  indicatorName?: string; // 指标体系名称
  indicatorCount?: number; // 指标数量（项，用户声明的"系统指标项"）
  reportUnit?: string; // 填报单位
  reportDate?: string; // 填报时间（yyyy-MM-dd）
  enabled?: string; // 启用状态（0 停用，1 启用）
  submitStatus?: string; // 提交状态（0 待提交，1 已提交）
  // JeeSite 通用字段
  id?: string;
  status?: string;
  remarks?: string;
  createBy?: string;
  createDate?: string;
  updateBy?: string;
  updateDate?: string;
};

/** 列表实体（用于接口返回） */
export type IndicatorSystemData = IndicatorSystem & {
  rowNum?: number; // 序号（前端计算行号用）
};

/** 列表查询参数 */
export type IndicatorSystemQuery = {
  pageNo?: number;
  pageSize?: number;
  year?: string; // 体检年份
  indicatorName?: string; // 指标体系名称
};

/** 分页查询（BasicTable api 直用；搜索字段 year/indicatorName → 后端 setYear/setName） */
export async function indicatorSystemPage(params: Recordable) {
  const { year, indicatorName, ...rest } = params ?? {};
  return pageGet<IndicatorSystemData>(CHECK_API + '/indicatorSet/page', {
    ...rest,
    setYear: year,
    setName: indicatorName,
  });
}

/** 体系详情（idOrCode：主键或业务编码 sys_no；含 itemList 指标项列表） */
export async function indicatorSystemInfo(idOrCode: string): Promise<IndicatorSystem & { itemList?: any[] }> {
  return unwrap(await defHttp.get({ url: `${CHECK_API}/indicatorSet/${idOrCode}` }));
}

/** 保存体系（新增/修改合一：id 空新增，后端自动生成 code） */
export async function indicatorSystemSave(data: Partial<IndicatorSystem>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/save', data }));
}

/** 批量删除体系（级联删除指标项/资料清单；仅待提交可删） */
export async function indicatorSystemDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/delete', data: { ids } }));
}

/** 提交体系（提交后体系与指标项只读） */
export async function indicatorSystemSubmit(id: string) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorSet/submit', data: { id } }));
}

/** 启停用体系（enabled '1'=启用并自动停用其它体系，'0'=仅停用自身） */
export async function indicatorSystemEnable(id: string, enabled: string) {
  return unwrap(
    await defHttp.put({ url: CHECK_API + '/indicatorSet/enable', data: { id, enableStatus: Number(enabled) } }),
  );
}
