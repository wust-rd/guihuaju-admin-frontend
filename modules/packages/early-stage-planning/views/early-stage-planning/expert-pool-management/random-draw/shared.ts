/**
 * 三师库 · 随机抽取共享常量与工具（子组件共用，避免各文件重复定义）
 */

import type { EspRole } from '@jeesite/early-stage-planning/api/early-stage-planning/expert-pool';

/** 三师角色 key（重导出便于子组件引用） */
export type RoleKey = EspRole;

/** 三师角色选项（抽取器复选框用；勾选几个就抽几个卡片） */
export const TYPE_OPTIONS: { label: string; value: RoleKey }[] = [
  { label: '责任规划师', value: 'planner' },
  { label: '责任建筑师', value: 'architect' },
  { label: '责任评估师', value: 'assessor' },
];

/** 角色 → 中文标签 */
export const ROLE_LABEL: Record<RoleKey, string> = {
  planner: '责任规划师',
  architect: '责任建筑师',
  assessor: '责任评估师',
};

/** 角色中文标签（模板快捷用） */
export const roleLabel = (role: RoleKey): string => ROLE_LABEL[role];
