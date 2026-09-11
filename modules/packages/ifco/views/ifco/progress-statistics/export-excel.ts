/**
 * ifco —— 项目进展统计：Excel 导出（xlsx-js-style 多 sheet + file-saver 下载）
 *
 * sheet 结构对齐统计页表格：
 *   固定 4 列（指标名称/计量单位/代码/总计）纵向合并两行表头 + 每个叶子类目一列
 *   （嵌套类目一级表头跨列包裹二级、简单类目纵向合并）；
 *   行 = 指标全集（名称含缩进、含「一、～」节标题行，节标题行仅名称列有值）。
 * 多单位场景由调用方逐单位拉取 stat/data 后传入：每个单位一个 sheet，
 * 「全武汉市」汇总（不带 unit 的聚合口径）作为第一个 sheet。
 * 数值纯数字输出（无千分位）；r3（其中：本年新开工）数值直出含 0；全表细边框。
 */
import { utils, write } from 'xlsx-js-style';
import type { CellObject, Range, WorkBook, WorkSheet } from 'xlsx-js-style';
import { saveAs } from 'file-saver';
import type { ProgressStatRow } from '@jeesite/ifco/api/ifco/progress-fill';
import { DATA_CATEGORIES, LEAF_CATEGORIES, quarterLabel } from '@jeesite/ifco/api/ifco/progress-fill';

type ExportParams = {
  year: number;
  quarter: string;
  /** 文件名后缀（单单位 = 单位名，如 江汉区局；全单位 = 全武汉市） */
  unitName?: string;
  /** 每个统计口径一个 sheet：名称 + 该口径的统计行 */
  sheets: { name: string; rows: ProgressStatRow[] }[];
};

/** 其中：本年新开工（开关型指标，数值直出含 0）；其余未填与 0 置空 */
const NEW_START_KEY = 'r3';

function numberOut(key: string, value: number | undefined): number | undefined {
  if (key === NEW_START_KEY) {
    return Number(value ?? 0);
  }
  return value === 0 ? undefined : value;
}

function buildStatSheet(rows: ProgressStatRow[]): WorkSheet {
  // ── 列布局：0~3 固定（指标名称/计量单位/代码/总计），其后每个叶子一列 ──
  let nextCol = 4;
  const catBlocks = DATA_CATEGORIES.map((category) => {
    const startCol = nextCol;
    const leaves = (category.children ?? [category]).map((leaf) => ({ key: leaf.key, startCol: nextCol++ }));
    return { category, leaves, startCol, endCol: nextCol - 1 };
  });
  const lastCol = Math.max(nextCol - 1, 3);

  const headerRow1: (string | number)[] = ['指标名称', '计量单位', '代码', '总计'];
  const headerRow2: (string | number)[] = ['', '', '', ''];
  const merges: Range[] = [0, 1, 2, 3].map((col) => ({ s: { r: 0, c: col }, e: { r: 1, c: col } }));
  for (const block of catBlocks) {
    if (block.category.children?.length) {
      // 嵌套类目：行 1 一级类目跨列，行 2 二级类目名
      headerRow1[block.startCol] = block.category.label;
      block.leaves.forEach((leaf) => {
        headerRow2[leaf.startCol] = LEAF_CATEGORIES.find((candidate) => candidate.key === leaf.key)?.label ?? '';
      });
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 0, c: block.endCol } });
    } else {
      // 简单类目：一级类目名纵向合并两行
      headerRow1[block.startCol] = block.category.label;
      merges.push({ s: { r: 0, c: block.startCol }, e: { r: 1, c: block.startCol } });
    }
  }

  const dataRows: (string | number | undefined)[][] = rows.map((row) => [
    row.name,
    row.unit || undefined,
    row.code || undefined,
    numberOut(row.key, row.grand),
    ...LEAF_CATEGORIES.map((leaf) => numberOut(row.key, row.categories[leaf.key])),
  ]);

  const worksheet = utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
  worksheet['!merges'] = merges;
  worksheet['!cols'] = Array.from({ length: lastCol + 1 }, (_, col) => {
    if (col === 0) return { wch: 42 };
    if (col === 1) return { wch: 10 };
    if (col === 2) return { wch: 8 };
    if (col === 3) return { wch: 14 };
    return { wch: 12 };
  });

  // 全表细边框；未填的值在 AOA 中没有单元格对象，补空单元格让边框完整覆盖
  const thin = { style: 'thin', color: { rgb: '000000' } };
  const area = utils.decode_range(worksheet['!ref']!);
  for (let row = area.s.r; row <= area.e.r; row += 1) {
    for (let col = area.s.c; col <= area.e.c; col += 1) {
      const address = utils.encode_cell({ r: row, c: col });
      const cell = ((worksheet[address] as CellObject | undefined) ?? { t: 's', v: '' }) as CellObject;
      cell.s = { ...(cell.s ?? {}), border: { top: thin, bottom: thin, left: thin, right: thin } };
      worksheet[address] = cell;
    }
  }
  return worksheet;
}

export async function exportProgressStatExcel({ year, quarter, unitName, sheets }: ExportParams): Promise<void> {
  const workbook: WorkBook = {
    SheetNames: sheets.map((sheet) => sheet.name),
    Sheets: Object.fromEntries(sheets.map((sheet) => [sheet.name, buildStatSheet(sheet.rows)])),
  };
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `项目进展统计_${year}年${quarterLabel(quarter)}${unitName ? `_${unitName}` : ''}.xlsx`,
  );
}
