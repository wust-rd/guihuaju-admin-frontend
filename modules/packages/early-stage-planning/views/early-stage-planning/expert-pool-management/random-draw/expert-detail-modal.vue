<!--
  三师库 · 随机抽取 —— 专家详情 Modal（卡片履历摘要「更多信息」打开）

  从 index.vue 拆出：专家全部字段（等宽三列顺序排布）+ 两段经历。

  props：
  - open: v-model:open 双向控制显隐
  - expert: 专家行

  emits：
  - update:open
-->
<template>
  <Modal
    :open="open"
    :title="`专家详情 - ${expert?.name ?? ''}`"
    width="720px"
    centered
    :footer="null"
    @cancel="emit('update:open', false)"
  >
    <div v-if="expert" class="mt-8px flex flex-col gap-12px">
      <!-- 属性网格：等宽三列，按顺序从左到右排满一行再换行 -->
      <div class="grid grid-cols-3 gap-x-16px gap-y-10px text-13px text-gray-700">
        <div class="min-w-0">
          <div class="text-12px text-gray-400">姓名</div>
          <div class="mt-2px truncate" :title="expert.name">{{ expert.name }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">性别 / 年龄</div>
          <div class="mt-2px truncate">{{ expert.gender }} · {{ expert.age }} 岁</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">职称</div>
          <div class="mt-2px truncate">{{ expert.title }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">专业领域</div>
          <div class="mt-2px truncate">{{ expert.field }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">联系电话</div>
          <div class="mt-2px truncate" :title="expert.phone">{{ expert.phone }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">单位名称</div>
          <div class="mt-2px truncate" :title="expert.org">{{ expert.org }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">单位性质</div>
          <div class="mt-2px truncate">{{ expert.orgType }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">入库时间</div>
          <div class="mt-2px truncate">{{ expert.joinDate }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">身份证号</div>
          <div class="mt-2px truncate" :title="expert.idCard">{{ expert.idCard }}</div>
        </div>
        <div class="min-w-0">
          <div class="text-12px text-gray-400">是否已入选三师</div>
          <div class="mt-2px truncate">{{ expert.selected ? '是' : '否' }}</div>
        </div>
      </div>

      <div class="border-t border-gray-100 pt-10px">
        <div class="text-12px text-gray-400">主要学习和工作经历</div>
        <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{ expert.career }}</div>
      </div>

      <div class="border-t border-gray-100 pt-10px">
        <div class="text-12px text-gray-400">过往评审经历</div>
        <div class="mt-6px whitespace-pre-wrap text-13px leading-22px text-gray-700">{{ expert.reviewExperience }}</div>
      </div>
    </div>
  </Modal>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawExpertDetailModal">
  import { Modal } from 'antdv-next';
  import type { EspExpert } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

  defineProps({
    open: { type: Boolean, default: false },
    expert: { type: Object as () => EspExpert | null, default: null },
  });

  const emit = defineEmits(['update:open']);
</script>
