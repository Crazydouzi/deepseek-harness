/** One retained Mermaid-aware Markdown renderer over the document owner's accumulated text. */
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { MarkdownText, type MarkdownLabels } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { DocumentPreviewProps } from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import { MermaidDiagram } from './MermaidDiagram.tsx'
import { splitMermaidFences } from './mermaid-fences.ts'
import type {} from './locales.ts'
import css from './MarkdownMermaidBody.module.css'

/** Standard document inputs and this implementation's locale. */
export type MarkdownMermaidBodyProps = DocumentPreviewProps & PropsLocale<'markdownMermaid'>

/**
 * Render one accumulated document: diagram fences become diagrams, every other
 * region keeps the shared Markdown renderer and its chrome.
 * @param props - owner-loaded contents and localized labels.
 * @returns Markdown content with diagrams, or nothing for a non-text delivery.
 */
export function MarkdownMermaidBody({ content, t }: MarkdownMermaidBodyProps): ReactNode {
  const copyLabel = t('code.copy')
  const copiedLabel = t('code.copied')
  const footnotes = t('footnotes')
  const labels = useMemo<MarkdownLabels>(() => ({
    code: { copyLabel, copiedLabel }, footnotes,
  }), [copyLabel, copiedLabel, footnotes])
  const text = content.kind === 'text' ? content.text : ''
  const segments = useMemo(() => splitMermaidFences(text), [text])
  const streaming = content.kind === 'text' && !content.eof
  if (content.kind !== 'text') return null
  return (
    <div className={css.document} data-document-markdown data-document-mermaid>
      {segments.map((segment, index) => (segment.kind === 'mermaid'
        ? <MermaidDiagram key={`mermaid-${index}`} source={segment.source} t={t} />
        : <MarkdownText key={`markdown-${index}`} text={segment.text} streaming={streaming} labels={labels} />))}
    </div>
  )
}
