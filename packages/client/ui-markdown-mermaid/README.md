---
description: "Mermaid-aware Markdown preview for the right Sidebar: renders mermaid fences as SVG diagrams and falls back to the diagram source when rendering fails."
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-markdown-mermaid

English | [中文](README.zh.md)

## Summary

Open a Markdown file that contains mermaid fences and this viewer draws each diagram as SVG, so design documents stay readable inside the Sidebar. It becomes the selected Markdown implementation, and the builtin viewer stays one menu click away. Diagrams render lazily: a document without one never loads Mermaid. Rendering is strict, falls back to the fence source with the reason on a failure, and follows the shell's resolved palette. Regions outside a fence keep the standard Markdown renderer and its copy and footnote chrome.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)

-----

<a id="use-this-package"></a>
## Use this package

Open any `.md` file in the right Sidebar; nothing has to be configured first.

### When to choose it

The viewer registers for `md` and `markdown` in the external priority band, so it is chosen automatically. Choose the builtin Markdown entry in the viewer menu to see a diagram fence as highlighted source instead.

### Minimal configuration

The viewer mounts as an ordinary client plugin row and accepts no config:

```yaml
- id: ui-markdown-mermaid
  name: '@deepseek-ai/dsh-client-ui-markdown-mermaid'
```

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The package ships two artifacts. The entry registers the implementation and owns the region layout over the shared `MarkdownText`; `splitMermaidFences` cuts the accumulated document at backtick or tilde fences whose info string starts with `mermaid`, and an unterminated fence stays Markdown so a document still streaming keeps showing source text.

Diagram regions ask the module loader for the package's graph chunk through `require.async`, the only chunk request this loader resolves. Mermaid's ESM entry splits its diagram types behind dynamic `import()`; those split points share modules with the graph above them, so the shared preset would emit sibling chunks reached by synchronous relative `require` calls that never resolve — a manual chunk or `advancedChunks` group makes rolldown stop emitting the import expression the preset rewrites, and marking the specifier external degrades to a native `import()` that resolves against the document URL. The package's second build entry therefore inlines Mermaid's whole graph into one self-contained, minified chunk (about 3.4 MB) that only a document containing a diagram fetches. Rendering uses `securityLevel: 'strict'` and the palette read from `body[data-ds-dark-theme]`; a parse failure shows the source with the reason, and a failed chunk load is retried by the next diagram.

| File | Responsibility |
|---|---|
| `src/client/index.ts` | Registry metadata, slot body registration, locale dictionaries |
| `src/client/MarkdownMermaidBody.tsx` | Region layout over the shared `MarkdownText` |
| `src/client/mermaid-fences.ts` | Fence splitting, pure and parser-free |
| `src/client/MermaidDiagram.tsx` | Per-diagram state: progress, rendered SVG, source with the failure reason |
| `src/client/graph-loader.ts` | Chunk request, memoization, retry after a failure |
| `src/client/mermaid-graph.ts` | The graph chunk: initialize, render, failure cleanup |
| `tsdown.config.ts` | The second build entry that makes the graph chunk self-contained |

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-sidebar-documentpreview](../ui-sidebar-documentpreview/README.md) — the registry and slot this implementation registers into.
- [ui-primitives](../ui-primitives/README.md) — the shared Markdown renderer and code block it reuses.
- [ui-theme](../ui-theme/README.md) — the palette tokens and the resolved-theme attribute it reads.

-----

<a id="model-experience"></a>
## Model Experience

None, as the viewer only draws diagrams for the reader and registers no model-facing tool, event, or prompt surface.

#### KV Cache effect

None: the plugin never contributes request text, so it cannot extend or invalidate a prompt prefix.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

- A link reference definition or a footnote sequence that spans a diagram fence does not link up across the boundary, and footnote numbering restarts per region.
- A diagram keeps the palette resolved when it rendered; switching the shell theme does not recolor diagrams already on screen until their region remounts.
- The first diagram of a document fetches the graph chunk, which carries every Mermaid diagram type because the loader cannot resolve Mermaid's own code splitting. A deployment that wants none of that weight leaves the row out.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

`pnpm --filter @deepseek-ai/dsh-client-ui-markdown-mermaid bundle` emits `lib/client.js`, the tiny automatic `lib/client.mermaid-runtime.js`, and the self-contained `lib/client.mermaid-graph.js`; the module registry serves built artifacts, never sources. Changing either build entry in `tsdown.config.ts` means re-checking that no emitted chunk carries a synchronous relative `require`.

</details>