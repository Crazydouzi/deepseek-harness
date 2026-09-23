/** One diagram region: render the source with Mermaid, or say what failed, show the source, and offer a retry. */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './locales.ts'
import css from './MermaidDiagram.module.css'

/** Longest failure detail the caption carries before it is elided. */
const DETAIL_LIMIT = 160

/** What the diagram region currently shows. */
type DiagramState =
  | { readonly kind: 'pending' }
  | { readonly kind: 'ready'; readonly svg: string }
  | { readonly kind: 'failed'; readonly label: string; readonly detail: string }

/** Inputs for one diagram region. */
export type MermaidDiagramProps = {
  /** The fence body, exactly as authored. */
  readonly source: string
} & PropsLocale<'markdownMermaid'>

/**
 * One line of failure detail for the caption: the browser reports a failed
 * chunk request and a Mermaid parse error through the same rejection channel,
 * and only the message tells them apart.
 * @param error - the rejection reason.
 * @returns a single flattened line, elided past {@link DETAIL_LIMIT}.
 */
function describeFailure(error: unknown): string {
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim()
  return message.length > DETAIL_LIMIT ? `${message.slice(0, DETAIL_LIMIT - 3)}...` : message
}

/**
 * Render one diagram, loading the Mermaid chunk on first use.
 * @param props - diagram source and this implementation's locale.
 * @returns the rendered diagram, its progress line, or the source with the reason and a retry.
 */
export function MermaidDiagram({ source, t }: MermaidDiagramProps): ReactNode {
  const loadLabel = t('diagram.loadError')
  const renderLabel = t('diagram.renderError')
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<DiagramState>({ kind: 'pending' })
  useEffect(() => {
    let active = true
    setState({ kind: 'pending' })
    void (async () => {
      let render: (diagram: string) => Promise<string>
      try {
        render = (await import('./mermaid-runtime.ts')).renderDiagram
      } catch (error) {
        if (active) setState({ kind: 'failed', label: loadLabel, detail: describeFailure(error) })
        return
      }
      try {
        const svg = await render(source)
        if (active) setState({ kind: 'ready', svg })
      } catch (error) {
        if (active) setState({ kind: 'failed', label: renderLabel, detail: describeFailure(error) })
      }
    })()
    return () => { active = false }
  }, [source, loadLabel, renderLabel, attempt])

  if (state.kind === 'failed') {
    return (
      <figure className={css.diagram} data-mermaid-error>
        <figcaption className={css.caption}>
          {state.label}
          {state.detail === '' ? null : <span className={css.detail}>{state.detail}</span>}
        </figcaption>
        <pre className={css.source}><code>{source}</code></pre>
        <div className={css.actions}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setAttempt(current => current + 1) }}
          >
            {t('diagram.retry')}
          </Button>
        </div>
      </figure>
    )
  }
  return (
    <figure className={css.diagram} role="img" aria-label={t('diagram.label')} data-mermaid-diagram>
      {state.kind === 'ready'
        ? <div className={css.svg} dangerouslySetInnerHTML={{ __html: state.svg }} />
        : <div className={css.pending}>{t('diagram.loading')}</div>}
    </figure>
  )
}
