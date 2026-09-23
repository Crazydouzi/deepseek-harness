import type { UserConfig } from 'tsdown'
import { clientBundle } from '../tsdown.client.ts'

const ID = '@deepseek-ai/dsh-client-ui-markdown-mermaid'

/** The lazy graph chunk's published name; the entry requests it by this name. */
const GRAPH_FILE = 'client.mermaid-graph.js'

const build = clientBundle(ID, ['lib/types/index.js'])

/**
 * Build Mermaid's graph as one self-contained chunk.
 *
 * Mermaid's ESM entry splits its diagram types behind dynamic `import()`. Inside
 * a chunk that shares modules with those split points, the emitter writes the
 * shared modules into sibling chunks and reaches them with synchronous
 * `require("./client.*.js")` calls — which the browser module loader cannot
 * resolve: it answers bare specifiers from the module table and relative
 * requests only through `require.async`. Turning code splitting off for this
 * entry inlines the whole graph, so the chunk the entry loads has no sibling
 * edges at all.
 *
 * The shared preset cannot express this for a dynamic import. A manual chunk or
 * `advancedChunks` group covering the graph stops rolldown from emitting the
 * import expression the preset rewrites (the build then fails on a declared but
 * unrendered chunk), and marking the specifier external degrades to a native
 * `import()` that resolves against the document URL instead of the plugin URL.
 * Requesting the chunk by name through the loader's `require.async` keeps the
 * entry's own graph free of Mermaid, so the entry needs no chunk rewriting
 * either — hence the preset's chunk rewriter is dropped from this face.
 * @param client - the preset's browser config for this package.
 * @returns the same build faces plus the self-contained graph chunk.
 */
function graphChunk(client: UserConfig): UserConfig {
  return {
    ...client,
    name: `${ID}/mermaid-graph`,
    entry: { [GRAPH_FILE.replace(/\.js$/, '')]: 'lib/types/client/mermaid-graph.js' },
    plugins: (client.plugins ?? []).filter(plugin => plugin.name !== 'dsh-client-async-chunk-require'),
    outputOptions: {
      ...client.outputOptions,
      entryFileNames: GRAPH_FILE,
      codeSplitting: false,
      // The whole graph lands in one chunk, so minify the one artifact this
      // costs: it is ~7 MB of readable Mermaid otherwise.
      minify: true,
      // The preset's banner registers a dynamic chunk only when rolldown calls
      // it one; this entry is the chunk, so state that explicitly.
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, chunk: ${JSON.stringify(GRAPH_FILE)}, factory: (require) => {`,
    },
  }
}

export default (inlineConfig: Parameters<typeof build>[0]) => {
  const configs = build(inlineConfig)
  const client = configs.find(config => config.name === `${ID}/client`)
  // The Host build face carries no browser config, so it gains no second entry.
  if (client === undefined) return configs
  return [...configs, graphChunk(client)]
}
