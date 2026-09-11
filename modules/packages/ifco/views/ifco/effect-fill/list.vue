<!--
  ifco —— 项目实施成效填报（/ifco/effect-fill/list）

  与项目进展填报（progress-fill）的结构差异（后端定案）：
  - **没有类目维度**：不分一级/二级类目 tab、没有总览 tab；
    一张转置表直接填写各项目的全部成效指标（行 = 全部指标，列 = 项目）。
  - 「一、～八、」八个节标题行仅作长表分组展示（加粗、不填写），不是类目表头；
  - 「数|面积」双值行(226/227/245/246)：后端拆 a/b 两键，本页合并为一行两个输入框；
  - 全部数据行直接填报（InputNumber），无汇总行/count 行/合计级录入行，
    「其中：/合计中：」仅为名称前缀与视觉层级，不参与自动求和；
  - 数据按「年份 × 季度 × 报送单位」组织（默认第一个有权限的单位），
    带入标记成效域独立计数（与进展域互不影响）。

  对接后端 modules/ifco（接口文档 v4 第 4 节）：
  - 进入页面拉成效指标字典 + 单位（复用进展域字典接口）+ 整包填报数据；
  - 保存按项目列颗粒度（saveEffectProject，双值拆 a/b 两键提交）；
    编辑完一列点列头对钩即存，顶部「保存」把全部脏列依次落库；
  - 删除有 id 的列调 deleteEffectProject；带入调 bringIn（服务端限一次）。

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
          <Select v-model:value="year" :options="yearOptions" class="ml-2 w-28" @change="handleFilterChange" />
          <span class="ml-6 text-gray-500">填报季度</span>
          <Select v-model:value="quarter" :options="QUARTER_OPTIONS" class="ml-2 w-28" @change="handleFilterChange" />
          <template v-if="reportUnitOptions.length > 1">
            <span class="ml-6 text-gray-500">项目报送单位</span>
            <Select
              v-model:value="reportUnit"
              :options="reportUnitOptions"
              placeholder="请选择"
              show-search
              option-filter-prop="label"
              class="ml-2 w-52"
              @change="handleFilterChange"
            />
            <span v-if="!unitEditable" class="ml-2 text-orange-500">只读查看</span>
          </template>
        </div>
        <div class="flex items-center">
          <a-button type="primary" v-if="unitEditable" @click="handleAddProject">
            <Icon icon="i-fluent:add-12-filled" /> 新增
          </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button v-if="unitEditable" type="primary" class="ml-2" :loading="saving" @click="handleSave">
            保存
          </a-button>
        </div>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <template #extra>
          <a-button v-if="unitEditable" size="small" :disabled="loading" @click="handleBringIn">
            带入上一季度填写的项目列
          </a-button>
      </template>
      <div ref="tableWrapRef">
        <Table
          :columns="tableColumns"
          :data-source="FILL_ROWS"
          :loading="loading"
          :scroll="{ x: scrollX, y: TABLE_HEIGHT }"
          :components="TABLE_COMPONENTS"
          :pagination="false"
          bordered
          size="small"
          row-key="key"
        />
      </div>
    </Card>

    <Modal v-model:open="bringModalOpen" title="带入上一季度填写的项目列" centered :footer="null" width="800">
      <div class="pt-2 text-gray-600">
        为方便用户填写，系统设计了带入上一季度填写的项目列功能，用户可直接在同名项目列上更新数据。
      </div>
      <div class="mt-5 flex items-center justify-between gap-3">
        <a-button color="danger" variant="solid" :disabled="bringing" @click="handleForceBringIn">
          强制带入，覆盖数据
        </a-button>
        <div class="flex flex-col gap-2">
          <a-button type="primary" :loading="bringing" @click="doBringIn('normal')"> 带入上一季度填写的项目列 </a-button>
          <a-button :disabled="bringing" @click="doBringIn('names')"> 仅带入项目名称，值由我自己填写 </a-button>
        </div>
      </div>
    </Modal>

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
  import { computed, h, nextTick, onMounted, reactive, ref } from 'vue';
  import { Card, Input, InputNumber, Modal, Popconfirm, Select, Table, Tooltip } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { ProjectColumn } from '@jeesite/ifco/api/ifco/common';
  import { QUARTER_OPTIONS } from '@jeesite/ifco/api/ifco/common';
  import type { EffectIndicatorDef, EffectUnitData } from '@jeesite/ifco/api/ifco/effect-fill';
  import {
    EFFECT_INDICATORS,
    EFFECT_INDICATOR_MAP,
    UNITS,
    bringInPrevPeriod,
    cellValue,
    deleteEffectProject,
    ensureEffectDicts,
    loadEffectFillData,
    quarterLabel,
    rowTotal,
    saveEffectProject,
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
  /** 项目报送单位(存单位编码;默认第一个有权限的单位) */
  const reportUnit = ref<string>();
  const reportUnitOptions = computed(() => UNITS.map((unit) => ({ label: unit.name, value: unit.code })));
  /** 当前所选单位是否可填报(false=主管单位只读查看其他单位,隐藏全部写入口) */
  const unitEditable = computed(() => UNITS.find((unit) => unit.code === reportUnit.value)?.editable !== false);

  // ── 数据加载:字典一次 + (年份×季度×单位)整包(成效域无类目维度) ────────
  const loading = ref(false);
  const unitData = ref<EffectUnitData>();
  const broughtIn = ref(false);

  async function loadFill() {
    if (!reportUnit.value) return;
    loading.value = true;
    try {
      const res = await loadEffectFillData(year.value, quarter.value, reportUnit.value);
      unitData.value = res.unitData;
      broughtIn.value = res.broughtIn;
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载成效填报数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      await ensureEffectDicts();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载字典失败');
      return;
    }
    if (!reportUnit.value) reportUnit.value = UNITS[0]?.code;
    await loadFill();
  });

  // ── 编辑态:同时仅一列;脏列跟踪(顶部「保存」统一落库) ─────────────────
  const editingColKey = ref<string>();
  const saving = ref(false);
  let addSeq = 0;
  const dirtyCols = new Map<string, ProjectColumn>();

  function resetEditState() {
    editingColKey.value = undefined;
  }

  /** 筛选条件变化:丢弃未保存的编辑并整包重载 */
  /** 筛选条件变化:未保存修改先确认再丢弃,确认后整包重载 */
  function handleFilterChange() {
    if (dirtyCols.size) {
      Modal.confirm({
        title: '有未保存的修改',
        content: `当前有 ${dirtyCols.size} 个项目列的修改尚未保存，切换年份/季度/单位后将丢弃。确定切换吗？`,
        okText: '丢弃并切换',
        cancelText: '继续编辑',
        onOk: () => {
          resetEditState();
          dirtyCols.clear();
          loadFill();
        },
      });
      return;
    }
    resetEditState();
    dirtyCols.clear();
    loadFill();
  }

  /** 单列落库:双值行二元组拆回 a/b 两键(仅 fill 行键提交,值全量同步) */
  async function persistColumn(col: ProjectColumn) {
    const res = await saveEffectProject({
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value!,
      project: { id: col.id, name: col.name, values: col.values },
    });
    if (!col.id) {
      const tempKey = col.key;
      col.id = res.projectId;
      col.key = res.projectId;
      if (editingColKey.value === tempKey) editingColKey.value = res.projectId;
      if (colWidths[tempKey] !== undefined) {
        colWidths[res.projectId] = colWidths[tempKey]!;
        delete colWidths[tempKey];
      }
      dirtyCols.delete(tempKey);
    }
    dirtyCols.delete(col.key);
  }

  /** 切换前自动落库:把当前全部脏列依次保存;失败列保留在登记中并提示 */
  async function autoPersistDirty() {
    if (!dirtyCols.size) return;
    let failed = 0;
    let firstError = '';
    for (const [, col] of [...dirtyCols]) {
      try {
        await persistColumn(col);
      } catch (e: unknown) {
        failed += 1;
        firstError ||= e instanceof Error ? e.message : '保存失败';
      }
    }
    if (failed > 0) {
      showMessage(`自动保存：有 ${failed} 列失败（${firstError}），该列仍待保存，可点顶部「保存」重试`);
    }
  }

  // ── 新增项目:居中 Modal 命名,确认后追加最右列并滚动到位 ──────────────
  const addModalOpen = ref(false);
  const newProjectName = ref('');
  const tableWrapRef = ref<HTMLDivElement>();

  function handleAddProject() {
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    newProjectName.value = '';
    addModalOpen.value = true;
  }

  async function handleAddConfirm() {
    const name = newProjectName.value.trim();
    if (!name) {
      showMessage('请输入项目名称');
      return;
    }
    if (!unitData.value) return;
    // 新列进入编辑前,先把之前未保存的脏列自动落库
    await autoPersistDirty();
    addSeq += 1;
    const col = reactive<ProjectColumn>({ key: `add-${addSeq}`, name, imported: false, values: {} });
    unitData.value.projects.push(col);
    dirtyCols.set(col.key, col);
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

  async function handleDeleteColumn(col: ProjectColumn) {
    if (!unitData.value) return;
    if (col.id) {
      try {
        await deleteEffectProject(col.id);
      } catch (e: unknown) {
        showMessage(e instanceof Error ? e.message : '删除失败');
        return;
      }
    }
    unitData.value.projects = unitData.value.projects.filter((item) => item.key !== col.key);
    dirtyCols.delete(col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  // ── 带入上一季度(服务端复制;成效域独立计数,普通模式每周期×单位限一次) ─
  const bringModalOpen = ref(false);
  const bringing = ref(false);

  function handleBringIn() {
    if (!reportUnit.value || loading.value) return;
    bringModalOpen.value = true;
  }

  /** 执行带入(普通/仅名称/强制):先自动落库脏列,成功后整包重载 */
  async function doBringIn(mode: 'normal' | 'names' | 'force') {
    if (bringing.value || !reportUnit.value) return;
    if (mode === 'normal' && broughtIn.value) {
      showMessage('已执行过数据带入');
      return;
    }
    bringing.value = true;
    try {
      await autoPersistDirty();
      const res = await bringInPrevPeriod({
        year: year.value,
        quarter: quarter.value,
        unit: reportUnit.value,
        force: mode === 'force',
        namesOnly: mode === 'names',
      });
      if (mode === 'names') {
        showMessage(
          `已带入 ${res.fromYear} 年${quarterLabel(res.fromQuarter)}的项目名称 ${res.broughtProjectCount} 列（值留空，由您填写）`,
        );
      } else {
        const parts = [`新增 ${res.broughtProjectCount} 列`];
        if (res.overwrittenProjectCount) parts.push(`覆盖同名 ${res.overwrittenProjectCount} 列`);
        if (res.skippedProjectCount) parts.push(`跳过同名 ${res.skippedProjectCount} 列`);
        showMessage(
          `已${mode === 'force' ? '强制' : ''}带入 ${res.fromYear} 年${quarterLabel(res.fromQuarter)}数据（${parts.join('，')}）`,
        );
      }
      bringModalOpen.value = false;
      resetEditState();
      dirtyCols.clear();
      await loadFill();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '带入失败');
    } finally {
      bringing.value = false;
    }
  }

  /** 强制带入:二次确认(覆盖同名项目列数据) */
  function handleForceBringIn() {
    Modal.confirm({
      title: '强制带入确认',
      content: '本季度同名项目列的数值将被上一季度数据覆盖，当前已修改的内容会丢失，确定继续吗？',
      okText: '强制带入',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => doBringIn('force'),
    });
  }

  /** 顶部保存:把全部脏列依次落库 */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`暂无修改，${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报数据已是最新`);
      return;
    }
    saving.value = true;
    let failed = 0;
    let firstError = '';
    for (const col of [...dirtyCols.values()]) {
      try {
        await persistColumn(col);
      } catch (e: unknown) {
        failed += 1;
        firstError ||= e instanceof Error ? e.message : '保存失败';
      }
    }
    saving.value = false;
    resetEditState();
    if (failed > 0) {
      showMessage(`有 ${failed} 列保存失败：${firstError}`);
    } else {
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目实施成效填报（共 ${dirtyCount} 个项目列）`);
    }
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

  // ── 表格行(全部指标,含节标题行;字典加载后填充) ──────────────────────
  const FILL_ROWS = computed<FillRow[]>(() =>
    EFFECT_INDICATORS.map((item) => ({
      key: item.key,
      kind: item.kind,
      name: item.name,
      unit: item.unit,
      code: item.code,
    })),
  );

  const tableCardTitle = computed(() => {
    const period = `${year.value}年 ${quarterLabel(quarter.value)}`;
    const unitName = UNITS.find((unit) => unit.code === reportUnit.value)?.name;
    return unitName ? `${period} ${unitName} · 项目实施成效` : `${period} 项目实施成效`;
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
    dirtyCols.set(col.key, col);
  }

  /** 双值格写入:按位落到二元组 */
  function setDualCellValue(col: ProjectColumn, indicatorKey: string, slot: 0 | 1, value: number | undefined) {
    const current = col.values[indicatorKey];
    const tuple: [number, number] = Array.isArray(current) ? [...current] : [0, 0];
    tuple[slot] = value ?? 0;
    col.values[indicatorKey] = tuple;
    dirtyCols.set(col.key, col);
  }

  // ── 单元格键盘导航:Enter/↓ = 下一个可填单元格,↑ = 上一个 ──────────────
  // 仅编辑列纵向跳(其它列没有输入框),自动跳过汇总/说明等只读行;
  // 双值格(数|面积)同行两框先左右衔接,行尾再跳下一行;
  // 捕获阶段拦截并阻断冒泡,抢在 InputNumber 自身的上下键调值之前。

  function focusCellInput(el: HTMLElement) {
    el.focus();
    (el as HTMLInputElement).select?.();
  }

  function handleCellNav(e: KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    e.stopPropagation();
    const cur = e.target as HTMLInputElement;
    const row = cur.closest('tr');
    if (!row) return;
    const down = e.key !== 'ArrowUp';
    const rowInputs = Array.from(row.querySelectorAll('input'));
    const inRowNext = down ? rowInputs[rowInputs.indexOf(cur) + 1] : rowInputs[rowInputs.indexOf(cur) - 1];
    if (inRowNext) {
      focusCellInput(inRowNext);
      return;
    }
    let r: HTMLElement | null = row;
    while ((r = (down ? r.nextElementSibling : r.previousElementSibling) as HTMLElement | null)) {
      const list = Array.from(r.querySelectorAll('input'));
      const target = down ? list[0] : list[list.length - 1];
      if (target) {
        focusCellInput(target);
        return;
      }
    }
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
        return h('div', { class: 'flex w-full items-center gap-1', onKeydownCapture: handleCellNav }, [
          dualInput(0, '数'),
          h('span', { class: 'shrink-0 text-gray-400' }, '|'),
          dualInput(1, '面积'),
        ]);
      }
      return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
        h(InputNumber, {
          size: 'small',
          class: 'w-full',
          value: typeof value === 'number' ? value : undefined,
          min: 0,
          controls: false,
          placeholder: '请输入',
          'onUpdate:value': (value2: number | string | null) => setCellValue(col, item.key, value2 ?? undefined),
        }),
      ]);
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon(点击即存该列);只读单位不渲染图标 */
  function renderProjectHeader(col: ProjectColumn) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      unitEditable.value
        ? h('span', { class: 'flex shrink-0 items-center gap-1' }, [
            h(Tooltip, { title: editing ? '完成并保存本列' : '编辑本列' }, () =>
              h(Icon, {
                icon: editing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
                class: 'effect-fill-icon-edit',
                onClick: () => toggleEdit(col),
              }),
            ),
            deletable
              ? h(
                  Popconfirm,
                  { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) },
                  () =>
                    h(Icon, {
                      icon: 'ant-design:delete-outlined',
                      class: 'effect-fill-icon',
                    }),
                )
              : null,
          ])
        : null,
    ]);
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑) */
  async function toggleEdit(col: ProjectColumn) {
    if (editingColKey.value === col.key) {
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(col);
        } catch (e: unknown) {
          showMessage(e instanceof Error ? e.message : '保存失败');
        } finally {
          saving.value = false;
        }
      }
      return;
    }
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    // 进入新列编辑前,先把之前未保存的脏列自动落库(填一列保存一列)
    await autoPersistDirty();
    editingColKey.value = col.key;
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
