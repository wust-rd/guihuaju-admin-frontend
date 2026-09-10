<!--
  ifco —— 项目实施成效填报（/ifco/effect-fill/list）

  与项目进展填报（progress-fill）的结构差异（用户定案）：
  - **没有类目维度**：不分一级/二级类目 tab、没有总览 tab；
    一张转置表直接填写各项目的全部成效指标（行 = 全部指标，列 = 项目）。
  - 「一、～八、」八个节标题行仅作长表分组展示（加粗、不填写），不是类目表头；
  - 「数|面积」双值行(226/227/245/246)拆为「…数」「…面积」两行，共用同一代码；
  - 全部数据行直接填报（InputNumber），无汇总行/count 行/合计级录入行，
    「其中：/合计中：」仅为名称前缀与视觉层级，不参与自动求和；
  - 数据按「年份 × 季度 × 报送单位」组织（默认市财政厅），存成效域独立仓库
    effectFillStore，与进展域互不影响。

  其余约定（列级编辑/新增项目 Modal+自动滚右/带入锁删/空值置空/奇偶淡青列/
  表格区域内滚动 scroll.y+固定指标名称列/Excel 导出）与进展填报一致，见 progress-fill/list.vue 头注释。

  菜单注册(菜单名称「项目成效填报」):
   - 链接地址:/ifco/effect-fill/list
   - 组件位置:/ifco/effect-fill/list(与链接地址一致)
