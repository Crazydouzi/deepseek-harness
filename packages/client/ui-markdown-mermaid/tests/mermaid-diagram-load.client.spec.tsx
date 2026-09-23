// @vitest-environment jsdom
/** A chunk that never arrives is reported as a load failure, not a render failure. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en } from '../src/client/locales.ts'

vi.mock('../src/client/mermaid-runtime.ts', () => {
  throw new Error('failed to fetch dynamically imported module')
})

const { MermaidDiagram } = await import('../src/client/MermaidDiagram.tsx')

afterEach(cleanup)

describe('MermaidDiagram with an unavailable chunk', () => {
  it('names the module load as the failure and still shows the source', async () => {
    const view = render(<MermaidDiagram source="graph TD" t={makeTranslate(en)} />)
    await waitFor(() => {
      expect(view.container.querySelector('[data-mermaid-error]')).not.toBeNull()
    })
    const caption = view.container.querySelector('[data-mermaid-error] figcaption')
    const detail = caption?.querySelector('span')?.textContent ?? ''
    expect(caption?.textContent).toContain(en['diagram.loadError'])
    // The loader's own reason reaches the caption, whatever the harness words it as.
    expect(detail.length).toBeGreaterThan(0)
    expect(view.container.querySelector('[data-mermaid-error] pre')?.textContent).toBe('graph TD')
  })
})
