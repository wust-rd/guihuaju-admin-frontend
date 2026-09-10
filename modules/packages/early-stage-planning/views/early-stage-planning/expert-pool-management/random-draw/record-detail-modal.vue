<!--
  三师库 · 随机抽取 —— 分配详情 Modal（摘要条 + 三师 Tab 切换专家全景卡）

  从 index.vue 拆出：打开时调接口 3.5 拉记录详情（含三角色完整专家行），
  摘要条展示片区/领域/人数/日期/方式/操作人，Tab 按角色切换展示专家全部字段。

  props：
  - open: v-model:open 双向控制显隐
  - recordId: 分配记录 id（打开时拉详情）

  emits：
  - update:open
-->
<template>
  <Modal
    :open="open"
    :title="`分配详情 - ${record?.districtName ?? ''}`"
    width="760px"
    centered
    :footer="null"
    @cancel="emit('update:open', false)"
  >
    <div v-if="record" class="mt-8px flex flex-col gap-16px">
      <!-- 摘要条：抽取片区/领域/人数/日期/方式/操作人 -->
      <div class="rd-8px bg-[#F5F9FD] px-16px py-12px">
        <div class="grid grid-cols-4 gap-x-16px gap-y-10px text-13px text-gray-700">
          <div class="min-w-0">
            <div class="text-12px text-gray-400">抽取片区</div>
            <div class="mt-2px truncate font-500">{{ record.districtName }}</div>
          </div>
          <div class="min-w-0 col-span-2">
            <div class="text-12px text-gray-400">抽取领域</div>
            <div class="mt-2px truncate">{{ record.drawFields }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">抽取人数</div>
            <div class="mt-2px truncate">{{ record.drawCount }} 人</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">抽取日期</div>
            <div class="mt-2px truncate">{{ record.drawDate }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">分配方式</div>
            <div class="mt-2px truncate">{{ record.assignFlag ? '指定人员' : '随机抽取' }}</div>
          </div>
          <div class="min-w-0 col-span-2">
            <div class="text-12px text-gray-400">操作人</div>
            <div class="mt-2px truncate">{{ record.createByName || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- 三师 Tab：每 Tab 一位专家的完整信息 -->
      <Tabs v-model:activeKey="tab" type="card">
        <Tabs.TabPane v-for="card in detailCards" :key="card.role">
          <template #tab>
            <span class="flex items-center gap-6px">
              <span>{{ roleLabel(card.role) }}</span>
              <span v-if="card.expert" class="font-500 text-[#3E7DB8]">{{ card.expert.name }}</span>
            </span>
          </template>

          <!-- 专家完整信息：头部卡 + 属性网格 + 两段经历 -->
          <div v-if="card.expert" class="flex flex-col gap-12px pt-4px">
            <!-- 头部：姓名头像 + 职称徽标 + 专业标签 + 单位 -->
            <div class="flex items-center gap-16px rd-8px bg-white b-1 b-solid b-gray-100 px-16px py-14px">
              <div
                class="size-56px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-20px font-500"
              >
                {{ card.expert.name.slice(0, 1) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-18px font-600 text-gray-900">{{ card.expert.name }}</div>
                <div class="mt-6px flex flex-wrap items-center gap-8px">
                  <span
                    class="inline-flex items-center gap-4px rd-4px px-8px py-2px text-12px text-amber-500"
                    :style="{ background: '#FDF3E0' }"
                  >
                    <span class="i-ant-design:check-circle-filled"></span>
                    {{ card.expert.title }}
                  </span>
                  <span
                    class="inline-flex items-center rd-4px px-8px py-2px text-12px text-gray-800"
                    :style="{ background: '#EFF6FF' }"
                  >
                    {{ card.expert.field }}
                  </span>
                  <span class="truncate text-13px text-gray-600">{{ card.expert.org }}</span>
                </div>
              </div>
              <Tag v-if="card.expert.selected" color="success">已入选三师</Tag>
            </div>

            <!-- 属性网格：等宽三列，按顺序从左到右排满一行再换行 -->
            <div class="grid grid-cols-3 gap-x-16px gap-y-10px rd-8px bg-[#F5F9FD] px-16px py-12px text-13px">
              <div class="min-w-0">
                <div class="text-12px text-gray-400">性别 / 年龄</div>
                <div class="mt-2px truncate" :title="`${card.expert.gender} · ${card.expert.age} 岁`">
                  {{ card.expert.gender }} · {{ card.expert.age }} 岁
                </div>
              </div>
              <div class="min-w-0">
                <div class="text-12px text-gray-400">联系电话</div>
                <div class="mt-2px truncate" :title="card.expert.phone">{{ card.expert.phone }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-12px text-gray-400">入库时间</div>
                <div class="mt-2px truncate">{{ card.expert.joinDate }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-12px text-gray-400">身份证号</div>
                <div class="mt-2px truncate" :title="card.expert.idCard">{{ card.expert.idCard }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-12px text-gray-400">单位性质</div>
                <div class="mt-2px truncate">{{ card.expert.orgType }}</div>
              </div>
              <div class="min-w-0">
                <div class="text-12px text-gray-400">单位名称</div>
                <div class="mt-2px truncate" :title="card.expert.org">{{ card.expert.org }}</div>
              </div>
            </div>

            <!-- 主要学习和工作经历 -->
            <div class="rd-8px b-1 b-solid b-gray-100 px-16px py-12px">
              <div class="flex items-center gap-6px text-13px font-500 text-gray-700">
                <span class="i-ant-design:read-outlined text-14px text-[#3E7DB8]"></span>
                主要学习和工作经历
              </div>
              <div class="mt-8px whitespace-pre-wrap text-13px leading-22px text-gray-600">{{
                card.expert.career
              }}</div>
            </div>

            <!-- 过往评审经历 -->
            <div class="rd-8px b-1 b-solid b-gray-100 px-16px py-12px">
              <div class="flex items-center gap-6px text-13px font-500 text-gray-700">
                <span class="i-ant-design:audit-outlined text-14px text-[#3E7DB8]"></span>
                过往评审经历
              </div>
              <div class="mt-8px whitespace-pre-wrap text-13px leading-22px text-gray-600">
                {{ card.expert.reviewExperience }}
              </div>
            </div>
          </div>

          <!-- 该角色未分配 -->
          <div v-else class="flex h-160px items-center justify-center text-14px text-gray-400">该角色未分配专家</div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  </Modal>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawRecordDetailModal">
  import { computed, ref, watch } from 'vue';
  import { Modal, Tabs, Tag } from 'antdv-next';
  import {
    espDrawRecordDetail,
    type EspDrawRecordDetail,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import { roleLabel, type RoleKey } from './shared';

  const props = defineProps({
    open: { type: Boolean, default: false },
    recordId: { type: String, default: '' },
  });

  const emit = defineEmits(['update:open']);

  /** 记录详情（打开时拉取；关闭不清空，避免闪烁） */
  const record = ref<EspDrawRecordDetail | null>(null);
  /** 当前展示的角色 Tab（打开时定位到第一个已分配专家的角色） */
  const tab = ref<RoleKey>('planner');

  watch(
    () => props.open,
    async (open) => {
      if (!open || !props.recordId) return;
      record.value = null;
      record.value = await espDrawRecordDetail(props.recordId);
      const firstAssigned = (['planner', 'architect', 'assessor'] as RoleKey[]).find((role) => record.value?.[role]);
      tab.value = firstAssigned ?? 'planner';
    },
  );

  /** 三个角色卡片（Tab 内容源） */
  const detailCards = computed(() => [
    { role: 'planner' as RoleKey, expert: record.value?.planner ?? null },
    { role: 'architect' as RoleKey, expert: record.value?.architect ?? null },
    { role: 'assessor' as RoleKey, expert: record.value?.assessor ?? null },
  ]);
</script>
