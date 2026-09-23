// @vitest-environment jsdom
/** The diagram region renders, reports why it failed, and re-requests on a source change. */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { en } from '../src/client/locales.ts'

const renderDiagram = vi.fn()
vi.mock('../src/client/mermaid-runtime.ts', () => ({
  renderDiagram: (source: string) => renderDiagram(source) as Promise<string>,
}))

const { MermaidDiagram } = await import('../src/client/MermaidDiagram.tsx')

afterEach(() => {
  cleanup()
  renderDiagram.mockReset()
})

/** The caption of the failure figure, or null while the region still renders. */
function captionOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[data-mermaid-error] figcaption')
}

describe('MermaidDiagram', () => {
  it('shows progress, then the rendered SVG under the diagram label', async () => {
    renderDiagram.mockResolvedValue('<svg id="diagram"></svg>')
    const view = render(<MermaidDiagram source="graph TD" t={makeTranslate(en)} />)
    expect(view.getByText(en['diagram.loading'])).toBeDefined()
    await waitFor(() => { expect(view.container.querySelector('svg')).not.toBeNull() })
    expect(renderDiagram).toHaveBeenCalledWith('graph TD')
    expect(view.getByLabelText(en['diagram.label'])).toBeDefined()
  })

  it('reports a render failure with its reason and keeps the source visible', async () => {
    renderDiagram.mockRejectedValue(new Error('Parse error on line 2'))
    const view = render(<MermaidDiagram source="not a diagram" t={makeTranslate(en)} />)
    await waitFor(() => { expect(captionOf(view.container)).not.toBeNull() })
    expect(captionOf(view.container)?.textContent).toContain(en['diagram.renderError'])
    expect(captionOf(view.container)?.textContent).toContain('Parse error on line 2')
    expect(view.container.querySelector('[data-mermaid-error] pre')?.textContent).toBe('not a diagram')
    expect(view.container.querySelector('[data-mermaid-diagram]')).toBeNull()
  })

  it('omits the detail line for a rejection that carries no message, and elides a long one', async () => {
    renderDiagram.mockRejectedValue(new Error(''))
    const empty = render(<MermaidDiagram source="graph TD" t={makeTranslate(en)} />)
    await waitFor(() => { expect(captionOf(empty.container)).not.toBeNull() })
    expect(captionOf(empty.container)?.textContent).toBe(en['diagram.renderError'])
    expect(empty.container.querySelector('[data-mermaid-error] figcaption span')).toBeNull()

    renderDiagram.mockRejectedValue(new Error('x'.repeat(400)))
    const long = render(<MermaidDiagram source="graph LR" t={makeTranslate(en)} />)
    await waitFor(() => { expect(captionOf(long.container)).not.toBeNull() })
    const detail = long.container.querySelector('[data-mermaid-error] figcaption span')?.textContent ?? ''
    expect(detail).toHaveLength(160)
    expect(detail.endsWith('...')).toBe(true)
  })

  it('re-renders the diagram when the reader retries a failed region', async () => {
    renderDiagram
      .mockRejectedValueOnce(new Error('failed to fetch dynamically imported module'))
      .mockResolvedValueOnce('<svg id="retry"></svg>')
    const view = render(<MermaidDiagram source="graph TD" t={makeTranslate(en)} />)
    await waitFor(() => { expect(captionOf(view.container)).not.toBeNull() })

    fireEvent.click(view.getByRole('button', { name: en['diagram.retry'] }))

    await waitFor(() => { expect(view.container.querySelector('svg')).not.toBeNull() })
    expect(renderDiagram).toHaveBeenCalledTimes(2)
    expect(view.getByLabelText(en['diagram.label'])).toBeDefined()
  })

  it('re-requests the render when the source changes', async () => {
    renderDiagram.mockResolvedValue('<svg id="diagram"></svg>')
    const view = render(<MermaidDiagram source="graph TD" t={makeTranslate(en)} />)
    await waitFor(() => { expect(renderDiagram).toHaveBeenCalledTimes(1) })
    view.rerender(<MermaidDiagram source="graph LR" t={makeTranslate(en)} />)
    await waitFor(() => { expect(renderDiagram).toHaveBeenCalledWith('graph LR') })
  })
})
