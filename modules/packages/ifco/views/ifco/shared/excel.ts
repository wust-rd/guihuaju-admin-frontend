/**
 * ifco 导出共用 —— 带样式工作表构建（xlsx-js-style 分支，三个导出文件共用）
 *
 * SheetJS 社区版写 xlsx 不支持单元格样式，导出统一走 xlsx-js-style：
 * aoa 组表 + 合并单元格 + 列宽 + 全表细边框；未填的值在 AOA 中没有单元格对象，
 * 补空字符串单元格让边框完整覆盖（合并区域的隐藏格同理）。
 */
import { utils } from 'xlsx-js-style';
import type { CellObject, Range, WorkSheet } from 'xlsx-js-style';

/** 全表细边框样式（四边 thin 黑线） */
const THIN = { style: 'thin', color: { rgb: '000000' } };

/**
 * 组装带边框的工作表：AOA 行 + 合并规则 + 列宽数组
 *
 * @param rows  数据行（首行为表头行，由调用方拼好）
 * @param merges 合并单元格规则
 * @param colWidths 每列宽度（{wch}，长度须覆盖最后一列）
 */
export function finishBorderedSheet(
  rows: (string | number | undefined)[][],
  merges: Range[],
  colWidths: { wch: number }[],
): WorkSheet {
  const worksheet = utils.aoa_to_sheet(rows);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = colWidths;
  const area = utils.decode_range(worksheet['!ref']!);
  for (let row = area.s.r; row <= area.e.r; row += 1) {
    for (let col = area.s.c; col <= area.e.c; col += 1) {
      const address = utils.encode_cell({ r: row, c: col });
      const cell = ((worksheet[address] as CellObject | undefined) ?? { t: 's', v: '' }) as CellObject;
      cell.s = { ...(cell.s ?? {}), border: { top: THIN, bottom: THIN, left: THIN, right: THIN } };
      worksheet[address] = cell;
    }
  }
  return worksheet;
}

/** 生成"前几列固定宽度 + 其余同宽"的列宽数组 */
export function fixedPlusUniformCols(lastCol: number, fixed: number[], rest: number): { wch: number }[] {
  return Array.from({ length: lastCol + 1 }, (_, col) => ({
    wch: fixed[col] ?? rest,
  }));
}
