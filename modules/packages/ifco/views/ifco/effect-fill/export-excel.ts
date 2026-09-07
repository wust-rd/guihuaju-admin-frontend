/**
 * ifco —— 项目实施成效填报：Excel 导出（xlsx(SheetJS) 生成 + file-saver 下载）
 *
 * 成效填报无类目维度（用户定案），导出为单行表头的平铺表：
 *   指标名称 | 计量单位 | 代码 | 合计 | 各项目列…；
 * 表体为成效指标全集（含「一、～八、」节标题行，仅名称列有值，其余空白）。
 * 复用项目既有 xlsx 方案（同 progress-fill/export-excel.ts，见 AGENTS 文件下载约定）。
 */
import { utils, write } from 'xlsx';
import type { WorkBook, WorkSheet } from 'xlsx';
import { saveAs } from 'file-saver';
import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
import { quarterLabel } from '@jeesite/ifco/api/ifco/common';
import type { EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
import { EFFECT_INDICATORS, cellValue, rowTotal } from '@jeesite/ifco/api/ifco/effect-fill';

type ExportParams = {
  year: number;
  quarter: string;
  unitData: EffectUnitData;
};

export async function exportEffectExcel({ year, quarter, unitData }: ExportParams): Promise<void> {
  const projects: ProjectColumn[] = unitData.projects;

  // ── 组装 AOA（1 行表头 + 指标全集含节标题行） ────────────────────────
  const rows: (string | number | undefined)[][] = [
    ['指标名称', '计量单位', '代码', '合计', ...projects.map((project) => project.name)],
  ];
  /** 未填与 0 置空(与页面展示一致:不补斜杠、不补 0) */
  const blankZero = (value: number | string | undefined) => (value === 0 ? undefined : value);
  for (const item of EFFECT_INDICATORS) {
    const isSection = item.kind === 'section';
    const row: (string | number | undefined)[] = [
      item.name,
      isSection ? undefined : item.unit || undefined,
      item.code || undefined,
      isSection ? undefined : blankZero(rowTotal(item, unitData)),
    ];
    for (const project of projects) {
      row.push(isSection ? undefined : blankZero(cellValue(item, project)));
    }
    rows.push(row);
  }

  const worksheet: WorkSheet = utils.aoa_to_sheet(rows);

  // ── 列宽与数值千分位 ────────────────────────────────────────────────
  worksheet['!cols'] = [
    { wch: 42 },
    { wch: 10 },
    { wch: 8 },
    { wch: 14 },
    ...projects.map(() => ({ wch: 12 })),
  ];
  const range = utils.decode_range(worksheet['!ref'] ?? 'A1');
  for (let r = 1; r <= range.e.r; r += 1) {
    for (let c = 3; c <= range.e.c; c += 1) {
      const cell = worksheet[utils.encode_cell({ r, c })];
      if (cell && cell.t === 'n') {
        cell.z = '#,##0';
      }
    }
  }

  const workbook: WorkBook = {
    SheetNames: ['项目实施成效填报'],
    Sheets: { 项目实施成效填报: worksheet },
  };
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `项目实施成效填报_${year}年${quarterLabel(quarter)}.xlsx`,
  );
}
