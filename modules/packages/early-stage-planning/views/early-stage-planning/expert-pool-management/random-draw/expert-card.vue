<!--
  三师库 · 随机抽取 —— 抽取结果单张专家卡片

  从 index.vue 拆出：角色标签 + 头像/姓名/职称徽标/专业标签/单位 + 履历摘要 + 电话 + 单卡操作。
  纯展示 + 事件上抛（replace/assign/detail），不含业务逻辑。

  props：
  - role: 三师角色 key
  - expert: 专家行（null = 该角色未匹配到专家，显示占位）

  emits：
  - replace: 单卡随机更换
  - assign: 指定人员
  - detail: 查看专家详情（履历摘要「更多信息」）
-->
<template>
  <div
    class="relative rd-12px p-20px shadow-sm transition-shadow hover:shadow-md w-400px h-218px shrink-0 bg-white overflow-hidden"
  >
    <!-- 承担角色标签：右上角，蓝色与外层容器同色系 -->
    <span
      class="absolute right-0px top-0px rd-tr-12px rd-bl-12px w-92px flex justify-center items-center px-10px py-4px text-14px text-white"
      :style="{ background: '#519BD4' }"
    >
      {{ roleLabel(role) }}
    </span>

    <template v-if="expert">
      <!-- 头部：头像 + 姓名 + 职称徽标（黄色勾 + 浅黄底）+ 专业标签（浅蓝底）+ 单位 -->
      <div class="flex gap-16px h-58px items-center">
        <div
          class="size-48px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-18px font-500"
        >
          {{ expert.name.slice(0, 1) }}
        </div>

        <div class="min-w-0 flex-1">
          <div class="text-16px font-500 text-gray-800">{{ expert.name }}</div>

          <div class="flex items-center gap-6px overflow-hidden">
            <!-- 职称：勾图标 + 浅黄底徽标 -->
            <div
              class="inline-flex shrink-0 items-center gap-2px rd-4px px-6px py-2px text-12px text-amber-500"
              :style="{ background: '#FDF3E0' }"
            >
              <div class="i-ant-design:check-circle-filled"></div>
              {{ expert.title }}
            </div>

            <!-- 专业领域：浅蓝底标签 -->
            <div
              class="inline-flex shrink-0 items-center rd-4px px-6px py-2px text-12px text-gray-800"
              :style="{ background: '#EFF6FF' }"
            >
              {{ expert.field }}
            </div>
            <!-- 单位名称 -->
            <div class="min-w-0 flex-1 truncate text-13px text-gray-800">{{ expert.org }}</div>
          </div>
        </div>
      </div>

      <!-- 履历摘要：浅色底块 -->
      <div class="mt-12px rd-8px p-10px" :style="{ background: '#F5F9FD' }">
        <div class="line-clamp-2 text-14px leading-22px text-gray-600">
          {{ expert.career }}
          <a class="whitespace-nowrap font-500 text-cyan-600" @click="emit('detail', expert)">... 更多信息 ></a>
        </div>
      </div>

      <!-- 底部：电话 + 单卡操作（浅蓝底按钮） -->
      <div class="mt-12px flex items-center justify-between">
        <span class="flex items-center gap-6px text-13px text-gray-700">
          <span class="i-ant-design:phone-outlined"></span>
          {{ expert.phone }}
        </span>
        <div class="flex items-center gap-8px">
          <a-button
            class="rd-8px"
            :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
            @click="emit('replace')"
          >
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:redo-outlined"></span> 随机更换
            </span>
          </a-button>
          <a-button
            type="primary"
            class="rd-8px"
            :style="{ background: '#F5F9FD', borderColor: '#D9E6F2', color: '#3E7DB8' }"
            @click="emit('assign')"
          >
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:user-add-outlined"></span> 指定人员
            </span>
          </a-button>
        </div>
      </div>
    </template>

    <!-- 空态：该角色没匹配到专家 -->
    <div v-else class="flex h-full items-center justify-center text-14px text-gray-400">未匹配到符合条件专家</div>
  </div>
</template>
<script lang="ts" setup name="ViewsEarlyStagePlanningExpertPoolRandomDrawExpertCard">
  import type { EspExpert } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';
  import { roleLabel, type RoleKey } from './shared';

  defineProps({
    role: { type: String as () => RoleKey, required: true },
    expert: { type: Object as () => EspExpert | null, default: null },
  });

  const emit = defineEmits(['replace', 'assign', 'detail']);
</script>
