/**
 * @jeesite/ui —— 通用 UI 组件包
 *
 * 与 antdv-next 并存的轻量自绘组件：antdv 样式无法完全定制的场景在此定制。
 * - Stepper：shadcn-vue stepper 的定制移植（状态驱动、无 reka-ui 依赖），
 *   用于生命周期/流程步骤条（如项目库 策划→储备→实施）。
 */
export { default as Stepper } from './src/stepper.vue';
export type { StepItem, StepStatus } from './src/types';
