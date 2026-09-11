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
          <span class="ml-6 text-gray-500">项目报送单位</span>
          <Select
            v-model:value="reportUnit"
            :options="reportUnitOptions"
            placeholder="请选择"
            class="ml-2 w-32"
            @change="handleFilterChange"
          />
        </div>
        <div class="flex items-center">
          <a-button v-if="!isOverview" @click="handleAddProject"> 新增项目 </a-button>
          <a-button class="ml-2" :loading="exporting" @click="handleExport"> 导出 </a-button>
          <a-button type="primary" class="ml-2" :loading="saving" @click="handleSave"> 保存 </a-button>
        </div>
      </div>
    </Card>

    <Card :title="tableCardTitle">
      <template #extra>
        <Tooltip v-if="!isOverview" :title="bringInTooltip">
          <a-button size="small" :disabled="broughtIn || loading" @click="handleBringIn">
            代入上一季度填写的项目列
          </a-button>
        </Tooltip>
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
  import { Card, Input, InputNumber, Modal, Popconfirm, RadioGroup, Select, Table, Tooltip } from 'antdv-next';
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

  /** 筛选条件变化:丢弃未保存的编辑并整包重载 */
  function handleFilterChange() {
    resetEditState();
    dirtyCols.clear();
    loadFill();
  }

  // 切换类目后,上一类目的编辑状态一并退出(未保存列保留在脏列登记中,顶部保存仍可落库)
  watch([activeCategory, activeSub], resetEditState);

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
    const leaf = activeLeaf.value;
    if (!leaf || !periodData.value) return;
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

  /** 单元格:编辑列内渲染输入控件(自动行除外),其余为只读文本 */
  function renderFillCell(item: IndicatorDef, col: ProjectColumn, leafKey: string) {
    if (editingColKey.value === col.key && (item.kind === 'fill' || item.kind === 'text')) {
      if (item.kind === 'text') {
        return h(Input, {
          size: 'small',
          value: String(col.values[item.key] ?? ''),
          placeholder: '请输入来源说明',
          'onUpdate:value': (value: string) => setCellValue(col, item.key, value, leafKey),
        });
      }
      const value = col.values[item.key];
      return h(InputNumber, {
        size: 'small',
        class: 'w-full',
        value: typeof value === 'number' ? value : undefined,
        min: 0,
        controls: false,
        placeholder: '请输入',
        'onUpdate:value': (value2: number | string | null) => setCellValue(col, item.key, value2 ?? undefined, leafKey),
      });
    }
    return renderDisplay(cellValue(item, col));
  }

  /** 项目列头:「名称 + 编辑/删除图标」;编辑态下的编辑按钮换成保存 icon(点击即存该列) */
  function renderProjectHeader(col: ProjectColumn, leafKey: string) {
    const editing = editingColKey.value === col.key;
    const deletable = !(col.imported && quarter.value !== '1');
    return h('div', { class: 'flex items-center justify-between gap-1' }, [
      h('span', { class: 'flex-1 truncate text-left', title: col.name }, col.name),
      h('span', { class: 'flex shrink-0 items-center gap-1' }, [
        h(Tooltip, { title: editing ? '完成并保存本列' : '编辑本列' }, () =>
          h(Icon, {
            icon: editing ? 'ant-design:save-outlined' : 'ant-design:edit-outlined',
            class: 'progress-fill-icon-edit',
            onClick: () => toggleEdit(col, leafKey),
          }),
        ),
        deletable
          ? h(Popconfirm, { title: `确定删除项目「${col.name}」吗？`, onConfirm: () => handleDeleteColumn(col) }, () =>
              h(Icon, {
                icon: 'ant-design:delete-outlined',
                class: 'progress-fill-icon',
              }),
            )
          : null,
      ]),
    ]);
  }

  /** 进入/退出编辑:退出时该列若有改动立即落库 */
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

  // ── 带入上一季度(服务端复制全部叶子类目;每周期×单位限一次) ────────────
  const bringInTooltip = computed(() =>
    quarter.value === '1'
      ? '带入上一年第四季度填报的项目列（含数值，带入列可删除）'
      : '带入本年度上一季度填报的项目列（含数值，带入列不可删除）',
  );

  async function handleBringIn() {
    if (!reportUnit.value || broughtIn.value || loading.value) return;
    try {
      const res = await bringInPrevPeriod({
        year: year.value,
        quarter: quarter.value,
        unit: reportUnit.value,
      });
      showMessage(
        `已带入 ${res.fromYear} 年${quarterLabel(res.fromQuarter)}填报的 ${res.broughtProjectCount} 个项目列`,
      );
      resetEditState();
      dirtyCols.clear();
      await loadFill();
    } catch (e: unknown) {
      showMessage(e instanceof Error ? e.message : '带入失败');
    }
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

  /** 指标名称单元格:合计级录入行(total)在非总览下带蓝色「编辑」按钮,弹 Modal 直接录合计值 */
  function renderNameCell(value: string, record: FillRow) {
    if (isOverview.value || record.kind !== 'total') return value;
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
        render: (_value: unknown, record: FillRow) => renderDisplay(tabTotal(INDICATOR_MAP[record.key], tab)),
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
        renderDisplay(tabTotal(INDICATOR_MAP[record.key], data?.[leaf.key])),
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
        render: (_value: unknown, record: FillRow) => renderDisplay(grandTotal(INDICATOR_MAP[record.key], data)),
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
