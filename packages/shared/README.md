# @jeesite/shared 业务公共层

业务模块（`modules/packages/*`）共用的组件与工具放这里。

## 定位与依赖规则（重要）

```
modules/packages/*  ──▶  @jeesite/shared  ──▶  @jeesite/core / @jeesite/assets
```

- 本包**只被业务模块依赖，不依赖任何业务模块**（保持单向依赖，业务模块之间也互不依赖）；
- **禁止 import `@jeesite/display`** —— display 是临时演示代码（终将移除），公共组件不得与其产生关联；
- 组件必须**去业务化**：props/emits 用通用命名，不带具体业务词汇，不 import 任何 `@jeesite/<业务模块>`。

## 目录约定

```
packages/shared/
├── package.json          # @jeesite/shared（workspace 成员）
├── tsconfig.json         # paths: @jeesite/shared/* → ./*
├── README.md             # 本文件
└── components/           # 公共组件（一个组件一个目录，如 components/search-filter/index.tsx）
```

## 使用方式

任意业务模块内直接按别名引用：

```ts
import { XxxCard } from '@jeesite/shared/components/xxx-card';
```

（workspace 包经根 package.json 的 `workspace:*` 声明 symlink 到根 node_modules，Vite 与 vue-tsc 全局可解析，无需各模块再配置。）

## 什么时候放进本包

组件**被第二个业务模块需要时**才从业务模块上提至此；单模块使用的组件留在各自模块目录，不提前上提。
