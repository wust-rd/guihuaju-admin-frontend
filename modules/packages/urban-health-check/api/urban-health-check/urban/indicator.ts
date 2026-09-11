/**
 * 市住更局 —— 指标(指标体系子项) 接口层（后端 modules/check，/cityCheck/indicatorItem）
 *
 * 行字段即后端序列化的前端契约：
 * {id, setId, systemCode(sys_no), code(item_no), dim1/2/3, indicatorName, unit,
 *  indicatorSource, dataSource, responsibleDept, remarks(指标说明), materialCount}
 */

import { defHttp } from '@jeesite/core/utils/http/axios';
import { CHECK_API, unwrap } from '../common';

/** 评估结果 */
export const EVAL_RESULT = {
  POOR: '较差',
  FAIR: '一般',
  GOOD: '较好',
  GREAT: '很好',
  NO_STANDARD: '无标准',
} as const;

/** 预警状态（保存时按评估结果自动计算，前端不可手改） */
export const WARNING_STATUS = {
  RED: '红色预警',
  YELLOW: '黄色预警',
  NORMAL: '正常',
  NONE: '无',
} as const;

/** 指标 实体(指标体系的子孙元素,按一/二/三级维度归属) */
export type Indicator = {
  id?: string;
  setId?: string; // 所属体系主键（保存时后端由 systemCode 解析）
  code?: string; // 序号(item_no)
  systemCode?: string; // 所属指标体系编码(如 202601)
  dim1?: string; // 一级维度(如 生态宜居)
  dim2?: string; // 二级维度(如 住房安全)
  dim3?: string; // 三级维度(可空:指标直接挂二级维度时留空)
  indicatorName?: string; // 指标项名称
  unit?: string; // 指标单位(项 / % / 平方米 / 万元 …)
  indicatorValue?: number; // 指标值(填报结果,数字；仅结果表有)
  standardValue?: number; // 标准值/目标值(数字;无标准的指标为空)
  evalResult?: string; // 评估结果(较差 / 一般 / 较好 / 很好 / 无标准)
  warningStatus?: string; // 预警状态(红色预警 / 黄色预警 / 正常 / 无；自动计算)
  indicatorSource?: string; // 指标来源((住建部)国家指标 / (省政府)省级指标 / (市政府)市级指标)
  dataSource?: string; // 数据来源((市XX局)部门报送 / 统计年鉴 / 城市体检信息平台)
  responsibleDept?: string; // 责任部门(无责任部门时填 /)
  remarks?: string;
};

/**
 * 拉取体系下全部指标项（show 页表格 dataSource 用：
 * 全量取回后前端本地分页 + 维度合并单元格计算，pageSize 取大值一次取全）
 */
export async function indicatorListBySet(systemCode: string): Promise<Indicator[]> {
  const data = unwrap<{ total: number; list: Indicator[] }>(
    await defHttp.get({
      url: CHECK_API + '/indicatorItem/page',
      params: { setId: systemCode, pageNum: 1, pageSize: 1000 },
    }),
  );
  return data.list ?? [];
}

/** 保存指标项（新增/修改合一；所属体系已提交后只读） */
export async function indicatorSave(data: Partial<Indicator>): Promise<{ id: string }> {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorItem/save', data }));
}

/** 批量删除指标项（级联删除资料清单） */
export async function indicatorDelete(ids: string[]) {
  return unwrap(await defHttp.postJson({ url: CHECK_API + '/indicatorItem/delete', data: { ids } }));
}
