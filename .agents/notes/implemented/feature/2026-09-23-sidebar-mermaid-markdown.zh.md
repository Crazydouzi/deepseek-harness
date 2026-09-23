# Agent Note: 侧边栏 Mermaid Markdown 查看器

Status: implemented

[English](2026-09-23-sidebar-mermaid-markdown.md) | 中文

## Problem

在右侧边栏打开的 Markdown 文档会把每个 ```mermaid 围栏渲染成普通的语法高亮代码，于是带图的设计文档只能当源码来读。共享 Markdown 渲染器没有按语言分派的围栏扩展点，文档预览注册表里也没有任何理解图形围栏的实现。

## Decision

新增客户端插件 `@deepseek-ai/dsh-client-ui-markdown-mermaid`，在注册表的 external 优先级带登记 `md`/`markdown` 文档实现，因此它成为被选中的 Markdown 查看器，内置实现仍留在查看器菜单里。它的正文通过 `splitMermaidFences` 渲染累积文档：信息串以 `mermaid` 开头的、已闭合的围栏变成图形，其余每个区域继续使用 `MarkdownText`，并沿用内置实现的复制与脚注文案。

该包发布两个产物。入口承载查看器，并通过加载器的 `require.async` 索取本包的图形 chunk；第二个构建入口以关闭代码分割的方式产出该 chunk，因此整张 Mermaid 模块图被内联成一个自包含的压缩文件（约 3.4 MB），只有含图形的文档才会拉取。渲染使用 `securityLevel: 'strict'`，以及渲染时从 `body[data-ds-dark-theme]` 读到的、由外壳解析出的配色。失败时显示源码与原因，并把「chunk 加载失败」与「渲染失败」分开命名；加载失败由下一个图形重试。

## Alternatives considered

**通过共享预设做 Mermaid 的动态 `import()`。** 这是最直观的写法，也是失败的那种：Mermaid 的 ESM 入口把各图形类型放在动态 `import()` 之后，这些拆分点与它们上层的图共享模块，预设因此把这些共享模块输出成由同步相对 `require` 抵达的兄弟 chunk。浏览器模块加载器只会从模块表应答裸 specifier，相对请求只认 `require.async`，于是该 chunk 一加载就抛错，每个图形都回退成源码。

**用 manual chunk 或 `advancedChunks` 分组覆盖 Mermaid 的图。** 这样确实消除了兄弟边，但 rolldown 随后不再生成预设要重写的动态 import 表达式，构建会因一个「已声明却未渲染」的 chunk 失败。

**把运行时 specifier 标成 external。** 入口于是生成原生 `import()`，它按文档 URL 而不是插件 URL 解析，在插件工厂里必然 404。

**Mermaid 预构建的 UMD 包。** 它天然自包含，但它用顶层 `var` 给 `globalThis["mermaid"]` 赋值，这只在真正的脚本作用域里成立；在模块工厂里那次读取会抛错。压缩与未压缩的 dist 都带有这一假设。

**把 Mermaid 直接内联进插件入口。** 完全没有分块问题，代价是每次 GUI 启动都要为多数文档用不到的能力拉取并求值整张图。

**在 `ui-primitives` 里开围栏渲染扩展点。** 按围栏语言登记图形渲染器可以覆盖所有位置的 Markdown，包括聊天记录与工具结果。但这会改动共享渲染器——它的 DOM 一致性夹具与逐文件覆盖率门禁守着它逐字节相同的输出——而本次要做的是侧边栏文档视图。

**对已渲染的 DOM 做后处理。** 在 `MarkdownText` 渲染后改写 `[data-code-block-content]` 可以让整篇文档只解析一次，但它修改的是 React 拥有的子树，任何重渲染都可能在活动 SVG 之下恢复代码块；分段则让 React 始终是唯一的写入者。

**做成可安装的出树 bundle。** 用 `dsh plugin add` 可以不动本检出，但该包仍然需要客户端打包管线，而且这样加进去的浏览器 roster 行必须先在一次 profile 启动中验证过才值得推荐。

## Consequences

侧边栏里的 Markdown 文件会渲染图形，查看器菜单会列出两个 Markdown 实现。由于各区域独立解析，跨围栏的链接引用定义或脚注序列不再跨边界关联，脚注编号也按区域重新开始。

该懒加载 chunk 携带全部 Mermaid 图形类型（压缩后约 3.4 MB），因为加载器无法解析 Mermaid 自身的代码分割；文档在出现第一个图形时拉取它，之后的图形由加载器缓存复用。`mermaid` 是内联进该 chunk 的 devDependency，因此 `THIRD_PARTY_NOTICES.md` 现在把它列为随浏览器产物分发的内容。

验证：`tests/mermaid-fences.client.spec.ts`（切分，含流式与嵌套围栏）、`tests/graph-loader.client.spec.ts`（只加载一次、加载失败后重试、渲染失败后重试）、`tests/mermaid-graph.client.spec.ts`（配色、渲染、失败清理）、`tests/mermaid-diagram.client.spec.tsx`（进度、已渲染 SVG、失败时的原因与源码、源码变更）与 `tests/mermaid-diagram-load.client.spec.tsx`（把加载失败单独命名）。产物也在浏览器之外被求值验证：`lib/client.mermaid-graph.js` 以 chunk 身份注册、导出 `renderDiagram`，并成功渲染了一张 flowchart 与一张 sequenceDiagram，且任何产物都不含同步相对 `require`。