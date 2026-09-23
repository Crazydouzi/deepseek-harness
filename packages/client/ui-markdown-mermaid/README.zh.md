---
description: "右侧边栏的 Mermaid 感知 Markdown 预览：把 mermaid 围栏渲染为 SVG 图形，渲染失败时回退显示围栏源码与原因。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-markdown-mermaid

[English](README.md) | 中文

## Summary

打开含 mermaid 围栏的 Markdown 文件，该查看器会把每个图形画成 SVG，设计文档因此可以在侧边栏里直接阅读。它成为被选中的 Markdown 实现，内置查看器仍只需在菜单里点一下。图形按需渲染：不含图形的文档永远不会加载 Mermaid。渲染使用严格模式，失败时回退显示围栏源码与原因，并跟随外壳解析出的配色。围栏之外的区域继续使用标准 Markdown 渲染器及其复制与脚注控件。

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

在右侧边栏打开任意 `.md` 文件即可，无需任何前置配置。

### When to choose it

该查看器以 external 优先级带登记 `md` 与 `markdown`，因此会被自动选中。若想看到语法高亮后的图形源码，在查看器菜单里选择内置的 Markdown 条目即可。

### Minimal configuration

该查看器以普通客户端插件行的形式挂载，不接受任何配置：

```yaml
- id: ui-markdown-mermaid
  name: '@deepseek-ai/dsh-client-ui-markdown-mermaid'
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>实现内部细节——点击展开</summary>

该包发布两个产物。入口负责登记实现，并基于共享 `MarkdownText` 做区域排版；`splitMermaidFences` 在信息串以 `mermaid` 开头的三反引号或波浪号围栏处切分累积文档，未闭合的围栏保持为 Markdown，因此仍在流式输出的文档会继续显示源码文本。

图形区域通过 `require.async` 向模块加载器索取本包的图形 chunk，这是该加载器唯一能解析的 chunk 请求。Mermaid 的 ESM 入口把各图形类型放在动态 `import()` 之后，而这些拆分点与它们上层的图共享模块，共享预设因此会产出由同步相对 `require` 抵达的兄弟 chunk，永远无法解析——用 manual chunk 或 `advancedChunks` 分组会让 rolldown 不再生成预设要重写的 import 表达式，而把该 specifier 标成 external 会退化成按文档 URL 解析的原生 `import()`。因此本包的第二个构建入口把整张 Mermaid 图内联成一个自包含的压缩 chunk（约 3.4 MB），只有含图形的文档才会拉取。渲染使用 `securityLevel: 'strict'` 与从 `body[data-ds-dark-theme]` 读到的配色；解析失败时显示源码与原因，chunk 加载失败则由下一个图形重试。

| 文件 | 职责 |
|---|---|
| `src/client/index.ts` | 注册表元数据、插槽正文注册、本地化词典 |
| `src/client/MarkdownMermaidBody.tsx` | 基于共享 `MarkdownText` 的区域排版 |
| `src/client/mermaid-fences.ts` | 围栏切分，纯函数、不依赖解析器 |
| `src/client/MermaidDiagram.tsx` | 单个图形的状态：渲染中、已渲染 SVG、源码与失败原因 |
| `src/client/graph-loader.ts` | chunk 请求、记忆化、失败后重试 |
| `src/client/mermaid-graph.ts` | 图形 chunk：初始化、渲染、失败清理 |
| `tsdown.config.ts` | 让图形 chunk 自包含的第二个构建入口 |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-sidebar-documentpreview](../ui-sidebar-documentpreview/README.zh.md)——本实现登记所依赖的注册表与插槽。
- [ui-primitives](../ui-primitives/README.zh.md)——被复用的共享 Markdown 渲染器与代码块。
- [ui-theme](../ui-theme/README.zh.md)——所读取的配色 token 与已解析主题属性。

-----

<a id="model-experience"></a>
## Model Experience

None, as the viewer only draws diagrams for the reader and registers no model-facing tool, event, or prompt surface.

#### KV Cache effect

None: the plugin never contributes request text, so it cannot extend or invalidate a prompt prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- 跨图形围栏的链接引用定义或脚注序列不会跨边界关联，脚注编号也按区域重新开始。
- 图形保留渲染当时解析出的配色；切换外壳主题不会给已在屏幕上的图形重新上色，除非其区域重新挂载。
- 文档中的第一个图形会拉取图形 chunk，由于加载器无法解析 Mermaid 自身的代码分割，该 chunk 携带全部 Mermaid 图形类型。不想承担这份体积的部署可以不挂载该行。

<a id="dev-note"></a>
### Dev Note

<details>
<summary>维护者工作上下文——点击展开</summary>

`pnpm --filter @deepseek-ai/dsh-client-ui-markdown-mermaid bundle` 会产出 `lib/client.js`、极小的自动 chunk `lib/client.mermaid-runtime.js`，以及自包含的 `lib/client.mermaid-graph.js`；模块注册表提供的是构建产物，而不是源码。改动 `tsdown.config.ts` 中任一构建入口后，都要重新确认没有产物携带同步相对 `require`。

</details>