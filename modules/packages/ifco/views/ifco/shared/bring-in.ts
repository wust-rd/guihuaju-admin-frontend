/**
 * ifco 填报页共用 —— 带入上一季度弹窗控制器（进展/成效两域同构）
 *
 * 三种带入模式（后端 bringIn 的 force / namesOnly 参数）：
 * - normal 普通带入：连数值一起带入，同名项目列跳过，每周期一次（已带入提示）
 * - names  仅名称：只建列不复制数值，同名跳过，不消耗一次性机会（幂等可重复）
 * - force  强制带入：跳过一次性限制，同名项目列数值被上一季度覆盖（红色按钮 + 二次确认）
 *
 * 页面通过 createBringInController 注入各自域的 API 与状态引用，
 * 返回弹窗开关、执行态与三个事件处理器，直接绑定模板。
 */
import { ref, type Ref } from 'vue';
import { Modal } from 'antdv-next';

/** 带入结果（两域接口返回的结构子集） */
export type BringInResultLike = {
  broughtProjectCount: number;
  overwrittenProjectCount?: number;
  skippedProjectCount?: number;
  fromYear: string;
  fromQuarter: string;
};

/** 带入 API 形态（progress-fill / effect-fill 两域各自的 bringInPrevPeriod） */
export type BringInApi = (params: {
  year: number | string;
  quarter: string;
  unit: string;
  force?: boolean;
  namesOnly?: boolean;
}) => Promise<BringInResultLike>;

export type BringInControllerOptions = {
  /** 当前选中单位编码 */
  reportUnit: Ref<string | undefined>;
  /** 年份 */
  year: Ref<number>;
  /** 季度（'1'~'4'） */
  quarter: Ref<string>;
  /** 整包加载态（按钮禁用） */
  loading: Ref<boolean>;
  /** 本周期已带入标记（fill/data 返回） */
  broughtIn: Ref<boolean>;
  /** 各域的带入接口 */
  bringInApi: BringInApi;
  /** 切换前自动落库脏列（shared/dirty-persist 工厂产物） */
  autoPersistDirty: () => Promise<void>;
  /** 带入成功后整包重载 */
  reload: () => Promise<void>;
  /** 退出编辑态（页面 resetEditState） */
  resetEditState: () => void;
  /** 清空脏列登记（重载前丢弃本地编辑态） */
  clearDirty: () => void;
  /** 季度文案（quarterLabel） */
  quarterLabel: (quarter: string) => string;
  showMessage: (msg: string) => void;
};

/** 弹窗成功后的提示文案（两域共用措辞） */
function resultMessage(mode: 'normal' | 'names' | 'force', res: BringInResultLike, quarterLabelOf: (q: string) => string) {
  if (mode === 'names') {
    return `已带入 ${res.fromYear} 年${quarterLabelOf(res.fromQuarter)}的项目名称 ${res.broughtProjectCount} 列（值留空，由您填写）`;
  }
  const parts = [`新增 ${res.broughtProjectCount} 列`];
  if (res.overwrittenProjectCount) parts.push(`覆盖同名 ${res.overwrittenProjectCount} 列`);
  if (res.skippedProjectCount) parts.push(`跳过同名 ${res.skippedProjectCount} 列`);
  return `已${mode === 'force' ? '强制' : ''}带入 ${res.fromYear} 年${quarterLabelOf(res.fromQuarter)}数据（${parts.join('，')}）`;
}

export function createBringInController(options: BringInControllerOptions) {
  const bringModalOpen = ref(false);
  const bringing = ref(false);

  function handleBringIn() {
    if (!options.reportUnit.value || options.loading.value) return;
    bringModalOpen.value = true;
  }

  /** 执行带入(普通/仅名称/强制):先自动落库脏列,成功后整包重载 */
  async function doBringIn(mode: 'normal' | 'names' | 'force') {
    if (bringing.value || !options.reportUnit.value) return;
    if (mode === 'normal' && options.broughtIn.value) {
      options.showMessage('已执行过数据带入');
      return;
    }
    bringing.value = true;
    try {
      await options.autoPersistDirty();
      const res = await options.bringInApi({
        year: options.year.value,
        quarter: options.quarter.value,
        unit: options.reportUnit.value,
        force: mode === 'force',
        namesOnly: mode === 'names',
      });
      options.showMessage(resultMessage(mode, res, options.quarterLabel));
      bringModalOpen.value = false;
      options.resetEditState();
      options.clearDirty();
      await options.reload();
    } catch (e: unknown) {
      options.showMessage(e instanceof Error ? e.message : '带入失败');
    } finally {
      bringing.value = false;
    }
  }

  /** 强制带入:二次确认(覆盖同名项目列数据) */
  function handleForceBringIn() {
    Modal.confirm({
      title: '强制带入确认',
      content: '本季度同名项目列的数值将被上一季度数据覆盖，当前已修改的内容会丢失，确定继续吗？',
      okText: '强制带入',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => doBringIn('force'),
    });
  }

  return { bringModalOpen, bringing, handleBringIn, doBringIn, handleForceBringIn };
}
