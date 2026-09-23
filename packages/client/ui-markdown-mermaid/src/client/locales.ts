/** Mermaid-aware Markdown viewer labels and diagram chrome. */
export const zh = {
  'viewer.label': 'Markdown（Mermaid 图形）',
  'code.copy': '复制',
  'code.copied': '已复制',
  'footnotes': '脚注',
  'diagram.label': 'Mermaid 图形',
  'diagram.loading': '正在渲染图形…',
  'diagram.loadError': '图形组件加载失败，已显示源码：',
  'diagram.renderError': '图形渲染失败，已显示源码：',
  'diagram.retry': '重试',
} satisfies Record<string, string>

/** Mermaid-aware Markdown namespace keys. */
export type MarkdownMermaidKey = keyof typeof zh

/** English labels, paired with the Chinese key set. */
export const en = {
  'viewer.label': 'Markdown (Mermaid diagrams)',
  'code.copy': 'Copy',
  'code.copied': 'Copied',
  'footnotes': 'Footnotes',
  'diagram.label': 'Mermaid diagram',
  'diagram.loading': 'Rendering diagram…',
  'diagram.loadError': 'Diagram module failed to load; showing source:',
  'diagram.renderError': 'Diagram failed to render; showing source:',
  'diagram.retry': 'Retry',
} satisfies Record<MarkdownMermaidKey, string>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Mermaid-aware Markdown document renderer and its diagram chrome. */
    markdownMermaid: MarkdownMermaidKey
  }
}
