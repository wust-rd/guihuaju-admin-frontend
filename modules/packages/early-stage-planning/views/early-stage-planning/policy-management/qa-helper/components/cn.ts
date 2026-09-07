/**
 * 类名拼接工具(ai-elements-vue 同名工具的零依赖版;
 * shadcn 原版基于 clsx + tailwind-merge,本项目无 Tailwind,仅做拼接)
 */

/** 与 Vue HTMLAttributes['class'] 对齐的类名类型(对象形式本项目不使用,直接忽略) */
type ClassValue = string | Record<string, any> | false | null | undefined;

export function cn(...args: ClassValue[]): string {
  return args.filter((arg): arg is string => typeof arg === 'string' && arg.length > 0).join(' ');
}
