/**
 * ifco 填报页共用 —— 单元格键盘导航（进展/成效两域同构，纯 DOM 逻辑）
 *
 * Enter/↓ = 下一个可填单元格，↑ = 上一个；仅编辑列纵向跳（其它列没有输入框），
 * 自动跳过汇总/项目数/节标题等只读行；成效域双值格（数|面积）同行两框先左右
 * 衔接再跳下一行。捕获阶段由调用方（单元格容器 onKeydownCapture）保证拦截在
 * InputNumber 自身的上下键调值之前。
 */

/** 聚焦目标输入框并全选内容（便于直接覆盖输入） */
export function focusCellInput(el: HTMLElement) {
  el.focus();
  (el as HTMLInputElement).select?.();
}

/** 单元格键盘导航处理器：绑定在单元格容器捕获阶段（onKeydownCapture） */
export function handleCellNav(e: KeyboardEvent) {
  if (e.key !== 'Enter' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
  e.preventDefault();
  e.stopPropagation();
  const cur = e.target as HTMLInputElement;
  const row = cur.closest('tr');
  if (!row) return;
  const down = e.key !== 'ArrowUp';
  const rowInputs = Array.from(row.querySelectorAll('input'));
  const inRowNext = down ? rowInputs[rowInputs.indexOf(cur) + 1] : rowInputs[rowInputs.indexOf(cur) - 1];
  if (inRowNext) {
    focusCellInput(inRowNext);
    return;
  }
  let r: HTMLElement | null = row;
  while ((r = (down ? r.nextElementSibling : r.previousElementSibling) as HTMLElement | null)) {
    const list = Array.from(r.querySelectorAll('input'));
    const target = down ? list[0] : list[list.length - 1];
    if (target) {
      focusCellInput(target);
      return;
    }
  }
}
