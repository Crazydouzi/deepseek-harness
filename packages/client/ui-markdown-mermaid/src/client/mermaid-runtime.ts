/**
 * Entry-side diagram runtime: binds the package's renderer to the chunk loader
 * the plugin factory receives.
 *
 * The graph chunk is requested through that loader rather than a dynamic
 * `import()`; see `graph-loader.ts` for why Mermaid's module graph has to ship as
 * one pre-split chunk.
 */
import { createGraphRenderer } from './graph-loader.ts'

/**
 * Render one diagram, loading the graph chunk on first use.
 * @param source - The fence body, exactly as authored.
 * @returns the rendered SVG markup.
 */
export const renderDiagram = createGraphRenderer(require)
