<!--
  市住更局 —— 随机分配三师（三师库管理）

  为「片区 × 专业领域 × 三师角色」随机分配专家：
  - 上方面板：片区手填 + 专业领域多选（全选/清空一键切换）+ 三师角色复选（默认不勾）+ 回避规则 + 重置/抽取；
  - 点击抽取：按勾选的三师数量生成对应数量的专家卡片（各卡片带责任角色标签）；
  - 卡片操作：单卡「随机更换」换同角色专家、「指定人员」弹出 Modal 按姓名/领域/单位/电话模糊搜索并单选指定；
  - 结果右侧「确认选用」生成一条分配记录（整批重抽直接点「抽取」）；
  - 下方「分配记录」列表展示每条记录（时间/抽取片区/抽取领域/抽取人数/三师/详情）。
  已接后端（modules/esp）：字典（1.1/1.2）、抽取（3.1）、单角色更换（3.2）、确认选用（3.3）、
  分配记录（3.4/3.5）走接口层 @jeesite/early-stage-planning/api/early-stage-planning/expert-pool。
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
          <Input
            v-model:value="query.district"
            placeholder="请输入片区名称"
            class="w-180px"
            :bordered="false"
            allowClear
          />
        </div>

        <div class="flex items-center gap-8px bg-black/2 h-40px b-1 b-solid b-black/4 rd-8px px-12px">
          <span class="w-60px shrink-0 text-right text-14px text-gray-500">专业领域</span>
          <!-- 一键全选 / 全不选 -->
          <a-button type="link" size="small" class="h-24px px-0px text-13px" @click="toggleAllFields(true)"
            >全选</a-button
          >
          <a-button
            type="link"
            size="small"
            class="h-24px px-0px text-13px"
            :disabled="query.fields.length === 0"
            @click="toggleAllFields(false)"
            >清空</a-button
          >
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

    <!-- 分配详情 Modal：摘要条 + 三师 Tab 切换（每 Tab 展示该角色专家完整信息） -->
    <Modal
      v-model:open="detailModal.open"
      :title="`分配详情 - ${detailModal.record?.districtName ?? ''}`"
      width="760px"
      centered
      :footer="null"
    >
      <div v-if="detailModal.record" class="mt-8px flex flex-col gap-16px">
        <!-- 摘要条：抽取片区/领域/人数/日期/方式/操作人 -->
        <div class="rd-8px bg-[#F5F9FD] px-16px py-12px">
          <div class="grid grid-cols-4 gap-x-16px gap-y-10px text-13px text-gray-700">
            <div class="min-w-0">
              <div class="text-12px text-gray-400">抽取片区</div>
              <div class="mt-2px truncate font-500">{{ detailModal.record.districtName }}</div>
            </div>
            <div class="min-w-0 col-span-2">
              <div class="text-12px text-gray-400">抽取领域</div>
              <div class="mt-2px truncate">{{ detailModal.record.drawFields }}</div>
            </div>
            <div class="min-w-0">
              <div class="text-12px text-gray-400">抽取人数</div>
              <div class="mt-2px truncate">{{ detailModal.record.drawCount }} 人</div>
            </div>
            <div class="min-w-0">
              <div class="text-12px text-gray-400">抽取日期</div>
              <div class="mt-2px truncate">{{ detailModal.record.drawDate }}</div>
            </div>
            <div class="min-w-0">
              <div class="text-12px text-gray-400">分配方式</div>
              <div class="mt-2px truncate">{{ detailModal.record.assignFlag ? '指定人员' : '随机抽取' }}</div>
            </div>
            <div class="min-w-0 col-span-2">
              <div class="text-12px text-gray-400">操作人</div>
              <div class="mt-2px truncate">{{ detailModal.record.createByName || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- 三师 Tab：每 Tab 一位专家的完整信息 -->
        <Tabs v-model:activeKey="detailModal.tab" type="card">
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
            ><div class="mt-2px truncate" :title="expertModal.expert.name">{{ expertModal.expert.name }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">性别 / 年龄</div
            ><div class="mt-2px truncate">
              {{ expertModal.expert.gender }} · {{ expertModal.expert.age }} 岁
            </div></div
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
            ><div class="mt-2px truncate" :title="expertModal.expert.phone">{{ expertModal.expert.phone }}</div></div
          >
          <div class="min-w-0"
            ><div class="text-12px text-gray-400">单位名称</div
            ><div class="mt-2px truncate" :title="expertModal.expert.org">{{ expertModal.expert.org }}</div></div
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
            ><div class="mt-2px truncate" :title="expertModal.expert.idCard">{{ expertModal.expert.idCard }}</div></div
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
  import { Checkbox, Input, Modal, Select, Tabs, Tag } from 'antdv-next';
  import { PageWrapper } from '@jeesite/core/components/Page';
  import { BasicTable, BasicColumn, useTable } from '@jeesite/core/components/Table';
  import { useMessage } from '@jeesite/core/hooks/web/useMessage';
  import {
    espDictOptions,
    espDrawConfirm,
    espDrawDraw,
    espDrawRecordDetail,
    espDrawRecords,
    espDrawReplace,
    espExpertPage,
    type EspDrawRecordDetail,
    type EspExpert,
    type EspRole,
  } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

  type RoleKey = EspRole;

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

  const EXPERT_FIELD_FALLBACK = ['城乡规划学', '建筑学', '市政工程', '交通工程'];

  /** 专业领域下拉（接口 1.1 字典；加载前静态兜底） */
  const FIELD_OPTIONS = ref(EXPERT_FIELD_FALLBACK.map((f) => ({ label: f, value: f })));
  espDictOptions().then((dict) => {
    FIELD_OPTIONS.value = dict.fields.map((f) => ({ label: f, value: f }));
  });

  /** 三师角色勾选状态（默认全部不勾选） */
  const typeChecked = reactive<Record<RoleKey, boolean>>({ planner: false, architect: false, assessor: false });

  /** 抽取条件（片区手填、专业领域多选） */
  const query = reactive({
    district: undefined as string | undefined,
    fields: [] as string[],
    avoidDrawn: true,
  });

  /** 专业领域一键全选 / 全不选 */
  function toggleAllFields(selectAll: boolean) {
    query.fields = selectAll ? FIELD_OPTIONS.value.map((o) => o.value) : [];
  }

  /** 抽取结果：每个勾选的角色一个卡片（接口 3.1 返回三角色专家，按勾选角色过滤展示） */
  const results = ref<{ role: RoleKey; expert: EspExpert | null }[]>([]);
  /** 抽取中 loading */
  const drawing = ref(false);

  /** 指定人员 Modal 状态 */
  const assignModal = reactive({
    open: false,
    role: 'planner' as RoleKey,
    keyword: '',
    field: undefined as string | undefined,
    selectedId: null as string | null,
  });

  /** 记录详情 Modal 状态（接口 3.5 详情行，含三角色完整专家行；tab 为当前展示的角色） */
  const detailModal = reactive({
    open: false,
    tab: 'planner' as RoleKey,
    record: null as EspDrawRecordDetail | null,
  });

  /** 专家详情 Modal 状态（履历摘要「更多信息」） */
  const expertModal = reactive({
    open: false,
    expert: null as EspExpert | null,
  });

  const { showMessage } = useMessage();

  /** 记录列表列（接口 3.4 字段：drawDate/districtName/drawFields/drawCount/xxxName） */
  const recordColumns: BasicColumn[] = [
    { title: '时间', dataIndex: 'drawDate', width: 110 },
    { title: '抽取片区', dataIndex: 'districtName', width: 140 },
    { title: '抽取领域', dataIndex: 'drawFields', width: 320, ellipsis: true },
    { title: '抽取人数', dataIndex: 'drawCount', width: 90, align: 'center' },
    { title: '责任规划师', dataIndex: 'plannerName', width: 110 },
    { title: '责任建筑师', dataIndex: 'architectName', width: 110 },
    { title: '责任评估师', dataIndex: 'assessorName', width: 110 },
    { title: '操作', dataIndex: 'operation', width: 90, slot: 'operation' },
  ];

  /** 分配记录（服务端分页，接口 3.4；确认选用后 reload） */
  const [registerTable, { reload }] = useTable({
    api: espDrawRecords,
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

  /** 抽取 / 整批随机更换（接口 3.1：服务端按 规划师→建筑师→评估师 各抽一名，同批次不重复） */
  async function handleDraw() {
    const roles = checkedTypes();
    if (roles.length === 0) {
      message.warning('请至少勾选一种三师类型');
      return;
    }
    if (!query.district?.trim()) {
      message.warning('请先填写片区');
      return;
    }
    drawing.value = true;
    try {
      const data = await espDrawDraw({
        districtCode: query.district,
        fields: query.fields,
        roles,
        avoidDrawn: query.avoidDrawn,
      });
      results.value = roles.map((role) => ({ role, expert: data[role] ?? null }));
    } finally {
      drawing.value = false;
    }
  }

  /** 单卡随机更换（接口 3.2：换同角色另一位专家，其余卡片不动；排除当前批次已抽中的） */
  async function replaceOne(card: { role: RoleKey; expert: EspExpert | null }) {
    const excludeIds = results.value.map((r) => r.expert?.id).filter((v): v is string => !!v);
    try {
      const { expert } = await espDrawReplace({
        fields: query.fields,
        role: card.role,
        avoidDrawn: query.avoidDrawn,
        excludeIds,
      });
      results.value = results.value.map((r) => (r.role === card.role ? { ...r, expert } : r));
    } catch (e: any) {
      message.warning(e?.message || '没有更多符合条件的专家可供更换');
    }
  }

  /** 指定人员候选池（接口 2.1 拉全库，pageSize=100 上限；打开 Modal 时加载） */
  const assignPool = ref<EspExpert[]>([]);
  async function loadAssignPool() {
    const { list } = await espExpertPage({ pageNum: 1, pageSize: 100 });
    assignPool.value = list;
  }

  /** 指定人员候选列表：关键词（姓名/单位/电话）模糊 + 专业领域筛选；排除已在其他卡片上的专家（一人只当一师） */
  const assignCandidates = computed(() => {
    const kw = assignModal.keyword.trim();
    const field = assignModal.field;
    const usedIds = results.value
      .filter((r) => r.role !== assignModal.role)
      .map((r) => r.expert?.id)
      .filter((v): v is string => typeof v === 'string');
    return assignPool.value.filter((e) => {
      if (usedIds.includes(e.id)) return false;
      if (field && e.field !== field) return false;
      if (kw && !e.name.includes(kw) && !e.org.includes(kw) && !e.phone.includes(kw)) return false;
      return true;
    });
  });

  /** 打开指定人员 Modal（记录当前卡片角色；加载候选池） */
  function openAssign(card: { role: RoleKey; expert: EspExpert | null }) {
    assignModal.role = card.role;
    assignModal.keyword = '';
    assignModal.field = undefined;
    assignModal.selectedId = null;
    assignModal.open = true;
    if (assignPool.value.length === 0) loadAssignPool();
  }

  /** 指定人员：把选中的专家替换到该角色卡片（确认时走 3.3 并带 assignFlag=true） */
  function confirmAssign() {
    const matched = assignPool.value.find((e) => e.id === assignModal.selectedId);
    if (!matched) {
      message.warning('请先选择一名专家');
      return;
    }
    results.value = results.value.map((r) => (r.role === assignModal.role ? { ...r, expert: matched } : r));
    assignModal.open = false;
  }

  /** 确认选用（接口 3.3：落分配记录 + 专家置已入选；「指定人员」方式确认带 assignFlag=true） */
  async function handleConfirm() {
    if (results.value.length === 0) {
      message.warning('请先抽取');
      return;
    }
    if (!query.district?.trim()) {
      message.warning('请先填写片区');
      return;
    }
    const assigned = results.value.filter((r) => r.expert);
    if (assigned.length === 0) {
      message.warning('没有已分配专家');
      return;
    }
    const idOf = (role: RoleKey) => results.value.find((r) => r.role === role)?.expert?.id ?? null;
    // 抽取领域 = 勾选的筛选领域（与接口约定一致：按条件确认）
    await espDrawConfirm({
      districtCode: query.district,
      fields: query.fields,
      plannerId: idOf('planner'),
      architectId: idOf('architect'),
      assessorId: idOf('assessor'),
      assignFlag: false,
    });
    showMessage('已生成一条分配记录');
    results.value = [];
    reload();
  }

  /** 打开记录详情 Modal（接口 3.5：详情含三角色完整专家行；默认切到第一个已分配专家的角色） */
  async function showRecordDetail(record: Recordable) {
    detailModal.open = true;
    detailModal.record = null;
    detailModal.record = await espDrawRecordDetail(String(record.id));
    const firstAssigned = (['planner', 'architect', 'assessor'] as RoleKey[]).find(
      (role) => detailModal.record?.[role],
    );
    detailModal.tab = firstAssigned ?? 'planner';
  }

  /** 打开专家详情 Modal（卡片履历摘要「更多信息」） */
  function openExpertDetail(expert: EspExpert) {
    expertModal.expert = expert;
    expertModal.open = true;
  }

  /** 详情 Modal 的三行卡片（三师角色；接口详情行直接带 planner/architect/assessor 完整专家行） */
  const detailCards = computed(() => {
    const rec = detailModal.record;
    if (!rec) return [];
    return [
      { role: 'planner' as RoleKey, expert: rec.planner ?? null },
      { role: 'architect' as RoleKey, expert: rec.architect ?? null },
      { role: 'assessor' as RoleKey, expert: rec.assessor ?? null },
    ];
  });

  /** 重置：所有配置都不填不选（片区空、领域空、三师全不勾、回避规则不勾）并清空结果 */
  function handleReset() {
    query.district = undefined;
    query.fields = [];
    query.avoidDrawn = false;
    typeChecked.planner = false;
    typeChecked.architect = false;
    typeChecked.assessor = false;
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
