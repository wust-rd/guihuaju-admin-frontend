<!--
  市住更局 —— 城市更新专家管理 · 新增/编辑 评估项目（独立路由页，tab 保活）

  项目评估列表「新增项目 / 编辑」进入的整页表单：项目基本信息 + 评估材料 + 参与专家。
  因需「去抽取 → 在线抽取 → 带回专家」，独立路由页靠 tab keep-alive 保留本地状态。
  规划路由（RESTful，后端隐藏菜单，待注册）：
   - 链接地址（新增）：/early-stage-planning/urban-renewal-expert-management/project-evaluation/form
   - 编辑带参：.../project-evaluation/form?id={项目id}
   - 组件位置：.../project-evaluation/form；是否可见：隐藏，上级菜单挂「项目评估」
  底部右侧：取消 / 暂存（待提交）/ 提交（评估中）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <div class="text-20px font-600 text-gray-900">{{ getTitle }}</div>

    <!-- 项目基本信息 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="text-16px font-600 text-gray-800">项目基本信息</div>
      <div class="mt-16px grid grid-cols-2 gap-x-32px gap-y-16px">
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">项目名称 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.name" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">行政区 <span class="text-red-500">*</span></span>
          <Select v-model:value="form.adminDistrict" :options="DISTRICT_OPTIONS" placeholder="请选择" allowClear />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">片区名称 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.district" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">统筹主体 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.coordinator" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">实施主体 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.implementOrg" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">评估模式 <span class="text-red-500">*</span></span>
          <Select v-model:value="form.reviewMode" :options="MODE_OPTIONS" placeholder="请选择" allowClear />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">责任部门 <span class="text-red-500">*</span></span>
          <Input v-model:value="form.dept" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">资金来源</span>
          <Input v-model:value="form.fundSource" placeholder="请输入" :maxlength="100" />
        </div>
        <div class="flex flex-col gap-4px">
          <span class="text-13px text-gray-600">项目投资估算（亿元）</span>
          <Input v-model:value="form.investment" placeholder="请输入" :maxlength="50" />
        </div>
        <div class="col-span-2 flex flex-col gap-4px">
          <span class="text-13px text-gray-600">主要项目内容 <span class="text-red-500">*</span></span>
          <Input.TextArea
            v-model:value="form.content"
            :rows="5"
            :maxlength="500"
            placeholder="不超过500字"
            show-count
          />
        </div>
      </div>
    </div>

    <!-- 评估材料 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="text-16px font-600 text-gray-800">评估材料 <span class="text-red-500">*</span></div>
      <Upload
        class="mt-16px"
        :show-upload-list="false"
        :before-upload="handleBeforeUpload"
        multiple
        accept=".pdf,.doc,.docx"
      >
        <div class="upload-zone">
          <span class="i-ant-design:cloud-upload-outlined text-30px text-[#3A8EF6]"></span>
          <div class="mt-8px text-14px text-gray-600">点击或拖拽文件到此处上传</div>
          <div class="mt-4px text-12px text-gray-400">支持 PDF、doc/docx 格式，可多选</div>
        </div>
      </Upload>
      <div class="mt-12px space-y-10px">
        <div
          v-for="(m, i) in form.materials"
          :key="i"
          class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-12px transition-colors hover:bg-[#EEF4FB]"
        >
          <span class="i-ant-design:file-text-outlined text-18px text-[#3A8EF6]"></span>
          <span class="flex-1 truncate text-14px text-gray-700" :title="m">{{ m }}</span>
          <span
            class="flex h-22px w-22px shrink-0 items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="removeMaterial(i)"
          >
            <span class="i-ant-design:close-outlined"></span>
          </span>
        </div>
        <div v-if="form.materials.length === 0" class="text-13px text-gray-400">尚未上传评估材料</div>
      </div>
    </div>

    <!-- 参与专家 -->
    <div class="rd-12px bg-white b-1 b-solid b-gray-100 p-24px shadow-sm">
      <div class="flex items-center justify-between">
        <div class="text-16px font-600 text-gray-800">参与专家 <span class="text-red-500">*</span></div>
        <a-button type="primary" @click="goPick">
          <span class="inline-flex items-center gap-4px">
            <span class="i-ant-design:swap-outlined"></span> 去抽取
          </span>
        </a-button>
      </div>
      <div class="mt-16px space-y-12px">
        <div v-for="(row, index) in rows" :key="index" class="flex items-center gap-16px">
          <span class="w-70px shrink-0 text-14px text-gray-600">专家{{ index + 1 }}:</span>
          <Select
            v-model:value="row.name"
            :options="NAME_OPTIONS"
            class="flex-1"
            showSearch
            :filter-option="filterByName"
            placeholder="请选择专家名称"
            allowClear
            @change="(v: string) => onSelectExpert(v, index)"
          />
          <Input v-model:value="row.org" class="flex-1" placeholder="请输入专家单位名称" readonly />
          <Input v-model:value="row.phone" class="flex-1" placeholder="请输入专家联系方式" readonly />
          <span
            v-if="rows.length > 3"
            class="flex h-22px w-22px shrink-0 items-center justify-center rd-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            @click="removeRow(index)"
          >
            <span class="i-ant-design:close-outlined"></span>
          </span>
        </div>

        <div class="flex items-center gap-16px">
          <span class="w-70px shrink-0 text-14px text-gray-600">选择组长:</span>
          <Select v-model:value="leader" :options="LEADER_OPTIONS" class="w-280px" placeholder="请选择" allowClear />
          <a-button v-if="rows.length < 7" type="dashed" class="ml-auto" @click="addRow">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:plus-outlined"></span> 添加专家
            </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="flex justify-end gap-12px">
      <a-button @click="handleCancel">取消</a-button>
      <a-button @click="handleDraft">暂存</a-button>
      <Popconfirm title="是否确认提交该项目？" ok-text="确定" cancel-text="取消" @confirm="handleSubmit">
        <a-button type="primary">提交</a-button>
      </Popconfirm>
    </div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectEvaluationForm">
  import { computed, reactive, ref, unref, watch } from 'vue';
  import { Input, Popconfirm, Select, Upload } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { PickedExpert, UrbanProject } from '../expert-store';
  import { REVIEW_MODES, URBAN_DISTRICTS, useUrbanExpertStore, validateProjectForSubmit } from '../expert-store';

  const { showMessage } = useMessage();
  const go = useGo();
  const store = useUrbanExpertStore();

  const DISTRICT_OPTIONS = URBAN_DISTRICTS.map((d) => ({ label: d, value: d }));
  const MODE_OPTIONS = REVIEW_MODES.map((m) => ({ label: m, value: m }));

  const LIST_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/index';
  const ONLINE_DRAW_ROUTE = '/early-stage-planning/urban-renewal-expert-management/online-draw/index';
  const FORM_ROUTE = '/early-stage-planning/urban-renewal-expert-management/project-evaluation/form';

  const { query } = unref(router.currentRoute);
  const editId = Number(query.id) || 0;
  const getTitle = computed(() => (editId ? '编辑评估项目' : '新增评估项目'));

  /** 编辑模式下的原项目（新增为 undefined） */
  const existProject = editId ? store.projects.find((p) => p.id === editId) : undefined;

  /** 表单（编辑时按 id 反查回填） */
  const form = reactive<Partial<UrbanProject> & { materials: string[] }>({
    name: '',
    adminDistrict: undefined as unknown as string,
    district: '',
    coordinator: '',
    implementOrg: '',
    reviewMode: undefined as unknown as string,
    dept: '',
    fundSource: '',
    investment: '',
    content: '',
    materials: [],
  });

  if (existProject) {
    Object.assign(form, {
      name: existProject.name,
      adminDistrict: existProject.adminDistrict,
      district: existProject.district,
      coordinator: existProject.coordinator,
      implementOrg: existProject.implementOrg,
      reviewMode: existProject.reviewMode,
      dept: existProject.dept,
      fundSource: existProject.fundSource,
      investment: existProject.investment,
      content: existProject.content,
      materials: [...existProject.materials],
    });
  }

  /** 参与专家行（3~7 人） */
  type ExpertRow = { name: string; org: string; phone: string };
  const rows = reactive<ExpertRow[]>([]);
  const leader = ref('');
  function seedRows() {
    rows.splice(
      0,
      rows.length,
      { name: '', org: '', phone: '' },
      { name: '', org: '', phone: '' },
      { name: '', org: '', phone: '' },
    );
  }
  seedRows();

  // 编辑时回填参与专家（名称 + 自动带出单位/联系方式）+ 组长
  if (existProject?.experts?.length) {
    const next: ExpertRow[] = existProject.experts.slice(0, 7).map((name) => {
      const e = store.experts.find((x) => x.name === name);
      return { name, org: e?.org || '', phone: e?.phone || '' };
    });
    while (next.length < 3) next.push({ name: '', org: '', phone: '' });
    rows.splice(0, rows.length, ...next.slice(0, 7));
    leader.value = existProject.leader || '';
  }

  /** 专家名称自动补全选项（取个人档案模块专家库） */
  /** 专家名称下拉选项（只能从个人档案专家库里选） */
  const NAME_OPTIONS = computed(() => store.experts.map((e) => ({ label: e.name, value: e.name })));
  /** 下拉按姓名模糊过滤 */
  function filterByName(input: string, option: Recordable) {
    return String(option?.label ?? '')
      .toLowerCase()
      .includes(String(input).toLowerCase());
  }
  /** 组长下拉选项：已填写的专家行 */
  const LEADER_OPTIONS = computed(() => rows.filter((r) => r.name).map((r) => ({ label: r.name, value: r.name })));

  function onSelectExpert(name: string, index: number) {
    const expert = store.experts.find((e) => e.name === name);
    if (expert) {
      rows[index].org = expert.org;
      rows[index].phone = expert.phone;
    }
  }
  function addRow() {
    if (rows.length < 7) rows.push({ name: '', org: '', phone: '' });
  }
  function removeRow(index: number) {
    if (rows.length > 3) rows.splice(index, 1);
    if (leader.value === rows[index]?.name) leader.value = '';
  }
  /** 把在线抽取挑好的专家回填成 3~7 行情 */
  function fillPicked(picked: PickedExpert[]) {
    const next: ExpertRow[] = picked.slice(0, 7).map((p) => ({ name: p.name, org: p.org, phone: p.phone }));
    while (next.length < 3) next.push({ name: '', org: '', phone: '' });
    rows.splice(0, rows.length, ...next.slice(0, 7));
  }

  /** 去抽取：需先填项目名称/统筹主体/实施主体，再把这三项带入在线抽取页 */
  function goPick() {
    if (!form.name?.trim()) {
      showMessage('请先填写项目名称');
      return;
    }
    if (!form.coordinator?.trim()) {
      showMessage('请先填写统筹主体');
      return;
    }
    if (!form.implementOrg?.trim()) {
      showMessage('请先填写实施主体');
      return;
    }
    store.beginPick(`${FORM_ROUTE}${editId ? `?id=${editId}` : ''}`, {
      name: form.name,
      coordinator: form.coordinator,
      implementOrg: form.implementOrg,
    });
    go(ONLINE_DRAW_ROUTE);
  }

  /** 在线抽取「返回」带回专家（pickedExperts 变化 / 页面挂载时已有数据）：回填参与专家、清空带回数据并退出挑选模式 */
  watch(
    () => store.pickedExperts,
    (list) => {
      if (list.length) {
        fillPicked(list);
        store.endPick();
        store.setPickedExperts([]);
      }
    },
    { immediate: true },
  );

  /** 上传：只把文件名加入材料列表 */
  function handleBeforeUpload(file: File) {
    form.materials.push(file.name);
    return false;
  }
  function removeMaterial(index: number) {
    form.materials.splice(index, 1);
  }

  /** 提交前校验：除资金来源/项目投资估算外都必填（与列表提交共用同一规则） */
  function validateRequired(): boolean {
    const missing = validateProjectForSubmit({
      ...form,
      experts: rows.filter((r) => r.name).map((r) => r.name),
      leader: leader.value,
    } as Partial<UrbanProject>);
    if (missing.length) {
      showMessage(`请先填写：${missing.join('、')}`);
      return false;
    }
    return true;
  }

  /** 保存（create: 新增；edit: 更新全部字段），status 按动作传入 */
  function save(submit: boolean) {
    const status = submit ? '评估中' : '待提交';
    const experts = rows.filter((r) => r.name).map((r) => r.name);
    if (editId) {
      store.updateProject(editId, { ...form, experts, leader: leader.value, status } as Partial<UrbanProject>);
      showMessage(`保存成功（${submit ? '已提交' : '已暂存'}，本地演示，未持久化）`);
    } else {
      store.addProject({
        ...form,
        status,
        experts,
        leader: leader.value,
        startDate: dateUtil().format('YYYY-MM-DD'),
      } as Partial<UrbanProject>);
      showMessage(`新增成功（${submit ? '已提交' : '已暂存'}，本地演示，未持久化）`);
    }
    go(LIST_ROUTE);
  }

  function handleCancel() {
    go(LIST_ROUTE);
  }
  function handleDraft() {
    // 暂存宽松：只需项目名称，其余可后续补填
    if (!form.name) {
      showMessage('请输入项目名称');
      return;
    }
    save(false);
  }
  function handleSubmit() {
    if (!validateRequired()) return;
    save(true);
  }
</script>

<style scoped>
  :deep(.ant-upload) {
    display: block;
    width: 100%;
  }
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 28px 16px;
    border: 1px dashed #c9d4e3;
    border-radius: 8px;
    background: #fafcff;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s;
  }
  .upload-zone:hover {
    border-color: #3a8ef6;
    background: #f0f6ff;
  }
</style>
