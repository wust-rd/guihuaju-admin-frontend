# @jeesite/ui —— 通用 UI 组件包

与 antdv-next 并存的轻量自绘组件：antdv 样式无法完全定制的场景在此定制。
组件为源码直出（无构建步骤），经 Vite 转译消费，包结构与 `@jeesite/vmap` 同范式
（根 `index.ts` 转出口，实现在 `src/`）。

## Stepper 步骤条

[shadcn-vue stepper](https://www.shadcn-vue.com/docs/components/stepper) 的定制移植：
不引 reka-ui，纯展示、**状态驱动**——每个步骤显式声明 `status`，样式完全可控。

```ts
import { Stepper } from '@jeesite/ui';
import type { StepItem } from '@jeesite/ui';

const steps: StepItem[] = [
  { title: '策划库', status: 'finish' },
  { title: '储备库', status: 'process' },
  { title: '实施库' }, // 缺省 wait
];
```

```html
<Stepper :steps="steps" />
```

| status | 视觉 | 语义 |
|--------|------|------|
| `finish` | 中性灰实心圆 + 白色打钩 | 已走完的环节 |
| `process` | 强调蓝（#1677ff）实心圆 + 白色序号 | 当前所处环节（唯一强调色） |
| `wait` | 白底灰描边圆 + 灰色序号 | 未到达的环节 |

分隔线统一浅灰，不参与强调；`description` 可选，显示在标题下方。

**兼作页签**：每项可点击，`v-model:active` 绑定选中下标与内容区联动。选中态
与 status 独立叠加——圆圈泛荧光 shadow，标题变实底白字胶囊（统一 `px-8px`，
未选中背景透明，切换不跳动）。高亮色 `tone`（默认 `blue`）：

| tone | 圆圈 shadow | 标题胶囊 | 用途 |
|------|-------------|----------|------|
| `blue` | `rgba(22,119,255,0.45)` 蓝光晕 | `#1677ff` 蓝底白字 | 在库项目 |
| `gray` | `rgba(0,0,0,0.45)` 灰光晕 | `rgba(0,0,0,0.88)` 黑灰底白字（与「已退出」Tag 同色） | 已退出等项目（整体置灰语境） |

```html
<Stepper v-model:active="activeStage" :steps="steps" :tone="isExited ? 'gray' : 'blue'" />
```

设计动机：antdv-next Steps（v-c Steps）的状态色无法完全覆盖——已完成环节的
打钩恒为浅蓝、`current` 默认 0 会点亮首项；生命周期步骤条需要「已退出项目如实
展示走过的环节（灰勾）且整条置灰」这类完全受控的呈现，故自建组件。
