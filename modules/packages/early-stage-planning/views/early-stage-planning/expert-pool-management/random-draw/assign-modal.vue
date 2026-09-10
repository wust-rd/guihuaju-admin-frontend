<!--
  三师库 · 随机抽取 —— 指定人员 Modal

  从 index.vue 拆出：关键词（姓名/单位/电话）模糊 + 专业领域筛选 + 候选单选列表。
  候选池由本组件调接口 2.1 拉全库（打开时加载一次），排除 excludeIds（已在其它卡片上的专家）。

  props：
  - open: v-model:open 双向控制显隐
  - role: 当前指定中的角色（标题展示）
  - excludeIds: 排除的专家 id 列表（一人只当一师）
  - fieldOptions: 专业领域下拉选项（与抽取器共用字典）

  emits：
  - update:open
  - confirm: (expert) 选中确认，父级替换该角色卡片
-->
<template>
  <Modal
    :open="open"
    title="指定人员"
    width="760px"
    centered
    ok-text="确定"
    cancel-text="取消"
    :ok-button-props="{ disabled: !selectedId }"
    @ok="handleOk"
    @cancel="emit('update:open', false)"
  >
    <div class="flex flex-col gap-12px py-4px">
      <!-- 搜索区 -->
      <div class="flex items-center gap-12px">
        <Input v-model:value="keyword" class="flex-1" placeholder="输入姓名 / 单位 / 联系电话进行模糊搜索" allowClear>
          <template #prefix><span class="i-ant-design:search-outlined text-gray-400"></span></template>
        </Input>
        <Select
          v-model:value="field"
          :options="fieldOptions"
          placeholder="专业领域（全部）"
          allowClear
          class="w-200px"
        />
      </div>

      <!-- 候选列表：单选，高亮选中行 -->
      <div class="overflow-y-auto rd-8px b-1 b-solid b-black/6 p-6px" style="max-height: 360px">
        <template v-if="candidates.length > 0">
          <div
            v-for="expert in candidates"
            :key="expert.id"
            class="flex cursor-pointer items-center gap-12px rd-8px b-1 b-solid px-12px py-10px transition-colors"
            :class="selectedId === expert.id ? 'b-[#519BD4] bg-[#f0f7fd]' : 'b-transparent hover:bg-[#f5f9fd]'"
            @click="selectedId = expert.id"
          >
            <!-- 选中指示圆点 -->
            <span
              class="flex size-18px shrink-0 items-center justify-center rd-full b-2 b-solid transition-colors"
              :class="selectedId === expert.id ? 'b-[#519BD4]' : 'b-gray-300'"
            >
              <span v-if="selectedId === expert.id" class="size-10px rd-full bg-[#519BD4]"></span>
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
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawAssignModal">
  import { computed, ref, watch } from 'vue';
  import { Input, Modal, Select } from 'antdv-next';
  import { espExpertPage, type EspExpert } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import { roleLabel, type RoleKey } from './shared';

  const props = defineProps({
    open: { type: Boolean, default: false },
    role: { type: String as () => RoleKey, required: true },
    excludeIds: { type: Array as () => string[], default: () => [] },
    fieldOptions: { type: Array as () => { label: string; value: string }[], default: () => [] },
  });

  const emit = defineEmits(['update:open', 'confirm']);

  /** 搜索条件（打开时重置） */
  const keyword = ref('');
  const field = ref<string | undefined>(undefined);
  const selectedId = ref<string | null>(null);

  /** 候选池（接口 2.1 拉全库，pageSize=100 上限；打开时按需加载） */
  const pool = ref<EspExpert[]>([]);
  async function loadPool() {
    if (pool.value.length > 0) return;
    const { list } = await espExpertPage({ pageNum: 1, pageSize: 100 });
    pool.value = list;
  }

  watch(
    () => props.open,
    (open) => {
      if (open) {
        keyword.value = '';
        field.value = undefined;
        selectedId.value = null;
        loadPool();
      }
    },
  );

  /** 候选列表：关键词（姓名/单位/电话）模糊 + 专业领域筛选；排除已在其它卡片上的专家 */
  const candidates = computed(() => {
    const kw = keyword.value.trim();
    const f = field.value;
    return pool.value.filter((e) => {
      if (props.excludeIds.includes(e.id)) return false;
      if (f && e.field !== f) return false;
      if (kw && !e.name.includes(kw) && !e.org.includes(kw) && !e.phone.includes(kw)) return false;
      return true;
    });
  });

  /** 确认：上抛选中的专家，父级替换该角色卡片 */
  function handleOk() {
    const matched = pool.value.find((e) => e.id === selectedId.value);
    if (!matched) return;
    emit('confirm', matched);
    emit('update:open', false);
  }

  // 供模板/父级识别当前角色（避免 unused 提示；标题按角色展示更直观）
  void roleLabel;
</script>
