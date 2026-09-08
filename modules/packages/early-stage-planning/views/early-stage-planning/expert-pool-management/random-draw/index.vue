<!--
  市住更局 —— 随机分配三师（三师库管理）

  为「片区 × 专业领域 × 三师角色」随机分配专家：
  - 上方面板：片区单选 + 专业领域多选 + 三师角色复选 + 回避规则 + 重置/抽取；
  - 点击抽取：按勾选的三师数量生成对应数量的专家卡片（各卡片带责任角色标签）；
  - 卡片操作：单卡「随机更换」换同角色专家、「指定人员」弹出 Modal 按姓名/领域/单位/电话模糊搜索并单选指定；
  - 结果右侧「随机更换」整批重抽、「确认选用」生成一条分配记录；
  - 下方「分配记录」列表展示每条记录（时间/抽取片区/抽取领域/抽取人数/三师/详情）。
  当前后端尚未介入：专家来自三师库共享 store（expert-store.mock），随机在后端模拟，接口就绪后替换。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px p-16px">
    <!-- 抽取器：片区单选 + 专业领域多选 + 三师复选 + 回避规则 + 按钮 -->
    <div class="rd-10px p-16px h-88px" style="background-color: rgba(15, 23, 42, 0.02)">
      <div
        class="flex rd-12px flex-wrap items-center gap-x-24px gap-y-12px size-full bg-white p-8px"
        style="box-shadow: 0 16px 36px -20px rgba(76, 132, 192, 0.12)"
      >
        <div class="flex items-center gap-8px bg-black/2 h-40px rd-8px b-1 b-solid b-black/4">
          <span class="w-52px shrink-0 text-right text-14px text-gray-500">片区</span>
          <Select
            v-model:value="query.district"
            :options="DISTRICT_OPTIONS"
            placeholder="请选择片区（单选）"
            class="w-180px rd-8px"
            allowClear
            showSearch
            :bordered="false"
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px b-1 b-solid b-black/4 rd-8px px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">专业领域</span>
          <Select
            v-model:value="query.fields"
            :options="FIELD_OPTIONS"
            placeholder="请选择（多选）"
            mode="multiple"
            class="w-220px rd-8px"
            allowClear
            showSearch
            :bordered="false"
            :max-tag-count="'responsive'"
          />
        </div>

        <div class="flex items-center gap-12px">
          <span class="text-14px text-gray-500">三师</span>
          <Checkbox v-for="opt in TYPE_OPTIONS" :key="opt.value" v-model:checked="typeChecked[opt.value]">
            {{ opt.label }}
          </Checkbox>
        </div>

        <div class="flex items-center gap-8px">
          <span class="text-14px text-gray-700">回避规则</span>
          <Checkbox v-model:checked="query.avoidDrawn">排除已入三师专家</Checkbox>
        </div>

        <div class="ml-auto flex items-center gap-12px">
          <a-button @click="handleReset" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 重置
            </span>
          </a-button>
          <a-button type="primary" :loading="drawing" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px"> <span class="i-ri:search-2-line"></span> 抽取 </span>
          </a-button>
        </div>
      </div>
    </div>

    <!-- 抽取结果：按勾选三师数量生成卡片 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:team-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">抽取结果</span>

        <div class="ml-auto flex items-center gap-12px">
          <a-button type="link" :disabled="results.length === 0" @click="handleDraw" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 随机更换
            </span>
          </a-button>
          <a-button type="primary" :disabled="results.length === 0" @click="handleConfirm" class="h-36px rd-8px">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:check-outlined"></span> 确认选用
            </span>
          </a-button>
        </div>
      </div>

      <div class="mt-16px flex h-300px items-stretch gap-16px overflow-x-auto bg-[#519bd40a] rd-8px p-12px">
        <template v-if="results.length > 0">
          <div
            v-for="card in results"
            :key="card.role"
            class="relative rd-12px p-20px shadow-sm transition-shadow hover:shadow-md w-400px h-218px shrink-0 bg-white overflow-hidden"
          >
            <!-- 承担角色标签：右上角，蓝色与外层容器同色系 -->
            <span
              class="absolute right-0px top-0px rd-tr-12px rd-bl-12px w-32px w-92px flex justify-center items-center px-10px py-4px text-14px text-white"
              :style="{ background: '#519BD4' }"
            >
              {{ roleLabel(card.role) }}
            </span>

            <template v-if="card.expert">
              <!-- 头部：头像 + 姓名 + 职称徽标（黄色勾 + 浅黄底）+ 专业标签（浅蓝底）+ 单位 -->
              <div class="flex gap-16px h-58px items-center">
                <div
                  class="size-48px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-18px font-500"
                >
                  {{ card.expert.name.slice(0, 1) }}
                </div>

                <div class="min-w-0 flex-1">
                  <div class="text-16px font-500 text-gray-800">{{ card.expert.name }}</div>

                  <div class="flex items-center gap-6px overflow-hidden">
                    <!-- 职称：勾图标 + 浅黄底徽标 -->
                    <div
                      class="inline-flex shrink-0 items-center gap-2px rd-4px px-6px py-2px text-12px text-amber-500"
                      :style="{ background: '#FDF3E0' }"
                    >
                      <div class="i-ant-design:check-circle-filled"></div>
                      {{ card.expert.title }}
                    </div>

                    <!-- 专业领域：浅蓝底标签 -->
                    <div
                      class="inline-flex shrink-0 items-center rd-4px px-6px py-2px text-12px text-gray-800"
                      :style="{ background: '#EFF6FF' }"
                    >
                      {{ card.expert.field }}
                    </div>
                    <!-- 单位名称 -->
                    <div class="min-w-0 flex-1 truncate text-13px text-gray-800">{{ card.expert.org }}</div>
                  </div>
                </div>
              </div>

              <!-- 履历摘要：浅色底块 -->
              <div class="mt-12px rd-8px p-10px" :style="{ background: '#F5F9FD' }">
                <div class="line-clamp-2 text-14px leading-22px text-gray-600">
                  {{ card.expert.career }}
                  <a class="whitespace-nowrap font-500 text-cyan-600" @click="openExpertDetail(card.expert)"
                    >... 更多信息 ></a
                  >
                </div>
              </div>

              <!-- 底部：电话 + 单卡操作（浅蓝底按钮） -->
              <div class="mt-12px flex items-center justify-between">
                <span class="flex items-center gap-6px text-13px text-gray-700">
                  <span class="i-ant-design:phone-outlined"></span>
                  {{ card.expert.phone }}
                </span>
                <div class="flex items-center gap-8px">
                  <a-button
                    @click="replaceOne(card)"
                    class="rd-8px"
                    :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
                  >
                    <span class="inline-flex items-center gap-4px">
                      <span class="i-ant-design:redo-outlined"></span> 随机更换
                    </span>
                  </a-button>
                  <a-button
                    type="primary"
                    @click="openAssign(card)"
                    class="rd-8px"
                    :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
                  >
                    <span class="inline-flex items-center gap-4px">
                      <span class="i-ant-design:user-add-outlined"></span> 指定人员
                    </span>
                  </a-button>
                </div>
              </div>
            </template>

            <!-- 空态：该角色没匹配到专家 -->
            <div v-else class="flex h-full items-center justify-center text-14px text-gray-400"
              >未匹配到符合条件专家</div
            >
          </div>
        </template>

        <div v-else class="flex w-full items-center justify-center text-14px text-gray-400">
          请设置抽取条件后点击「抽取」
        </div>
      </div>
    </div>

    <!-- 分配记录 -->
    <div class="rd-24px bg-white shadow-sm b-2px b-solid b-[#6975860A]">
      <div class="flex items-center gap-8px h-60px bg-white/60 px-32px">
        <span class="i-ant-design:file-text-outlined text-18px text-gray-600"></span>
        <span class="text-18px font-500 text-gray-800">分配记录</span>
      </div>

      <BasicTable @register="registerTable" :showIndexColumn="false" class="px-16px pb-16px">
        <template #planner="{ record }">{{ record.planner?.name || '—' }}</template>
        <template #architect="{ record }">{{ record.architect?.name || '—' }}</template>
        <template #assessor="{ record }">{{ record.assessor?.name || '—' }}</template>
        <template #operation="{ record }">
          <a-button type="link" @click="showRecordDetail(record)">详情</a-button>
        </template>
      </BasicTable>
    </div>

    <!-- 指定人员 Modal：关键词（姓名/单位/电话）模糊搜索 + 专业领域筛选，单选一名专家 -->
    <Modal
      v-model:open="assignModal.open"
      title="指定人员"
      width="760px"
      centered
      ok-text="确定"
      cancel-text="取消"
      :ok-button-props="{ disabled: !assignModal.selectedId }"
      @ok="confirmAssign"
    >
      <div class="flex flex-col gap-12px py-4px">
        <!-- 搜索区 -->
        <div class="flex items-center gap-12px">
          <Input
            v-model:value="assignModal.keyword"
            class="flex-1"
            placeholder="输入姓名 / 单位 / 联系电话进行模糊搜索"
            allowClear
          >
            <template #prefix><span class="i-ant-design:search-outlined text-gray-400"></span></template>
          </Input>
          <Select
            v-model:value="assignModal.field"
            :options="FIELD_OPTIONS"
            placeholder="专业领域（全部）"
            allowClear
            class="w-200px"
          />
        </div>

        <!-- 候选列表：单选，高亮选中行 -->
        <div class="overflow-y-auto rd-8px b-1 b-solid b-black/6 p-6px" style="max-height: 360px">
          <template v-if="assignCandidates.length > 0">
            <div
              v-for="expert in assignCandidates"
              :key="expert.id"
              class="flex cursor-pointer items-center gap-12px rd-8px b-1 b-solid px-12px py-10px transition-colors"
              :class="
                assignModal.selectedId === expert.id ? 'b-[#519BD4] bg-[#f0f7fd]' : 'b-transparent hover:bg-[#f5f9fd]'
              "
              @click="assignModal.selectedId = expert.id"
            >
              <!-- 选中指示圆点 -->
              <span
                class="flex size-18px shrink-0 items-center justify-center rd-full b-2 b-solid transition-colors"
                :class="assignModal.selectedId === expert.id ? 'b-[#519BD4]' : 'b-gray-300'"
              >
                <span v-if="assignModal.selectedId === expert.id" class="size-10px rd-full bg-[#519BD4]"></span>
              </span>

              <!-- 头像 -->
              <div
                class="flex size-36px shrink-0 items-center justify-center rd-full bg-cyan-100 text-14px font-500 text-cyan-700"
              >
                {{ expert.name.slice(0, 1) }}
              </div>

              <!-- 姓名 / 职称 / 领域 / 单位 -->
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-6px">
                  <span class="text-14px font-500 text-gray-800">{{ expert.name }}</span>
                  <span class="rd-4px px-6px py-2px text-12px text-amber-500" :style="{ background: '#FDF3E0' }">{{
                    expert.title
                  }}</span>
                  <span class="rd-4px px-6px py-2px text-12px text-gray-800" :style="{ background: '#EFF6FF' }">{{
                    expert.field
                  }}</span>
                </div>
                <div class="mt-2px truncate text-12px text-gray-500">{{ expert.org }}</div>
              </div>

              <!-- 联系电话 -->
              <span class="flex shrink-0 items-center gap-4px text-13px text-gray-600">
                <span class="i-ant-design:phone-outlined"></span>{{ expert.phone }}
              </span>
            </div>
          </template>

          <a-empty v-else class="py-24px" :image-style="{ height: '48px' }" description="未找到匹配的专家" />
        </div>
      </div>
    </Modal>

    <!-- 分配详情 Modal -->
    <Modal
      v-model:open="detailModal.open"
      :title="`分配详情 - ${detailModal.record?.district ?? ''}`"
      width="720px"
      centered
      :footer="null"
    >
      <div v-if="detailModal.record" class="mt-8px flex flex-col gap-12px">
        <div class="grid grid-cols-4 gap-x-16px gap-y-10px text-13px text-gray-700">
          <div class="min-w-0">
            <div class="text-12px text-gray-400">抽取片区</div>
            <div class="mt-2px truncate">{{ detailModal.record.district }}</div>
          </div>
          <div class="min-w-0 col-span-2">
            <div class="text-12px text-gray-400">抽取领域</div>
            <div class="mt-2px truncate">{{ detailModal.record.fieldsText }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">抽取人数</div>
            <div class="mt-2px truncate">{{ detailModal.record.count }} 人</div>
          </div>
        </div>

        <div v-for="card in detailCards" :key="card.role" class="rd-8px bg-gray-50 p-12px">
          <div class="flex items-center justify-between">
            <span class="font-600 text-gray-800">{{ roleLabel(card.role) }}</span>
            <span class="text-13px text-gray-600">
              {{ card.expert ? `${card.expert.name}（${card.expert.org}）` : '未分配' }}
            </span>
          </div>
          <div v-if="card.expert" class="mt-6px text-13px text-gray-600">
            {{ card.expert.field }} · {{ card.expert.phone }}
          </div>
        </div>
      </div>
    </Modal>

    <!-- 专家详情 Modal（履历摘要「更多信息」） -->
    <Modal
      v-model:open="expertModal.open"
      :title="`专家详情 - ${expertModal.expert?.name ?? ''}`"
      width="720px"
      centered
      :footer="null"
    >
      <div v-if="expertModal.expert" class="mt-8px flex flex-col gap-12px">
        <div class="grid grid-cols-3 gap-x-16px gap-y-10px text-13px text-gray-700">
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">姓名</div
            ><div class="mt-2px truncate">{{ expertModal.expert.name }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">性别</div
            ><div class="mt-2px truncate">{{ expertModal.expert.gender }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">年龄</div
            ><div class="mt-2px truncate">{{ expertModal.expert.age }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">职称</div
            ><div class="mt-2px truncate">{{ expertModal.expert.title }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">专业领域</div
            ><div class="mt-2px truncate">{{ expertModal.expert.field }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">联系电话</div
            ><div class="mt-2px truncate">{{ expertModal.expert.phone }}</div></div
          >
          <div class="col-span-2 min-w-0"
            ><div class="text-12px text-gray-400">单位名称</div
            ><div class="mt-2px truncate">{{ expertModal.expert.org }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">单位性质</div
            ><div class="mt-2px truncate">{{ expertModal.expert.orgType }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">入库时间</div
            ><div class="mt-2px truncate">{{ expertModal.expert.joinDate }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">身份证号</div
            ><div class="mt-2px truncate">{{ expertModal.expert.idCard }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">是否已入选三师</div
            ><div class="mt-2px truncate">{{ expertModal.expert.selected ? '是' : '否' }}</div></div
          >
        </div>

        <div class="border-t border-gray-100 pt-10px">
          <div class="text-12px text-gray-400">主要学习和工作经历</div>
          <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{
            expertModal.expert.career
          }}</div>
        </div>

        <div class="border-t border-gray-100 pt-10px">
          <div class="text-12px text-gray-400">过往评审经历</div>
          <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{
            expertModal.expert.reviewExperience
          }}</div>
        </div>
      </div>
    </Modal>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawIndex">
  import { computed, reactive, ref } from 'vue';
  import { message } from 'antdv-next';
  import { Checkbox, Input, Modal, Select } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import { dateUtil } from '@jeesite/core/utils/dateUtil';
  import type { Expert } from '../expert-store';
  import { EXPERT_FIELDS, useExpertPoolStore } from '../expert-store';

  /** 三师角色 key */
  type RoleKey = 'planner' | 'architect' | 'assessor';

  /** 三师角色选项（复选，勾选几个就抽几个卡片） */
  const TYPE_OPTIONS: { label: string; value: RoleKey }[] = [
    { label: '责任规划师', value: 'planner' },
    { label: '责任建筑师', value: 'architect' },
    { label: '责任评估师', value: 'assessor' },
  ];

  const ROLE_LABEL: Record<RoleKey, string> = {
    planner: '责任规划师',
    architect: '责任建筑师',
    assessor: '责任评估师',
  };

  /** 片区下拉选项（占位，接入接口后替换） */
  const DISTRICT_OPTIONS = ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区'].map((d) => ({
    label: d,
    value: d,
  }));

  /** 专业领域下拉选项（直接取自共享专家库 EXPERT_FIELDS，保证下拉与库一致，多选才筛得出专家） */
  const FIELD_OPTIONS = EXPERT_FIELDS.map((f) => ({ label: f, value: f }));

  /** 三师角色勾选状态（默认勾选规划师+评估师） */
  const typeChecked = reactive<Record<RoleKey, boolean>>({ planner: true, architect: false, assessor: true });

  /** 抽取条件（片区单选、专业领域多选） */
  const query = reactive({
    district: undefined as string | undefined,
    fields: [] as string[],
    avoidDrawn: true,
  });

  /** 抽取结果：每个勾选的角色一个卡片 */
  const results = ref<{ role: RoleKey; expert: Expert | null }[]>([]);
  /** 抽取中 loading */
  const drawing = ref(false);

  /** 分配记录 */
  type DrawRecord = {
    id: number;
    time: string;
    district: string;
    fields: string[];
    fieldsText: string;
    count: number;
    planner?: Expert;
    architect?: Expert;
    assessor?: Expert;
  };
  const records = ref<DrawRecord[]>([]);

  /** 指定人员 Modal 状态 */
  const assignModal = reactive({
    open: false,
    role: 'planner' as RoleKey,
    keyword: '',
    field: undefined as string | undefined,
    selectedId: null as number | null,
  });

  /** 记录详情 Modal 状态 */
  const detailModal = reactive({
    open: false,
    record: null as DrawRecord | null,
  });

  /** 专家详情 Modal 状态（履历摘要「更多信息」） */
  const expertModal = reactive({
    open: false,
    expert: null as Expert | null,
  });

  const { showMessage } = useMessage();
  /** 三师库共享 store（Pinia） */
  const expertStore = useExpertPoolStore();

  /** 记录列表列 */
  const recordColumns: BasicColumn[] = [
    { title: '时间', dataIndex: 'time', width: 110 },
    { title: '抽取片区', dataIndex: 'district', width: 140 },
    { title: '抽取领域', dataIndex: 'fieldsText', width: 320, ellipsis: true },
    { title: '抽取人数', dataIndex: 'count', width: 90, align: 'center' },
    { title: '责任规划师', dataIndex: 'planner', width: 110, slot: 'planner' },
    { title: '责任建筑师', dataIndex: 'architect', width: 110, slot: 'architect' },
    { title: '责任评估师', dataIndex: 'assessor', width: 110, slot: 'assessor' },
    { title: '操作', dataIndex: 'operation', width: 90, slot: 'operation' },
  ];

  const [registerTable, { setTableData }] = useTable({
    dataSource: records.value,
    columns: recordColumns,
    showTableSetting: true,
    showIndexColumn: false,
    pagination: { pageSize: 10 },
    canResize: true,
  });

  function roleLabel(role: RoleKey): string {
    return ROLE_LABEL[role];
  }

  /** 勾选的三师角色 key 列表 */
  function checkedTypes(): RoleKey[] {
    return TYPE_OPTIONS.filter((o) => typeChecked[o.value]).map((o) => o.value);
  }

  /** 抽取 count 名：从所选领域（未选则全部领域）里抽；排除已抽中的专家（一个专家只当一个师）；avoidDrawn 时排除已入三师 */
  function drawForRole(count: number, excludeIds: number[] = []): Expert[] {
    const fields = query.fields.length ? query.fields : FIELD_OPTIONS.map((o) => o.value);
    const pool = expertStore.experts.filter(
      (e) => fields.includes(e.field) && (query.avoidDrawn ? !e.selected : true) && !excludeIds.includes(e.id),
    );
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  /** 抽取 / 整批随机更换：按勾选的三师数量逐角色各抽 1 名（同一次抽取内一个专家只当一个师） */
  function handleDraw() {
    const roles = checkedTypes();
    if (roles.length === 0) {
      message.warning('请至少勾选一种三师类型');
      return;
    }
    if (!query.district) {
      message.warning('请先选择片区');
      return;
    }
    drawing.value = true;
    // 模拟接口耗时
    setTimeout(() => {
      const usedIds: number[] = [];
      results.value = roles.map((role) => {
        const [expert] = drawForRole(1, usedIds);
        if (expert) usedIds.push(expert.id);
        return { role, expert: expert ?? null };
      });
      drawing.value = false;
    }, 400);
  }

  /** 单卡随机更换：换同角色的另一位专家，其余卡片不动 */
  function replaceOne(card: { role: RoleKey; expert: Expert | null }) {
    if (!card.expert) return;
    const excludeIds = [...results.value.map((r) => r.expert?.id).filter((v): v is number => !!v), card.expert.id];
    const [replacement] = drawForRole(1, excludeIds);
    if (!replacement) {
      message.warning('没有更多符合条件的专家可供更换');
      return;
    }
    results.value = results.value.map((r) => (r.role === card.role ? { ...r, expert: replacement } : r));
  }

  /** 指定人员候选列表：关键词（姓名/单位/电话）模糊 + 专业领域筛选；排除已在其他卡片上的专家（一人只当一师） */
  const assignCandidates = computed(() => {
    const kw = assignModal.keyword.trim();
    const field = assignModal.field;
    const usedIds = results.value
      .filter((r) => r.role !== assignModal.role)
      .map((r) => r.expert?.id)
      .filter((v): v is number => typeof v === 'number');
    return expertStore.experts.filter((e) => {
      if (usedIds.includes(e.id)) return false;
      if (field && e.field !== field) return false;
      if (kw && !e.name.includes(kw) && !e.org.includes(kw) && !e.phone.includes(kw)) return false;
      return true;
    });
  });

  /** 打开指定人员 Modal（记录当前卡片角色） */
  function openAssign(card: { role: RoleKey; expert: Expert | null }) {
    assignModal.role = card.role;
    assignModal.keyword = '';
    assignModal.field = undefined;
    assignModal.selectedId = null;
    assignModal.open = true;
  }

  /** 指定人员：把选中的专家替换到该角色卡片 */
  function confirmAssign() {
    const matched = expertStore.experts.find((e) => e.id === assignModal.selectedId);
    if (!matched) {
      message.warning('请先选择一名专家');
      return;
    }
    results.value = results.value.map((r) => (r.role === assignModal.role ? { ...r, expert: matched } : r));
    assignModal.open = false;
  }

  /** 确认选用：生成一条分配记录并刷新列表 */
  function handleConfirm() {
    if (results.value.length === 0) {
      message.warning('请先抽取');
      return;
    }
    if (!query.district) {
      message.warning('请先选择片区');
      return;
    }
    const assigned = results.value.filter((r) => r.expert);
    if (assigned.length === 0) {
      message.warning('没有已分配专家');
      return;
    }
    // 抽取领域 = 最终被抽中专家的专业领域（去重），而非勾选的筛选领域
    const drawnFields = [...new Set(assigned.map((r) => r.expert!.field))];
    const rec: DrawRecord = {
      id: records.value.reduce((max, r) => Math.max(max, r.id), 0) + 1,
      time: dateUtil().format('YYYY-MM-DD'),
      district: query.district,
      fields: drawnFields,
      fieldsText: drawnFields.join('、'),
      count: assigned.length,
      planner: results.value.find((r) => r.role === 'planner')?.expert ?? undefined,
      architect: results.value.find((r) => r.role === 'architect')?.expert ?? undefined,
      assessor: results.value.find((r) => r.role === 'assessor')?.expert ?? undefined,
    };
    records.value = [rec, ...records.value];
    setTableData(records.value);
    // 确认选用后，把本次被选中的专家标记为「已入选三师」
    expertStore.markSelected(assigned.map((r) => r.expert!.id));
    showMessage('已生成一条分配记录（本地演示，未持久化）');
    results.value = [];
  }

  /** 打开记录详情 Modal */
  function showRecordDetail(record: DrawRecord) {
    detailModal.record = record;
    detailModal.open = true;
  }

  /** 打开专家详情 Modal（卡片履历摘要「更多信息」） */
  function openExpertDetail(expert: Expert) {
    expertModal.expert = expert;
    expertModal.open = true;
  }

  /** 详情 Modal 的三行卡片（三师角色） */
  const detailCards = computed(() => {
    const rec = detailModal.record;
    if (!rec) return [];
    return [
      { role: 'planner' as RoleKey, expert: rec.planner },
      { role: 'architect' as RoleKey, expert: rec.architect },
      { role: 'assessor' as RoleKey, expert: rec.assessor },
    ];
  });

  /** 重置：恢复默认条件并清空结果 */
  function handleReset() {
    query.district = undefined;
    query.fields = [];
    query.avoidDrawn = true;
    typeChecked.planner = true;
    typeChecked.architect = false;
    typeChecked.assessor = true;
    results.value = [];
  }
</script>

<style>
  /* antdv Button 的内置 border-radius（默认 6px）优先级高于 UnoCSS 的 .rd-8px，
     用更高特异性 + !important 兜底，确保按钮圆角按 rd-8px（8px）生效。 */
  .ant-btn.rd-8px {
    border-radius: 8px !important;
  }
</style>
