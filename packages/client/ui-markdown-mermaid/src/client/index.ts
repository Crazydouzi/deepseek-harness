/**
 * Browser half: a Mermaid-aware Markdown document implementation.
 *
 * Metadata registers into the shared document-preview registry in the external
 * priority band, so this implementation outranks the builtin Markdown viewer for
 * `.md` files and becomes the selected one; the body registers into the owner's
 * keyed document slot under the same id. Rendering reuses the shared Markdown
 * renderer for every region outside a ```mermaid fence.
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar-documentpreview/client'
import { MarkdownMermaidBody } from './MarkdownMermaidBody.tsx'
import { en, zh } from './locales.ts'

/** Implementation identity shared by the metadata and the document body. */
const BODY_ID = '@deepseek-ai/dsh-client-ui-markdown-mermaid/markdown'

/** This package's copy namespace. */
const NS = 'markdownMermaid'

/** Required browser services: the slot registry, copy, and the document-preview registry. */
export const inject = ['slots', 'locale', 'documentPreviews']

/**
 * Client plugin body: register the dictionaries, the document-preview metadata,
 * and the keyed body component for the owning plugin lifetime.
 * @param ctx - client root context carrying locale, the registry, and the slots.
 */
export function apply(ctx: Context): void {
  const t = ctx.locale.bind(NS)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-markdown-mermaid: dictionaries')
  ctx.effect(() => ctx.documentPreviews.register({
    id: BODY_ID,
    extensions: ['md', 'markdown'],
    priority: 'extension',
    title: () => t('viewer.label'),
    loading: 'text-pages',
    wrap: false,
  }), 'ui-markdown-mermaid: metadata')
  ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document', () => ctx.slots.register(
    { name: 'sidebar.right.tab.document', key: BODY_ID, locale: NS }, MarkdownMermaidBody,
  )), 'ui-markdown-mermaid: body')
}
