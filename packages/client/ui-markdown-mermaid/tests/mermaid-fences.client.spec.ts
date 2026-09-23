/** Fence splitting keeps non-diagram regions verbatim and defers unclosed fences to Markdown. */
import { describe, expect, it } from 'vitest'
import { splitMermaidFences } from '../src/client/mermaid-fences.ts'

describe('splitMermaidFences', () => {
  it('routes a closed diagram fence and preserves the surrounding Markdown byte-for-byte', () => {
    const text = '# Title\n\n```mermaid\ngraph TD\n  A-->B\n```\n\nAfter.'
    expect(splitMermaidFences(text)).toEqual([
      { kind: 'markdown', text: '# Title\n' },
      { kind: 'mermaid', source: 'graph TD\n  A-->B' },
      { kind: 'markdown', text: '\nAfter.' },
    ])
  })

  it('keeps an unterminated diagram fence as Markdown while the document streams', () => {
    const text = 'Before.\n\n```mermaid\ngraph TD'
    expect(splitMermaidFences(text)).toEqual([
      { kind: 'markdown', text: 'Before.\n\n```mermaid\ngraph TD' },
    ])
  })

  it('ignores a diagram fence nested in another fence and passes that block through', () => {
    const text = '```ts\n```mermaid\n```'
    expect(splitMermaidFences(text)).toEqual([{ kind: 'markdown', text }])
  })

  it('accepts a tilde fence with an info-string suffix and ignores a longer info word', () => {
    expect(splitMermaidFences('~~~mermaid title="x"\nA-->B\n~~~')).toEqual([
      { kind: 'mermaid', source: 'A-->B' },
    ])
    const other = '```mermaidx\nA-->B\n```'
    expect(splitMermaidFences(other)).toEqual([{ kind: 'markdown', text: other }])
  })

  it('closes only on a fence at least as long as the opener and without an info string', () => {
    expect(splitMermaidFences('````mermaid\nA\n```\nB\n````')).toEqual([
      { kind: 'mermaid', source: 'A\n```\nB' },
    ])
  })

  it('returns one Markdown region without fences, drops empty regions, and keeps an empty diagram', () => {
    expect(splitMermaidFences('plain text')).toEqual([{ kind: 'markdown', text: 'plain text' }])
    expect(splitMermaidFences('```mermaid\n```')).toEqual([{ kind: 'mermaid', source: '' }])
    expect(splitMermaidFences('```mermaid\nA\n```\n```mermaid\nB\n```')).toEqual([
      { kind: 'mermaid', source: 'A' },
      { kind: 'mermaid', source: 'B' },
    ])
  })
})
