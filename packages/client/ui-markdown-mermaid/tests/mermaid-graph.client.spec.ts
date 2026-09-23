// @vitest-environment jsdom
/** The graph chunk initializes per palette, renders, and cleans up after a parse failure. */
import { afterEach, describe, expect, it, vi } from 'vitest'

const initialize = vi.fn()
const render = vi.fn()

vi.mock('mermaid', () => ({
  default: {
    initialize: (...args: unknown[]) => initialize(...args),
    render: (...args: unknown[]) => render(...args),
  },
}))

const { renderDiagram } = await import('../src/client/mermaid-graph.ts')

afterEach(() => {
  initialize.mockReset()
  render.mockReset()
  document.body.removeAttribute('data-ds-dark-theme')
})

describe('graph chunk renderDiagram', () => {
  it('initializes with the light palette and returns the rendered SVG', async () => {
    render.mockResolvedValue({ svg: '<svg id="one"></svg>' })
    await expect(renderDiagram('graph TD')).resolves.toBe('<svg id="one"></svg>')
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({
      startOnLoad: false, securityLevel: 'strict', theme: 'default',
    }))
    const [id, source] = render.mock.calls[0] as [string, string]
    expect(id.startsWith('dsh-mermaid-diagram-')).toBe(true)
    expect(source).toBe('graph TD')
  })

  it('initializes with the dark palette when the shell resolved one', async () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    render.mockResolvedValue({ svg: '<svg id="two"></svg>' })
    await renderDiagram('graph LR')
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }))
  })

  it('removes the measuring elements Mermaid leaves behind and rethrows', async () => {
    render.mockImplementation((id: string) => {
      for (const elementId of [id, `d${id}`]) {
        const element = document.createElement('div')
        element.id = elementId
        document.body.appendChild(element)
      }
      return Promise.reject(new Error('parse error'))
    })
    await expect(renderDiagram('not a diagram')).rejects.toThrow('parse error')
    expect(document.querySelector('[id^="dsh-mermaid-diagram-"]')).toBeNull()
    expect(document.querySelector('[id^="ddsh-mermaid-diagram-"]')).toBeNull()
  })
})
