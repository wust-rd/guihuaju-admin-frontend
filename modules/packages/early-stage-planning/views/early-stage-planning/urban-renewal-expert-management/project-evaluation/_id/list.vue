<!--
  市住更局 —— 城市更新专家管理 · 项目评估 详情页（二级页面）

  从项目评估列表「查看」进入，整页展示项目全部信息。
  规划路由（RESTful，后端隐藏菜单，待注册）：
   - 链接地址：/early-stage-planning/urban-renewal-expert-management/project-evaluation/{id}（{id}=记录编码 code）
   - 组件位置：early-stage-planning/urban-renewal-expert-management/project-evaluation/_id/list
   - 是否可见：隐藏；上级菜单挂「项目评估」以点亮侧边栏
  页面结构：头部卡（项目名称/状态/返回）→ 基本信息 → 主要项目内容 → 评估材料 → 参与专家（含组长标记）。
-->
<template>
  <PageWrapper contentClass="flex flex-col gap-16px">
    <template v-if="project">
      <!-- 头部卡 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="flex items-center gap-16px">
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-12px">
              <span class="text-22px font-600 text-gray-900">{{ project.name }}</span>
              <Tag :color="STATUS_COLOR[project.status] || 'default'">{{ project.status }}</Tag>
            </div>
            <div class="mt-6px flex items-center gap-16px text-13px text-gray-500">
              <span>{{ project.adminDistrict }} · {{ project.district }}</span>
              <span>项目编号：{{ project.code }}</span>
              <span>开始时间：{{ project.startDate }}</span>
            </div>
          </div>
          <a-button @click="goBack">
            <span class="inline-flex items-center gap-4px">
              <span class="i-ant-design:arrow-left-outlined"></span> 返回列表
            </span>
          </a-button>
        </div>
      </div>

      <!-- 基本信息 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">基本信息</div>
        <div class="mt-16px grid grid-cols-3 gap-x-16px gap-y-12px text-14px">
          <div class="min-w-0">
            <div class="text-12px text-gray-400">行政区</div>
            <div class="mt-4px text-gray-700">{{ project.adminDistrict }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">片区名称</div>
            <div class="mt-4px text-gray-700">{{ project.district }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">评估模式</div>
            <div class="mt-4px text-gray-700">{{ project.reviewMode }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">统筹主体</div>
            <div class="mt-4px text-gray-700">{{ project.coordinator }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">实施主体</div>
            <div class="mt-4px text-gray-700">{{ project.implementOrg }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">责任部门</div>
            <div class="mt-4px text-gray-700">{{ project.dept }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">资金来源</div>
            <div class="mt-4px text-gray-700">{{ project.fundSource || '—' }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">项目投资估算（亿元）</div>
            <div class="mt-4px text-gray-700">{{ project.investment || '—' }}</div>
          </div>
          <div class="min-w-0">
            <div class="text-12px text-gray-400">组长</div>
            <div class="mt-4px text-gray-700">{{ project.leader || '—' }}</div>
          </div>
        </div>
      </div>

      <!-- 主要项目内容 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">主要项目内容</div>
        <p class="mt-12px whitespace-pre-wrap text-14px leading-26px text-gray-700">{{ project.content || '—' }}</p>
      </div>

      <!-- 评估材料 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">评估材料（{{ project.materials.length }}）</div>
        <div class="mt-12px space-y-10px">
          <div
            v-for="(m, i) in project.materials"
            :key="i"
            class="flex items-center gap-12px rd-8px bg-[#F7F9FC] px-16px py-12px"
          >
            <span class="i-ant-design:file-text-outlined text-18px text-[#3A8EF6]"></span>
            <span class="flex-1 truncate text-14px text-gray-700" :title="m">{{ m }}</span>
          </div>
          <div v-if="project.materials.length === 0" class="text-13px text-gray-400">无评估材料</div>
        </div>
      </div>

      <!-- 参与专家 -->
      <div class="bg-white rd-12px b-1 b-solid b-gray-100 p-24px shadow-sm">
        <div class="text-16px font-600 text-gray-800">参与专家（{{ project.experts.length }} 名）</div>
        <div class="mt-12px grid grid-cols-3 gap-16px">
          <div
            v-for="name in project.experts"
            :key="name"
            class="rd-8px b-1 b-solid b-gray-100 p-16px"
            :class="name === project.leader ? 'border-[#3A8EF6] bg-[#F0F6FF]' : ''"
          >
            <div class="flex items-center gap-10px">
              <div
                class="size-40px shrink-0 rd-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-16px font-500"
              >
                {{ name.slice(0, 1) }}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-6px">
                  <span class="text-15px font-500 text-gray-800">{{ name }}</span>
                  <span
                    v-if="name === project.leader"
                    class="rd-4px px-6px py-2px text-12px text-white"
                    style="background: #3a8ef6"
                    >组长</span
                  >
                </div>
                <div class="mt-4px truncate text-13px text-gray-500">{{ expertOf(name)?.org || '—' }}</div>
                <div class="mt-2px text-13px text-gray-500">{{ expertOf(name)?.phone || '—' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="flex h-300px items-center justify-center text-14px text-gray-400">未找到该项目</div>
  </PageWrapper>
</template>
<script lang="ts" setup name="ViewsEarlyStageUrbanRenewalExpertProjectDetail">
  import { computed, unref } from 'vue';
  import { Tag } from 'antdv-next';
  import { router } from '@jeesite/core/router';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { useGo } from '@jeesite/core/hooks/web/usePage';
  import { useUrbanExpertStore } from '../../expert-store';

  const store = useUrbanExpertStore();
  const go = useGo();

  /** 状态颜色（评估中=蓝 处理中，待提交=橙 警告，已完成=绿 成功） */
  const STATUS_COLOR: Record<string, string> = {
    评估中: 'processing',
    待提交: 'warning',
    已完成: 'success',
  };

  const { params } = unref(router.currentRoute);
  // 兼容菜单链接地址占位符写 {id} 或 {code}：路由参数名与占位符一致；{id} 为记录编码 code
  const projectCode = ((params.id ?? params.code) as string) || '';

  /** 按编码反查项目（store 响应式：编辑后详情同步） */
  const project = computed(() => store.projects.find((p) => p.code === projectCode));

  /** 按姓名反查专家（展示单位/电话） */
  function expertOf(name: string) {
    return store.experts.find((e) => e.name === name);
  }

  function goBack() {
    go('/early-stage-planning/urban-renewal-expert-management/project-evaluation/index');
  }
</script>
