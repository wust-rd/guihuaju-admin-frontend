import { ref, watch } from 'vue';
import { defineComponent } from 'vue';
import type { PropType } from 'vue';
import { Radio, RadioGroup, TextArea } from 'antdv-next';
import type { ProjectReviewEntry, ProjectReviewEntryMap } from '@jeesite/ifco/api/ifco/project-library';
import { REVIEW_RESULT_OPTIONS } from '@jeesite/ifco/api/ifco/project-library';

/**
 * ifco —— 在库项目管理 · 联合审查机构审查区块（审查文件页签各 FormGroup 底部共用）
 *
 * 标题与机构切换同一行：[审查图标 + 联合审查机构审查] + RadioGroup 按钮组
 * （四机构，按钮带审查状态标记 ✓符合 ✗不符合 —不涉及 ·未审查）；
 * 下方为当前机构的 审查结论（三选一）+ 审查意见。空间恒定：机构再多也只有一行。
 * 机构清单=固定四家联合审查机构；查看态内容只读、机构可切换查看。
 */
export const ReviewBlock = defineComponent({
  name: 'IfcoProjectLibraryReviewBlock',
  props: {
    /** 各机构审查数据（key=机构名） */
    entries: { type: Object as PropType<ProjectReviewEntryMap>, required: true },
    /** 机构清单 */
    orgList: { type: Array as PropType<string[]>, required: true },
    /** 查看态：结论/意见只读（机构仍可切换查看） */
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:entries'],
  setup(props, { emit }) {
    const activeOrg = ref(props.orgList[0] ?? '');

    watch(
      () => props.orgList,
      (list) => {
        if (!list.includes(activeOrg.value)) activeOrg.value = list[0] ?? '';
      },
    );

    const resultOptions = REVIEW_RESULT_OPTIONS.map((label) => ({ label, value: label }));

    const activeEntry = (): ProjectReviewEntry => props.entries[activeOrg.value] ?? { result: '', opinion: '' };

    /** 机构按钮上的审查状态标记 */
    function statusMark(result: string | undefined) {
      switch (result) {
        case '符合':
          return <span class="ml-2px text-12px text-#52c41a">✓</span>;
        case '不符合':
          return <span class="ml-2px text-12px text-#ff4d4f">✗</span>;
        case '不涉及':
          return <span class="ml-2px text-12px text-gray-400">—</span>;
        default:
          return <span class="ml-2px text-12px text-gray-300">·</span>;
      }
    }

    function patchEntry(patch: Partial<ProjectReviewEntry>) {
      emit('update:entries', {
        ...props.entries,
        [activeOrg.value]: { ...activeEntry(), ...patch },
      });
    }

    return () => (
      <div class="mt-16px">
        {/* 标题 + 机构切换（RadioGroup 按钮组）同一行 */}
        <div class="mb-8px flex flex-wrap items-center gap-x-40px gap-y-4px">
          <div class="flex shrink-0 items-center gap-6px">
            <span class="i-ant-design:audit-outlined text-16px text-#1677ff"></span>
            <span class="text-16px font-500 text-gray-800">联合审查机构审查</span>
          </div>
          <RadioGroup
            value={activeOrg.value}
            size="small"
            optionType="button"
            onUpdate:value={(value?: string | number) => (activeOrg.value = String(value ?? ''))}
          >
            {props.orgList.map((org) => (
              <Radio key={org} value={org}>
                {org}
                {statusMark(props.entries[org]?.result)}
              </Radio>
            ))}
          </RadioGroup>
        </div>
        <div class="flex items-center gap-16px">
          <span class="shrink-0 text-13px text-gray-600">审查结论</span>
          <RadioGroup
            value={activeEntry().result}
            options={resultOptions}
            disabled={props.disabled}
            onUpdate:value={(value?: string | number) => patchEntry({ result: String(value ?? '') })}
          />
        </div>
        <div class="mt-8px flex gap-8px">
          <span class="w-56px shrink-0 pt-4px text-right text-13px text-gray-600">审查意见</span>
          <TextArea
            value={activeEntry().opinion}
            rows={2}
            maxlength={200}
            disabled={props.disabled}
            placeholder="请输入审查意见"
            onUpdate:value={(value?: string | number) => patchEntry({ opinion: String(value ?? '') })}
          />
        </div>
      </div>
    );
  },
});

export default ReviewBlock;
