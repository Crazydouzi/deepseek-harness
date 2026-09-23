/**
 * The diagram graph chunk: Mermaid itself, built as its own self-contained bundle
 * by this package's second build entry and loaded only when a document contains
 * a diagram.
 *
 * It is built with code splitting off on purpose. Mermaid's ESM entry splits its
 * diagram types behind dynamic `import()`; inside a chunk that shares modules with
 * those split points, the emitter writes the shared modules into sibling chunks
 * and reaches them with synchronous `require("./client.*.js")` calls — which the
 * browser module loader cannot resolve, because it answers bare specifiers from
 * the module table and relative requests only through `require.async`.
 *
 * Mermaid's prebuilt UMD bundle is no alternative: it assigns
 * `globalThis["mermaid"]` from a top-level `var`, which only holds in a real
 * script scope and throws inside a module factory.
 */
import mermaid from 'mermaid'

/** Palette Mermaid draws with, read from the shell's resolved theme attribute. */
function palette(): 'default' | 'dark' {
  return document.body.hasAttribute('data-ds-dark-theme') ? 'dark' : 'default'
}

/** Source of per-render element ids; Mermaid requires a document-unique id. */
let sequence = 0

/**
 * Render one diagram to standalone SVG markup.
 * @param source - The fence body, exactly as authored.
 * @returns the rendered SVG markup.
 */
export async function renderDiagram(source: string): Promise<string> {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: palette(),
    fontFamily: 'inherit',
  })
  sequence += 1
  const id = `dsh-mermaid-diagram-${sequence}`
  try {
    const { svg } = await mermaid.render(id, source)
    return svg
  } catch (error) {
    // Mermaid can leave its measuring element behind when parsing fails, in
    // either the raw or the double-prefixed id form.
    document.getElementById(id)?.remove()
    document.getElementById(`d${id}`)?.remove()
    throw error
  }
}
