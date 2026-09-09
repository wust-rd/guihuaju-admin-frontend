/** 步骤状态：finish=已完成（灰色实心+打钩） process=当前所处（强调色） wait=未到达（灰描边+数字） */
export type StepStatus = 'finish' | 'process' | 'wait';

/** 步骤条单项 */
export type StepItem = {
  title: string;
  description?: string;
  status?: StepStatus;
};
