/**
 * Split Markdown source at ```mermaid fences so a document body can route the
 * diagram bodies to a diagram renderer while every other region keeps the
 * shared Markdown renderer. Pure string work: no parser, no DOM.
 *
 * Cutting a document at fences costs the constructs that span them (a link
 * reference definition in one region no longer resolves in another) and
 * restarts footnote numbering per region. A diagram fence is a hard layout
 * boundary in practice, so the trade is accepted; every region outside a fence
 * stays byte-identical to the source.
 */

/** One region of a Markdown document. */
export type MarkdownSegment =
  | { readonly kind: 'markdown'; readonly text: string }
  | { readonly kind: 'mermaid'; readonly source: string }

/** CommonMark fence opener: up to three spaces, three or more backticks or tildes, then the info string. */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

/** Info string whose first word routes the fence body to the diagram renderer. */
const MERMAID_INFO = 'mermaid'

interface OpenFence {
  /** The opener's fence run, whose character and minimum length a closer repeats. */
  readonly run: string
  /** Whether the fence body is diagram source rather than Markdown. */
  readonly mermaid: boolean
  /** The opener line, restored when a diagram fence never closes. */
  readonly line: string
}

/** Whether a line closes `open`: same fence character, at least as long, no info string. */
function closesFence(line: string, open: OpenFence): boolean {
  const match = FENCE.exec(line)
  if (match === null) return false
  const run = match[1] ?? ''
  return run[0] === open.run[0] && run.length >= open.run.length && (match[2] ?? '').trim() === ''
}

/**
 * Split one document into alternating Markdown and diagram regions.
 * An unterminated diagram fence stays Markdown, so a document still streaming
 * keeps showing source text until the fence closes.
 * @param text - The whole accumulated document.
 * @returns Regions in source order, with empty Markdown regions dropped.
 */
export function splitMermaidFences(text: string): readonly MarkdownSegment[] {
  const segments: MarkdownSegment[] = []
  let markdown: string[] = []
  let diagram: string[] = []
  let open: OpenFence | null = null

  const flushMarkdown = (): void => {
    if (markdown.length === 0) return
    const region = markdown.join('\n')
    markdown = []
    if (region !== '') segments.push({ kind: 'markdown', text: region })
  }

  for (const line of text.split('\n')) {
    if (open === null) {
      const match = FENCE.exec(line)
      if (match === null) {
        markdown.push(line)
        continue
      }
      const info = (match[2] ?? '').trim()
      open = { run: match[1] ?? '', mermaid: info.split(/\s+/)[0] === MERMAID_INFO, line }
      // A diagram fence holds the Markdown region open: it only ends where the
      // fence closes, so an unterminated one rejoins that same region below.
      if (!open.mermaid) markdown.push(line)
      continue
    }
    if (open.mermaid) {
      if (closesFence(line, open)) {
        flushMarkdown()
        segments.push({ kind: 'mermaid', source: diagram.join('\n') })
        diagram = []
        open = null
      } else {
        diagram.push(line)
      }
      continue
    }
    markdown.push(line)
    if (closesFence(line, open)) open = null
  }

  // An unterminated diagram fence is not a diagram yet: its lines rejoin the
  // Markdown region so a streaming document still reads as one document.
  if (open !== null && open.mermaid) markdown.push(open.line, ...diagram)
  flushMarkdown()
  return segments
}
