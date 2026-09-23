# Agent Note: Sidebar Mermaid Markdown viewer

Status: implemented

English | [中文](2026-09-23-sidebar-mermaid-markdown.zh.md)

## Problem

A Markdown document opened in the right Sidebar rendered every ```mermaid fence as ordinary highlighted code, so the design documents that carry diagrams were readable only as source. The shared Markdown renderer has no per-language fence seam, and the document-preview registry had no implementation that understood diagram fences.

## Decision

A new client plugin, `@deepseek-ai/dsh-client-ui-markdown-mermaid`, registers an `md`/`markdown` document implementation in the registry's external priority band, so it becomes the selected Markdown viewer while the builtin implementation stays in the viewer menu. Its body renders the accumulated document through `splitMermaidFences`: a closed fence whose info string starts with `mermaid` becomes a diagram, and every other region keeps `MarkdownText` with the builtin's copy and footnote labels.

The package emits two artifacts. The entry holds the viewer and requests the package's graph chunk through the loader's `require.async`; a second build entry emits that chunk with code splitting off, so Mermaid's whole module graph is inlined into one self-contained, minified file (about 3.4 MB) that only a document containing a diagram fetches. Rendering uses `securityLevel: 'strict'` and the palette read from `body[data-ds-dark-theme]` at render time. A failure shows the source with the reason and names a chunk load separately from a render error, and a failed load is retried by the next diagram.

## Alternatives considered

**A dynamic `import()` of Mermaid through the shared preset.** The obvious form, and the one that fails: Mermaid's ESM entry splits its diagram types behind dynamic `import()`, those split points share modules with the graph above them, and the preset emits the shared modules as sibling chunks reached by synchronous relative `require` calls. The browser module loader answers bare specifiers from the module table and relative requests only through `require.async`, so the chunk threw at load and every diagram fell back to its source.

**A manual chunk or `advancedChunks` group covering Mermaid's graph.** This removes the sibling edges, but rolldown then stops emitting the dynamic-import expression the preset rewrites, and the build fails on a chunk that is declared but never rendered.

**Marking the runtime specifier external.** The entry then emits a native `import()`, which resolves against the document URL instead of the plugin URL and 404s inside the plugin factory.

**Mermaid's prebuilt UMD bundle.** Self-contained by construction, but it assigns `globalThis["mermaid"]` from a top-level `var`, which only holds in a real script scope; inside a module factory that read throws. Both the minified and unminified dist carry the assumption.

**Inlining Mermaid into the plugin entry.** No chunking problem at all, at the cost of every GUI boot fetching and evaluating the whole graph for a feature most documents never use.

**A fence-renderer seam in `ui-primitives`.** Registering a diagram renderer by fence language would cover Markdown everywhere, including chat transcripts and tool results. It changes the shared renderer whose DOM parity fixtures and per-file coverage gate own its byte-exact output, and the capability asked for is the Sidebar document view.

**Post-processing the rendered DOM.** Rewriting `[data-code-block-content]` after `MarkdownText` rendered would keep a single parse for the whole document, but it mutates a React-owned subtree, so any re-render can restore the code block under a live SVG; segmenting keeps React the only writer.

**An installable out-of-tree bundle.** `dsh plugin add` avoids touching this checkout, but the package still needs the client bundle pipeline, and a browser roster row added that way has to be validated in a profile boot before it can be recommended.

## Consequences

Markdown files in the Sidebar render diagrams, and the viewer menu lists two Markdown implementations. Because regions are parsed independently, a link reference definition or a footnote sequence that spans a fence no longer links up across the boundary, and footnote numbering restarts per region.

The lazy chunk carries every Mermaid diagram type (about 3.4 MB minified) because the loader cannot resolve Mermaid's own code splitting; a document fetches it on its first diagram and the loader caches it for later ones. Mermaid is a devDependency inlined into that chunk, so `THIRD_PARTY_NOTICES.md` now lists it as distributed browser content.

Verification: `tests/mermaid-fences.client.spec.ts` (splitting, including streaming and nested fences), `tests/graph-loader.client.spec.ts` (one load, retry after a failed load, retry after a failed render), `tests/mermaid-graph.client.spec.ts` (palette, render, failure cleanup), `tests/mermaid-diagram.client.spec.tsx` (progress, rendered SVG, reason and source on failure, source change), and `tests/mermaid-diagram-load.client.spec.tsx` (a load failure named as one). The artifacts are also evaluated outside the browser: `lib/client.mermaid-graph.js` registers as a chunk, exports `renderDiagram`, and renders a flowchart and a sequence diagram, with no synchronous relative `require` in any emitted chunk.