-->
<template>
  <PageWrapper>
    <Card class="mb-3">
      <div class="flex flex-wrap items-center justify-between gap-y-2">
        <div class="flex items-center">
          <span class="text-gray-500">填报年份</span>
          <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" @change="resetEditState" />
          <span class="ml-6 text-gray-500">填报季度</span>
          <Select v-model:value="quarter" :options="QUARTER_OPTIONS" class="ml-2 w-28" @change="resetEditState" />
          <span class="ml-6 text-gray-500">项目报送单位</span>
          <Select
            v-model:value="reportUnit"
            :options="reportUnitOptions"
            placeholder="请选择"
            class="ml-2 w-32"
            @change="resetEditState"
          />
        </div>
        <div class="flex items-center">
          <a-button @click="handleAddProject"> 新增项目 </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button type="primary" class="ml-2" @click="handleSave"> 保存 </a-button>
        </div>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <template #extra>
        <Tooltip :title="bringInTooltip">
          <a-button size="small" :disabled="broughtIn" @click="handleBringIn"> 带入上一季度填写的项目列 </a-button>
        </Tooltip>
      </template>
      <div ref="tableWrapRef">
        <Table
          :columns="tableColumns"
          :data-source="FILL_ROWS"
          :scroll="{ x: scrollX, y: TABLE_HEIGHT }"
          :components="TABLE_COMPONENTS"
          :pagination="false"
          bordered
          size="small"
          row-key="key"
        />
      </div>
    </Card>

    <Modal v-model:open="addModalOpen" title="新增项目" centered @ok="handleAddConfirm">
      <div class="pt-2">
        <span class="text-gray-500">项目名称</span>
        <Input
          v-model:value="newProjectName"
          placeholder="请输入项目名称"
          allow-clear
          class="mt-2"
          @press-enter="handleAddConfirm"
        />
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoEffectFillList">
  import { computed, h, nextTick, reactive, ref, watchEffect } from 'vue';
  import { Card, Input, InputNumber, Modal, Popconfirm, Select, Table, Tooltip } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
  import {
    DEFAULT_REPORT_UNIT,
    QUARTER_OPTIONS,
    REPORT_UNITS,
    quarterLabel,
    toPeriodKey,
    prevPeriod,
  } from '@jeesite/ifco/api/ifco/common';
  import type { EffectIndicatorDef } from '@jeesite/ifco/api/ifco/effect-fill';
  import {
    EFFECT_INDICATORS,
    EFFECT_INDICATOR_MAP,
    cellValue,
    ensureEffectUnitData,
    getEffectUnitData,
    rowTotal,
  } from '@jeesite/ifco/api/ifco/effect-fill';
  import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
  import { exportEffectExcel } from './export-excel';

  /** 表格行(指标) */
  type FillRow = {
    key: string;
    kind: EffectIndicatorDef['kind'];
    name: string;
    unit: string;
    code: string;
  };

  const { showMessage } = useMessage();

  // ── 列宽拖拽(复用框架 ResizableTitle,同 sys/empUser):onHeaderCell 注入 resizable 与宽度回写 ──
  const TABLE_COMPONENTS = { header: { cell: ResizableTitle } };
  const colWidths = reactive<Record<string, number>>({});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resizableHeaderCell = (col: any): any => ({
    column: { ...col, resizable: true },
    onResize: (_event: MouseEvent, { size }: { size: { width: number } }) => {
      if (col.key) {
        colWidths[col.key] = size.width;
      }
    },
  });
  const widthFor = (key: string, defaultWidth: number) => colWidths[key] ?? defaultWidth;

  // ── 填报周期:年份 + 季度(默认当前) ──────────────────────────────────
  const yearOptions = (buildYearItems(3) as { key: string; label: string }[]).map((item) => ({
    label: item.label,
    value: Number(item.key),
  }));
  const year = ref(dateUtil().year());
  // dayjs 的 quarter() 需 quarterOfYear 插件，这里用 month() 推导当前季度
  const quarter = ref(String(Math.floor(dateUtil().month() / 3) + 1));
  /** 项目报送单位(武汉各行政区,数据维度:切换即切换数据集;默认第一个区) */
  const reportUnit = ref<string>(DEFAULT_REPORT_UNIT);
  const reportUnitOptions = REPORT_UNITS.map((name) => ({ label: name, value: name }));

  // ── 数据:周期 × 报送单位(成效域独立仓库,懒初始化;无类目维度) ──────────
  /** 已带入标记:`${周期key}|${单位}` → 是否已带入(各单位独立) */
  const broughtMap = reactive<Record<string, boolean>>({});

  watchEffect(() => {
    if (reportUnit.value) {
      ensureEffectUnitData(toPeriodKey(year.value, quarter.value), reportUnit.value);
    }
  });

  const unitData = computed(() => {
    const unit = reportUnit.value;
    return unit ? getEffectUnitData(toPeriodKey(year.value, quarter.value), unit) : undefined;
  });

  // ── 编辑态:同时仅一列 ───────────────────────────────────────────────
  const editingColKey = ref<string>();
  let addSeq = 0;
  let importSeq = 0;

  function resetEditState() {
    editingColKey.value = undefined;
  }

  // ── 新增项目:居中 Modal 命名,确认后追加最右列并滚动到位 ──────────────
  const addModalOpen = ref(false);
  const newProjectName = ref('');
  const tableWrapRef = ref<HTMLDivElement>();

  function handleAddProject() {
    newProjectName.value = '';
    addModalOpen.value = true;
  }

  function handleAddConfirm() {
    const name = newProjectName.value.trim();
    if (!name) {
      showMessage('请输入项目名称');
      return;
    }
    const data = currentUnitData();
    if (!data) return;
    addSeq += 1;
    const col: ProjectColumn = { key: `add-${addSeq}`, name, imported: false, values: {} };
    data.projects.push(col);
    addModalOpen.value = false;
    // 新增即填报:直接进入该列编辑,并把表格滚到最右露出新列
    editingColKey.value = col.key;
    nextTick(() => {
      const scroller = tableWrapRef.value?.querySelector('.ant-table-content, .ant-table-body');
      if (scroller) {
        scroller.scrollLeft = scroller.scrollWidth;
      }
    });
  }

  function handleDeleteColumn(col: ProjectColumn) {
    const data = currentUnitData();
    if (!data) return;
    data.projects = data.projects.filter((item) => item.key !== col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  /** 当前单位的数据(懒初始化) */
  function currentUnitData() {
    const unit = reportUnit.value;
    if (!unit) return undefined;
    return ensureEffectUnitData(toPeriodKey(year.value, quarter.value), unit);
  }

  // ── 带入上一季度(当前单位;连同数值;二三四带入列不可删,一季度可删) ─────
  const broughtKey = computed(() => `${toPeriodKey(year.value, quarter.value)}|${reportUnit.value ?? ''}`);
  const broughtIn = computed(() => broughtMap[broughtKey.value] === true);
  const bringInTooltip = computed(() =>
    quarter.value === '1'
      ? '带入上一年第四季度填报的项目列（含数值，带入列可删除）'
      : '带入本年度上一季度填报的项目列（含数值，带入列不可删除）',
  );

  function handleBringIn() {
    const unit = reportUnit.value;
    if (!unit || broughtMap[broughtKey.value]) return;
    const prev = prevPeriod(year.value, quarter.value);
    const source = ensureEffectUnitData(toPeriodKey(prev.year, prev.quarter), unit).projects;
    const current = ensureEffectUnitData(toPeriodKey(year.value, quarter.value), unit);
    importSeq += 1;
    current.projects.push(
      ...source.map((item) => ({
        key: `${item.key}-imp${importSeq}`,
        name: item.name,
        imported: true,
        // 双值行的二元组需逐格深拷贝,避免两周期共用同一数组引用
        values: Object.fromEntries(
          Object.entries(item.values).map(([k, v]) => [k, Array.isArray(v) ? ([...v] as [number, number]) : v]),
        ),
      })),
    );
    broughtMap[broughtKey.value] = true;
    resetEditState();
    showMessage(`已带入 ${prev.year} 年${quarterLabel(prev.quarter)}填报的项目列`);
  }

  function handleSave() {
    // 假数据阶段数值已实时写入内存,保存动作仅退出编辑态并给出反馈
    resetEditState();
    showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报`);
  }

  // ── 导出 ────────────────────────────────────────────────────────────
  const exporting = ref(false);

  async function handleExport() {
    if (exporting.value || !unitData.value) return;
    exporting.value = true;
    try {
      await exportEffectExcel({
        year: year.value,
        quarter: quarter.value,
        unitData: unitData.value,
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报`);
    } finally {
      exporting.value = false;
    }
  }

  // ── 表格行(全部指标,含节标题行) ─────────────────────────────────────
  const FILL_ROWS: FillRow[] = EFFECT_INDICATORS.map((item) => ({
    key: item.key,
    kind: item.kind,
    name: item.name,
    unit: item.unit,
    code: item.code,
  }));

  const tableCardTitle = computed(() => {
    const period = `${year.value}年 ${quarterLabel(quarter.value)}`;
    return reportUnit.value ? `${period} ${reportUnit.value} · 项目实施成效` : `${period} 项目实施成效`;
  });

  /** 节标题行(一、～八、)加粗;不落数值 */
  const sumRowOnCell = (record: FillRow) => ({
    className: record.kind === 'section' ? 'effect-fill-row-section' : undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0);双值行「数 | 面积」竖线留空隙 */
  function renderDisplay(value: number | string | [number, number] | undefined) {
    if (Array.isArray(value)) {
      const format = (v: number) => (v === 0 ? '' : String(v));
      // 竖线前后各留 4 个空格;用不间断空格(U+00A0)防止 HTML 空白折叠
      const gap = '\u00A0\u00A0';
      return `${format(value[0])}${gap}|${gap}${format(value[1])}`;
    }
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? String(value) : value;
  }

  function setCellValue(col: ProjectColumn, indicatorKey: string, value: number | string | undefined) {
    if (value === undefined || value === '') {
      delete col.values[indicatorKey];
    } else {
      col.values[indicatorKey] = value;
    }
  }

  /** 双值格写入:按位落到二元组 */
  function setDualCellValue(col: ProjectColumn, indicatorKey: string, slot: 0 | 1, value: number | undefined) {
    const current = col.values[indicatorKey];
    const tuple: [number, number] = Array.isArray(current) ? [...current] : [0, 0];
    tuple[slot] = value ?? 0;
    col.values[indicatorKey] = tuple;
  }

  /** 单元格:编辑列内的填报行渲染输入控件(双值行两个框中间固定竖线),其余为只读文本 */
  function renderFillCell(item: EffectIndicatorDef, col: ProjectColumn) {
    if (editingColKey.value === col.key && item.kind === 'fill') {
      const value = col.values[item.key];
      if (item.dual) {
        const tuple: [number, number] = Array.isArray(value) ? value : [0, 0];
        // 双值行的两个输入框等分:InputNumber 自身宽度样式会压过普通工具类,
        // UnoCSS 加 ! 前缀 = important,压过组件默认样式后 flex 等分才生效
        const dualInput = (slot: 0 | 1, placeholder: string) =>
          h(InputNumber, {
            size: 'small',
            class: '!flex-1 !min-w-0',
            value: tuple[slot] || undefined,
            min: 0,
            controls: false,
            placeholder,
            'onUpdate:value': (value2: number | string | null) =>
              setDualCellValue(col, item.key, slot, typeof value2 === 'number' ? value2 : undefined),
          });
        return h('div', { class: 'flex w-full items-center gap-1' }, [
          dualInput(0, '数'),
          h('span', { class: 'shrink-0 text-gray-400' }, '|'),
          dualInput(1, '面积'),
        ]);
      }
      return h(InputNumber, {
        size: 'small',
        class: 'w-full',
        value: typeof value === 'number' ? value : undefined,
        min: 0,
        controls: false,
        placeholder: '请输入',
        'onUpdate:value': (value2: number | string | null) => setCellValue(col, item.key, value2 ?? undefined),
      });
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon */
  function renderProjectHeader(col: ProjectColumn) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      h('span', { class: 'flex shrink-0 items-center gap-1' }, [
        h(Tooltip, { title: editing ? '完成编辑' : '编辑本列' }, () =>
          h(Icon, {
            icon: editing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
            class: 'effect-fill-icon-edit',
            onClick: () => toggleEdit(col),
          }),
        ),
        deletable
          ? h(Popconfirm, { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) }, () =>
              h(Icon, {
                icon: 'ant-design:delete-outlined',
                class: 'effect-fill-icon',
              }),
            )
          : null,
      ]),
    ]);
  }

  function toggleEdit(col: ProjectColumn) {
    editingColKey.value = editingColKey.value === col.key ? undefined : col.key;
  }

  const tableColumns = computed<TableColumnsType<FillRow>>(() => {
    const projects = unitData.value?.projects ?? [];
    const projectColumns: TableColumnsType<FillRow> = projects.map((col, index) => ({
      key: col.key,
      title: renderProjectHeader(col),
      width: widthFor(col.key, 140),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      // 奇偶列底色提升横向辨识度;编辑列高亮仍优先生效
      className:
        [
          index % 2 === 1 ? 'effect-fill-col-alt' : undefined,
          editingColKey.value === col.key ? 'effect-fill-col-editing' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderFillCell(EFFECT_INDICATOR_MAP[record.key]!, col),
    }));
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'effect-fill-col-name',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'unit',
        title: '计量单位',
        dataIndex: 'unit',
        width: widthFor('unit', 90),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'code',
        title: '代码',
        dataIndex: 'code',
        width: widthFor('code', 80),
        align: 'center',
        onHeaderCell: resizableHeaderCell,
      },
      {
        key: 'total',
        title: '合计',
        width: widthFor('total', 140),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) =>
          renderDisplay(rowTotal(EFFECT_INDICATOR_MAP[record.key]!, unitData.value)),
      },
      ...projectColumns,
    ];
  });

  /** 表格区域高度:视口自适应,表格内部纵向滚动(不依赖页面滚动,表头恒在视野) */
  const TABLE_HEIGHT = 'calc(100vh - 400px)';

  // 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和
  const scrollX = computed(() => {
    const projects = unitData.value?.projects ?? [];
    return (
      widthFor('name', 400) +
      widthFor('unit', 90) +
      widthFor('code', 80) +
      widthFor('total', 140) +
      projects.reduce((sum, col) => sum + widthFor(col.key, 140), 0)
    );
  });
</script>

<style>
  /* 节标题行(一、～八、)加粗,不加背景色 */
  .effect-fill-row-section {
    font-weight: 600;
  }

  /* 奇数项目列淡青底色(提升横向辨识度);优先级低于其后的编辑列样式 */
  .effect-fill-col-alt {
    background: #e6f7fa;
  }

  .effect-fill-col-editing {
    background: #f0f7ff;
  }

  .effect-fill-col-name {
    white-space: nowrap;
  }

  /* 编辑本列 icon 常驻蓝色;删除 icon 灰色、悬停变蓝 */
  .effect-fill-icon-edit {
    color: #1677ff;
    cursor: pointer;
  }

  .effect-fill-icon-edit:hover {
    color: #4096ff;
  }

  .effect-fill-icon {
    color: #8c8c8c;
    cursor: pointer;
  }

  .effect-fill-icon:hover {
    color: #1677ff;
  }
</style>
