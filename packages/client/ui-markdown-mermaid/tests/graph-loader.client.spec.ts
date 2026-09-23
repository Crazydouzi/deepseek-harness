// @vitest-environment jsdom
/** The graph renderer loads the chunk once, forwards sources, and retries after a failure. */
import { describe, expect, it, vi } from 'vitest'
import { createGraphRenderer } from '../src/client/graph-loader.ts'

/** The chunk the renderer asks the loader for. */
const GRAPH_CHUNK = './client.mermaid-graph.js'

/** A loader whose one method is the test's spy. */
function loaderOf(load: (specifier: string) => Promise<unknown>) {
  return { async: load }
}

describe('createGraphRenderer', () => {
  it('loads the graph chunk once and forwards every diagram source', async () => {
    const renderGraphDiagram = vi.fn().mockResolvedValue('<svg id="one"></svg>')
    const load = vi.fn().mockResolvedValue({ renderDiagram: renderGraphDiagram })
    const renderDiagram = createGraphRenderer(loaderOf(load))

    await expect(renderDiagram('graph TD')).resolves.toBe('<svg id="one"></svg>')
    await expect(renderDiagram('graph LR')).resolves.toBe('<svg id="one"></svg>')

    expect(load).toHaveBeenCalledTimes(1)
    expect(load).toHaveBeenCalledWith(GRAPH_CHUNK)
    expect(renderGraphDiagram.mock.calls).toEqual([['graph TD'], ['graph LR']])
  })

  it('drops a failed load so the next diagram retries, and surfaces the reason', async () => {
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('failed to fetch dynamically imported module'))
      .mockResolvedValueOnce({ renderDiagram: vi.fn().mockResolvedValue('<svg id="two"></svg>') })
    const renderDiagram = createGraphRenderer(loaderOf(load))

    await expect(renderDiagram('graph TD')).rejects.toThrow('failed to fetch dynamically imported module')
    await expect(renderDiagram('graph TD')).resolves.toBe('<svg id="two"></svg>')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('retries a diagram whose render failed inside a loaded chunk', async () => {
    const load = vi.fn().mockResolvedValue({
      renderDiagram: vi.fn()
        .mockRejectedValueOnce(new Error('Parse error on line 2'))
        .mockResolvedValueOnce('<svg id="three"></svg>'),
    })
    const renderDiagram = createGraphRenderer(loaderOf(load))

    await expect(renderDiagram('not a diagram')).rejects.toThrow('Parse error on line 2')
    await expect(renderDiagram('not a diagram')).resolves.toBe('<svg id="three"></svg>')
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('entry-side binding', () => {
  it('exports a renderer created from the loader the plugin factory receives', async () => {
    const { renderDiagram } = await import('../src/client/mermaid-runtime.ts')
    expect(typeof renderDiagram).toBe('function')
  })
})
