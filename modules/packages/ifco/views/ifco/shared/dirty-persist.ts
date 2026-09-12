/**
 * ifco 填报页共用 —— 脏列自动落库工厂（进展/成效两域同构）
 *
 * "填一列保存一列"为机制：点其它列编辑 / 切类目页签 / 新增列 / 带入前，
 * 先把脏列登记（dirtyCols）里未保存的列依次落库；失败的列保留在登记中并提示
 * 可点顶部「保存」重试。进展域登记项为 {leafKey, col}、成效域为 col，
 * 由调用方通过 persist 回调适配各自 persistColumn 签名。
 */
export function createAutoPersist<T>(
  dirtyCols: Map<string, T>,
  persist: (entry: T) => Promise<void>,
  showMessage: (msg: string) => void,
): () => Promise<void> {
  return async function autoPersistDirty() {
    if (!dirtyCols.size) return;
    let failed = 0;
    let firstError = '';
    for (const [, entry] of [...dirtyCols]) {
      try {
        await persist(entry);
      } catch (e: unknown) {
        failed += 1;
        firstError ||= e instanceof Error ? e.message : '保存失败';
      }
    }
    if (failed > 0) {
      showMessage(`自动保存：有 ${failed} 列失败（${firstError}），该列仍待保存，可点顶部「保存」重试`);
    }
  };
}
