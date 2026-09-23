/**
 * Binds a diagram renderer to the chunk loader its host provides.
 *
 * The graph chunk is requested through the loader's `require.async` rather than
 * a dynamic `import()`. Mermaid's graph cannot be split safely by the shared
 * preset: the diagram types it loads dynamically share modules with the graph
 * above them, and those shared modules are emitted as sibling chunks reached by
 * synchronous relative `require` calls, which this loader cannot resolve. The
 * package's second build entry therefore emits one self-contained chunk with
 * code splitting off, and the entry asks for it by name.
 */

/** The loader face a plugin factory receives for package-local chunks. */
export interface ChunkLoader {
  /**
   * Load one package-local chunk by its published name.
   * @param specifier - a `./client.<name>.js` request.
   * @returns the chunk's exports.
   */
  async(specifier: string): Promise<unknown>
}

/** The face this package's graph chunk exports. */
interface MermaidGraphChunk {
  /**
   * Render one diagram to standalone SVG markup.
   * @param source - the fence body, exactly as authored.
   */
  renderDiagram(source: string): Promise<string>
}

/** Chunk published beside the entry bundle by the package's second build entry. */
const GRAPH_CHUNK = './client.mermaid-graph.js'

/**
 * Create the renderer the entry exports, loading the graph chunk at most once
 * per successful load.
 * @param loader - the host's package-local chunk loader.
 * @returns a renderer that forwards one diagram source to the chunk.
 */
export function createGraphRenderer(loader: ChunkLoader): (source: string) => Promise<string> {
  let graph: Promise<MermaidGraphChunk> | undefined
  return async (source) => {
    graph ??= loader.async(GRAPH_CHUNK).then(chunk => chunk as MermaidGraphChunk)
    try {
      const loaded = await graph
      return await loaded.renderDiagram(source)
    } catch (error) {
      // A failed load must not be cached: the next diagram retries it, so a
      // transient fetch failure recovers without reopening the document.
      graph = undefined
      throw error
    }
  }
}
