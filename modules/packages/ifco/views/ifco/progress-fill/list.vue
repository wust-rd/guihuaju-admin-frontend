<!--
  ifco —— 项目进展填报（/ifco/progress-fill/list）

  页面结构:Card 工具栏(填报年份/填报季度/项目报送单位 | 新增项目/导出/保存)
  → 一级类目 RadioGroup(总览 + 8 大类,按钮样式,可换行)
  → 嵌套类目二级 RadioGroup(仅「老旧街区、老旧厂区、城中村等更新改造」)
  → 表格卡片(标题行右侧放「带入上一季度填写的项目列」按钮,仅非总览显示)
  → 转置填报表格:行 = 指标(第一列指标名称,缩进 = 层级 × 全角空格),列 = 项目。

  核心交互(对接后端 modules/ifco,契约见接口文档 v4):
  - 进入页面拉取字典(指标/类目/单位,单位已按数据权限过滤)+ 整包填报数据;
  - 默认整表为只读文本,点击项目列头「编辑」图标进入该列编辑态(同时仅一列;
    数值行 InputNumber,文字行 Input);自动行始终只读:
    4 个汇总行按构成行求和、「城市更新项目总数」= 项目列数(前端实时计算展示);
  - 「新增就业岗位」= 合计级录入行:指标名旁「编辑」弹 Modal 录合计值并即存(saveTotal);
  - 保存:编辑完一列点列头对钩图标即存该列(saveProject,值全量同步);
    顶部「保存」按钮把全部已修改列依次落库;新列保存后用返回的 projectId 替换临时 key;
  - 删除:有 id 的列调 deleteProject 后移除,未落库的临时列直接移除;
    二三四季度「带入」生成的列不可删,一季度带入上一年四季度的列可删;
  - 带入:调 bringIn(每周期×单位限一次,服务端校验),成功后整包重载;
  - 总览 tab 只读,按类目汇总:简单类目一列,嵌套类目拆三个二级子列,总计列固定第 4 列位。

  菜单注册(菜单名称「项目进展填报」):
   - 链接地址:/ifco/progress-fill/list
   - 组件位置:/ifco/progress-fill/list(与链接地址一致)
  指标清单与汇总口径见 @jeesite/ifco/api/ifco/progress-fill,Excel 导出见同目录 export-excel.ts。
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
          <a-button type="primary" v-if="!isOverview && unitEditable" @click="handleAddProject">
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
        <a-button v-if="unitEditable" :disabled="loading" @click="handleBringIn"> 带入上一季度填写的项目列 </a-button>
      </template>
      <RadioGroup
        v-model:value="activeCategory"
        :options="categoryOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
      <RadioGroup
        v-if="subOptions.length"
        v-model:value="activeSub"
        :options="subOptions"
        option-type="button"
        class="progress-fill-radios mb-2 flex flex-wrap"
      />
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

    <Modal v-model:open="bringModalOpen" title="带入上一季度填写的项目列" centered :footer="null" width="600">
      <div class="pt-2 text-gray-600">
        为方便用户填写，系统设计了带入上一季度填写的项目列功能，用户可直接在同名项目列上更新数据。
      </div>
      <div class="mt-12 flex items-end justify-between gap-3">
        <a-button type="primary" danger :disabled="bringing" @click="handleForceBringIn"> 强制带入，覆盖数据 </a-button>
        <div class="flex flex-col gap-2">
          <a-button :disabled="bringing" @click="doBringIn('names')"> 仅带入项目名称，值由我自己填写 </a-button>
          <a-button type="primary" :loading="bringing" @click="doBringIn('normal')">
            带入上一季度填写的项目列
          </a-button>
        </div>
      </div>
    </Modal>

    <Modal v-model:open="totalModalOpen" :title="totalModalTitle" centered @ok="handleTotalConfirm">
      <div class="pt-2">
        <span class="text-gray-500">合计值（个）</span>
        <InputNumber
          v-model:value="totalInput"
          :min="0"
          :precision="0"
          controls
          placeholder="请输入合计值"
          class="mt-2 w-full"
          @press-enter="handleTotalConfirm"
        />
        <div class="mt-2 text-xs text-gray-400">各项目单元格不填值，此处数值即本类目合计。</div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsIfcoProgressFillList">
  import { computed, h, nextTick, onMounted, reactive, ref, watch } from 'vue';
  import { Card, Input, InputNumber, Modal, Popconfirm, RadioGroup, Select, Switch, Table, Tooltip } from 'antdv-next';
  import type { TableColumnsType } from 'antdv-next';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { Icon } from '@jeesite/core/components/Icon';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import { buildYearItems } from '@jeesite/core/libs/year';
  import type { CategoryDef, IndicatorDef, PeriodFillData, ProjectColumn } from '@jeesite/ifco/api/ifco/progress-fill';
  import {
    CATEGORY_MAP,
    CATEGORIES,
    DATA_CATEGORIES,
    INDICATORS,
    INDICATOR_MAP,
    LEAF_CATEGORIES,
    QUARTER_OPTIONS,
    UNITS,
    bringInPrevPeriod,
    cellValue,
    deleteProgressProject,
    ensureProgressDicts,
    grandTotal,
    loadProgressFillData,
    quarterLabel,
    saveProgressProject,
    saveProgressTotal,
    tabTotal,
  } from '@jeesite/ifco/api/ifco/progress-fill';
  import ResizableTitle from '@jeesite/core/components/Table/src/components/ResizableTitle.vue';
  import { exportProgressFillExcel } from './export-excel';

  /** 表格行(指标) */
  type FillRow = {
    key: string;
    kind: IndicatorDef['kind'];
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
  /** 项目报送单位(存单位编码;切换即切换数据集;默认第一个有权限的单位) */
  const reportUnit = ref<string>();
  const reportUnitOptions = computed(() => UNITS.map((unit) => ({ label: unit.name, value: unit.code })));
  /** 当前所选单位是否可填报(false=主管单位只读查看其他单位,隐藏全部写入口) */
  const unitEditable = computed(() => UNITS.find((unit) => unit.code === reportUnit.value)?.editable !== false);

  // ── 类目选择:一级 + 嵌套二级 ────────────────────────────────────────
  const categoryOptions = computed(() => CATEGORIES.map((cat) => ({ label: cat.label, value: cat.key })));
  const activeCategory = ref('overview');
  const activeSub = ref<string>();
  const subOptions = computed(() =>
    (CATEGORY_MAP[activeCategory.value]?.children ?? []).map((item) => ({
      label: item.label,
      value: item.key,
    })),
  );
  // 嵌套类目切换时,二级默认选第一个叶子
  watch(subOptions, (options) => {
    if (options.length && !options.some((item) => item.value === activeSub.value)) {
      activeSub.value = options[0].value;
    }
  });

  /** 当前生效的叶子类目(总览返回 null) */
  const activeLeaf = computed(() => {
    if (activeCategory.value === 'overview') return null;
    const category = CATEGORY_MAP[activeCategory.value];
    return category?.children ? CATEGORY_MAP[activeSub.value ?? ''] : category;
  });
  const isOverview = computed(() => activeLeaf.value === null);

  // ── 数据加载:字典一次 + (年份×季度×单位)整包 ─────────────────────────
  const loading = ref(false);
  const periodData = ref<PeriodFillData>();
  const broughtIn = ref(false);

  async function loadFill() {
    if (!reportUnit.value) return;
    loading.value = true;
    try {
      const res = await loadProgressFillData(year.value, quarter.value, reportUnit.value);
      periodData.value = res.periodData;
      broughtIn.value = res.broughtIn;
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载填报数据失败');
    } finally {
      loading.value = false;
    }
  }

  onMounted(async () => {
    try {
      await ensureProgressDicts();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '加载字典失败');
      return;
    }
    if (!reportUnit.value) reportUnit.value = UNITS[0]?.code;
    await loadFill();
  });

  // ── 编辑态:同时仅一列;脏列跟踪(跨类目收集,顶部「保存」统一落库) ──────
  const editingColKey = ref<string>();
  const saving = ref(false);
  let addSeq = 0;
  /** 脏列登记:colKey → 所在叶子类目(保存时按 leafKey 提交) */
  const dirtyCols = new Map<string, { leafKey: string; col: ProjectColumn }>();

  function resetEditState() {
    editingColKey.value = undefined;
  }

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

  // 切换类目:先把未保存的脏列自动落库,再退出编辑态(填一列保存一列)
  watch([activeCategory, activeSub], async () => {
    await autoPersistDirty();
    resetEditState();
  });

  /** 单列落库:值全量同步语义;新列(无 id)保存后用返回的 projectId 回填 */
  async function persistColumn(leafKey: string, col: ProjectColumn) {
    const values: Record<string, number | string> = {};
    for (const item of INDICATORS) {
      if (item.kind !== 'fill' && item.kind !== 'text') continue;
      const value = col.values[item.key];
      if (value !== undefined && value !== '' && !Array.isArray(value)) values[item.key] = value;
    }
    const isNew = !col.id;
    const res = await saveProgressProject({
      year: year.value,
      quarter: quarter.value,
      unit: reportUnit.value!,
      leafKey,
      project: { id: isNew ? undefined : col.id, name: col.name, values },
    });
    if (isNew) {
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

  /** 切换前自动落库:把当前全部脏列(可跨类目)依次保存;失败列保留在登记中并提示 */
  async function autoPersistDirty() {
    if (!dirtyCols.size) return;
    let failed = 0;
    let firstError = '';
    for (const [, { leafKey, col }] of [...dirtyCols]) {
      try {
        await persistColumn(leafKey, col);
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
    const leaf = activeLeaf.value;
    if (!leaf || !periodData.value) return;
    // 新列进入编辑前,先把之前未保存的脏列自动落库
    await autoPersistDirty();
    const tab = periodData.value[leaf.key] ?? (periodData.value[leaf.key] = { projects: [], totals: {} });
    addSeq += 1;
    const col = reactive<ProjectColumn>({ key: `add-${addSeq}`, name, imported: false, values: {} });
    tab.projects.push(col);
    dirtyCols.set(col.key, { leafKey: leaf.key, col });
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

  // ── 合计级录入行(total,如新增就业岗位):指标名旁「编辑」弹 Modal 直接录合计值 ──
  const totalModalOpen = ref(false);
  const totalEditKey = ref<string>();
  const totalInput = ref<number>();

  function openTotalModal(indicatorKey: string) {
    if (!unitEditable.value) {
      showMessage('当前单位为只读查看，不可填报');
      return;
    }
    const leaf = activeLeaf.value;
    if (!leaf) return;
    totalEditKey.value = indicatorKey;
    totalInput.value = periodData.value?.[leaf.key]?.totals?.[indicatorKey];
    totalModalOpen.value = true;
  }

  async function handleTotalConfirm() {
    const leaf = activeLeaf.value;
    const key = totalEditKey.value;
    if (!leaf || !key || !reportUnit.value) return;
    const tab = periodData.value?.[leaf.key];
    if (!tab) return;
    if (!tab.totals) tab.totals = {};
    const value = totalInput.value ?? null;
    try {
      await saveProgressTotal({
        year: year.value,
        quarter: quarter.value,
        unit: reportUnit.value,
        leafKey: leaf.key,
        indicatorKey: key,
        value,
      });
      if (value === null) delete tab.totals[key];
      else tab.totals[key] = value;
      totalModalOpen.value = false;
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '保存合计值失败');
    }
  }

  /** 合计录入 Modal 的标题与字段名(去缩进) */
  const totalModalTitle = computed(() => {
    const item = totalEditKey.value ? INDICATOR_MAP[totalEditKey.value] : undefined;
    const name = (item?.name ?? '').trim();
    return name ? `${name}（合计）` : '填写合计值';
  });

  // ── 表格行(指标清单,字典加载后填充) ──────────────────────────────────
  const FILL_ROWS = computed<FillRow[]>(() =>
    INDICATORS.map((item) => ({
      key: item.key,
      kind: item.kind,
      name: item.name,
      unit: item.unit,
      code: item.code,
    })),
  );

  /** 自动行(汇总/项目数)整行浅灰加粗只读 */
  const sumRowOnCell = (record: FillRow) => ({
    className: record.kind === 'sum' || record.kind === 'count' ? 'progress-fill-row-sum' : undefined,
  });

  /** 未填内容与 0 一律置空(不补斜杠、不补 0) */
  function renderDisplay(value: number | string | undefined) {
    if (value === undefined || value === '' || value === 0) return '';
    return typeof value === 'number' ? String(value) : value;
  }

  function setCellValue(col: ProjectColumn, indicatorKey: string, value: number | string | undefined, leafKey: string) {
    if (value === undefined || value === '') {
      delete col.values[indicatorKey];
    } else {
      col.values[indicatorKey] = value;
    }
    dirtyCols.set(col.key, { leafKey, col });
  }

  // ── 单元格键盘导航:Enter/↓ = 下一个可填单元格,↑ = 上一个 ──────────────
  // 仅编辑列纵向跳(其它列没有输入框),自动跳过汇总/项目数等只读行;
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

  /** 其中：本年新开工（r3，编码 102）：开关型指标，0=非新开工、1=是新开工；
   *  合计 = 各项目列该字段的总计（即为"是新开工"的项目个数） */
  const NEW_START_KEY = 'r3';

  /** r3 显示口径：数值直出（含 0），不走通用"未填与 0 置空" */
  function renderNewStart(value: number | string | [number, number] | undefined) {
    return String(Number(value ?? 0));
  }

  /** 单元格:编辑列内渲染输入控件(自动行除外),其余为只读文本 */
  function renderFillCell(item: IndicatorDef, col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key && (item.kind === 'fill' || item.kind === 'text')) {
      if (item.key === NEW_START_KEY) {
        // 新开工:开关录入(0/1),不参与键盘导航(无可键入的输入框,Enter/方向键会跳过本行)
        return h('div', { class: 'flex w-full justify-center' }, [
          h(Switch, {
            size: 'default',
            checked: Number(col.values[item.key] ?? 0) === 1,
            checkedChildren: '是新开工',
            unCheckedChildren: '非新开工',
            'onUpdate:checked': (checked) => setCellValue(col, item.key, checked === true ? 1 : 0, leafKey),
          }),
        ]);
      }
      if (item.kind === 'text') {
        return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
          h(Input, {
            size: 'small',
            value: String(col.values[item.key] ?? ''),
            placeholder: '请输入来源说明',
            'onUpdate:value': (value: string) => setCellValue(col, item.key, value, leafKey),
          }),
        ]);
      }
      const value = col.values[item.key];
      return h('div', { class: 'w-full', onKeydownCapture: handleCellNav }, [
        h(InputNumber, {
          size: 'small',
          class: 'w-full',
          value: typeof value === 'number' ? value : undefined,
          min: 0,
          controls: false,
          placeholder: '请输入',
          'onUpdate:value': (value2: number | string | null) =>
            setCellValue(col, item.key, value2 ?? undefined, leafKey),
        }),
      ]);
    }
    if (item.key === NEW_START_KEY) {
      // 新开工读态:显示数值(0/1),未填默认 0
      return renderNewStart(col.values[item.key]);
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon(点击即存该列);只读单位不渲染图标 */
  function renderProjectHeader(col: ProjectColumn, leafKey: string) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      unitEditable.value
        ? h('span', { class: 'flex shrink-0 items-center gap-1' }, [
            h(Tooltip, { title: editing ? '完成并保存本列' : '编辑本列' }, () =>
              h(Icon, {
                icon: editing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
                class: 'progress-fill-icon-edit',
                onClick: () => toggleEdit(col, leafKey),
              }),
            ),
            deletable
              ? h(
                  Popconfirm,
                  { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) },
                  () =>
                    h(Icon, {
                      icon: 'ant-design:delete-outlined',
                      class: 'progress-fill-icon',
                    }),
                )
              : null,
          ])
        : null,
    ]);
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库(只读单位不允许进入编辑) */
  async function toggleEdit(col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key) {
      // 完成编辑:先退出编辑态,脏列落库
      editingColKey.value = undefined;
      if (dirtyCols.has(col.key)) {
        saving.value = true;
        try {
          await persistColumn(leafKey, col);
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

  async function handleDeleteColumn(col: ProjectColumn) {
    const leaf = activeLeaf.value;
    if (!leaf || !periodData.value) return;
    const tab = periodData.value[leaf.key];
    if (!tab) return;
    const withId = col;
    if (withId.id) {
      try {
        await deleteProgressProject(withId.id);
      } catch (e: unknown) {
        showMessage(e instanceof Error ? e.message : '删除失败');
        return;
      }
    }
    tab.projects = tab.projects.filter((item) => item.key !== col.key);
    dirtyCols.delete(col.key);
    if (editingColKey.value === col.key) editingColKey.value = undefined;
  }

  // ── 带入上一季度(服务端复制全部叶子类目;普通模式每周期×单位限一次) ────
  const bringInTooltip = computed(() =>
    quarter.value === '1'
      ? '带入上一年第四季度填报的项目列（含数值，带入列可删除）'
      : '带入本年度上一季度填报的项目列（含数值，带入列不可删除）',
  );

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

  /** 顶部保存:把全部脏列(可跨类目)依次落库 */
  async function handleSave() {
    const dirtyCount = dirtyCols.size;
    if (!dirtyCount) {
      resetEditState();
      showMessage(`暂无修改，${year.value} 年${quarterLabel(quarter.value)}项目进展填报数据已是最新`);
      return;
    }
    saving.value = true;
    let failed = 0;
    let firstError = '';
    for (const [, { leafKey, col }] of [...dirtyCols]) {
      try {
        await persistColumn(leafKey, col);
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
      showMessage(`已保存 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报（共 ${dirtyCount} 个项目列）`);
    }
  }

  // ── 导出 ────────────────────────────────────────────────────────────
  const exporting = ref(false);

  async function handleExport() {
    if (exporting.value || !periodData.value) return;
    exporting.value = true;
    try {
      await exportProgressFillExcel({
        year: year.value,
        quarter: quarter.value,
        periodData: periodData.value,
      });
      showMessage(`已导出 ${year.value} 年${quarterLabel(quarter.value)}项目进展填报`);
    } finally {
      exporting.value = false;
    }
  }

  // ── 表格列 ──────────────────────────────────────────────────────────
  const tableCardTitle = computed(() => {
    const period = `${year.value}年 ${quarterLabel(quarter.value)}`;
    const unitName = UNITS.find((unit) => unit.code === reportUnit.value)?.name;
    return isOverview.value
      ? `${period} ${unitName ? `${unitName} · ` : ''}总览`
      : `${period} · ${activeLeaf.value?.label}`;
  });

  /** 指标名称单元格:合计级录入行(total)在非总览下带蓝色「编辑」按钮,弹 Modal 直接录合计值(只读单位不渲染) */
  function renderNameCell(value: string, record: FillRow) {
    if (isOverview.value || record.kind !== 'total' || !unitEditable.value) return value;
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate' }, value),
      h(Tooltip, { title: '填写合计值（各项目单元格不填值）' }, () =>
        h(Icon, {
          icon: 'ant-design:edit-outlined',
          class: 'progress-fill-icon-edit',
          onClick: () => openTotalModal(record.key),
        }),
      ),
    ]);
  }

  function leadingColumns(): TableColumnsType<FillRow> {
    return [
      {
        key: 'name',
        title: '指标名称',
        dataIndex: 'name',
        width: widthFor('name', 400),
        fixed: 'left',
        className: 'progress-fill-col-name',
        onHeaderCell: resizableHeaderCell,
        render: (value: string, record: FillRow) => renderNameCell(value, record),
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
    ];
  }

  function buildFillColumns(): TableColumnsType<FillRow> {
    const leaf = activeLeaf.value;
    if (!leaf) return [];
    const tab = periodData.value?.[leaf.key];
    const projects = tab?.projects ?? [];
    const projectColumns: TableColumnsType<FillRow> = projects.map((col, index) => ({
      key: col.key,
      title: renderProjectHeader(col, leaf.key),
      width: widthFor(col.key, 140),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      // 奇偶列底色提升横向辨识度;编辑列高亮仍优先生效
      className:
        [
          index % 2 === 1 ? 'progress-fill-col-alt' : undefined,
          editingColKey.value === col.key ? 'progress-fill-col-editing' : undefined,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) => renderFillCell(INDICATOR_MAP[record.key], col, leaf.key),
    }));
    // 表头不做类目分组跨列,直接平铺项目列(类目已由 RadioGroup 表达)
    return [
      ...leadingColumns(),
      {
        key: 'total',
        title: '合计',
        width: widthFor('total', 120),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) =>
          record.key === NEW_START_KEY
            ? renderNewStart(tabTotal(INDICATOR_MAP[record.key], tab))
            : renderDisplay(tabTotal(INDICATOR_MAP[record.key], tab)),
      },
      ...projectColumns,
    ];
  }

  function buildOverviewColumns(): TableColumnsType<FillRow> {
    const data = periodData.value;
    /** 二级(叶子)类目列:值 = 该叶子类目的合计(total 行即录入值,count 行即列数) */
    const leafColumn = (leaf: CategoryDef): TableColumnsType<FillRow>[number] => ({
      key: leaf.key,
      title: leaf.label,
      width: widthFor(leaf.key, 150),
      align: 'right',
      onHeaderCell: resizableHeaderCell,
      onCell: sumRowOnCell,
      render: (_value: unknown, record: FillRow) =>
        record.key === NEW_START_KEY
          ? renderNewStart(tabTotal(INDICATOR_MAP[record.key], data?.[leaf.key]))
          : renderDisplay(tabTotal(INDICATOR_MAP[record.key], data?.[leaf.key])),
    });
    /** 嵌套类目拆为三个二级子列(一级表头跨列),简单类目单列 */
    const categoryColumns: TableColumnsType<FillRow> = DATA_CATEGORIES.map((cat) =>
      cat.children?.length
        ? {
            key: cat.key,
            title: cat.label,
            children: cat.children.map((leaf) => leafColumn(leaf)),
          }
        : leafColumn(cat),
    );
    return [
      ...leadingColumns(),
      {
        key: 'grand',
        title: '总计',
        width: widthFor('grand', 130),
        align: 'right',
        onHeaderCell: resizableHeaderCell,
        onCell: sumRowOnCell,
        render: (_value: unknown, record: FillRow) =>
          record.key === NEW_START_KEY
            ? renderNewStart(grandTotal(INDICATOR_MAP[record.key], data))
            : renderDisplay(grandTotal(INDICATOR_MAP[record.key], data)),
      },
      ...categoryColumns,
    ];
  }

  const tableColumns = computed<TableColumnsType<FillRow>>(() =>
    isOverview.value ? buildOverviewColumns() : buildFillColumns(),
  );

  /** 表格区域高度:视口自适应,表格内部纵向滚动(不依赖页面滚动,表头恒在视野) */
  const TABLE_HEIGHT = 'calc(100vh - 500px)';

  // 横向滚动宽度 = 各列当前宽度(含拖拽调整)之和
  const scrollX = computed(() => {
    const fixedWidth = widthFor('name', 400) + widthFor('unit', 90) + widthFor('code', 80);
    if (isOverview.value) {
      return (
        fixedWidth + widthFor('grand', 130) + LEAF_CATEGORIES.reduce((sum, leaf) => sum + widthFor(leaf.key, 150), 0)
      );
    }
    const projects = activeLeaf.value ? (periodData.value?.[activeLeaf.value.key]?.projects ?? []) : [];
    return fixedWidth + widthFor('total', 120) + projects.reduce((sum, col) => sum + widthFor(col.key, 140), 0);
  });
</script>

<style scoped>
  .progress-fill-radios {
    row-gap: 8px;
  }
</style>

<style>
  /* 奇数项目列淡青底色(提升横向辨识度);优先级低于其后的汇总行/编辑列样式 */
  .progress-fill-col-alt {
    background: #f0fafa;
  }

  /* 汇总/项目数等自动行仅加粗,不加背景色;编辑中的项目列浅蓝底 */
  .progress-fill-row-sum {
    font-weight: 600;
  }

  .progress-fill-col-editing {
    background: #d5e3f2;
  }

  .progress-fill-col-name {
    white-space: nowrap;
  }

  /* 编辑本列 icon 常驻蓝色;删除 icon 灰色、悬停变蓝 */
  .progress-fill-icon-edit {
    color: #1677ff;
    cursor: pointer;
  }

  .progress-fill-icon-edit:hover {
    color: #4096ff;
  }

  .progress-fill-icon {
    color: #8c8c8c;
    cursor: pointer;
  }

  .progress-fill-icon:hover {
    color: #1677ff;
  }
</style>
