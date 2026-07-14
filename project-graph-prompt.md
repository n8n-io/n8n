# Make the project dependency graph behave like the approved prototype

## Context

This branch (uncommitted work) adds a project-level dependency graph view to n8n: a canvas
showing the workflows and folders in a project, connected by their cross-workflow
relationships. A standalone HTML prototype of the intended interaction design lives at
`./project-graph-prototype.html` in the repo root (open it directly in a browser; do not
commit it). It is the source of truth for behavior and feel. Your job is to bring the
branch's Vue implementation up to parity with that prototype.

## What exists on this branch

Backend (mostly fine, two small additions needed — see "Backend changes"):
- `packages/cli/src/modules/project-dependency-graph/project-dependency-graph.service.ts` +
  controller — `GET /projects/:projectId/dependency-graph?folderId&explode&draft&relationshipTypes`
  returns `{ nodes, edges, members, variables, stats }` scoped to one folder level
  (`folderId=0` = project root). Workflow→workflow edges: `calls-workflow`, `uses-as-tool`,
  `handles-errors-for`. Referenced workflows outside the scoped folder are included as
  nodes with `expanded: false`.
- `packages/@n8n/api-types/src/schemas/project-dependency-graph.schema.ts` — types.

Frontend (`packages/frontend/editor-ui/src/features/projects/canvas/`):
- `ProjectCanvas.vue` — vue-flow canvas replacing `WorkflowsView` on the
  `projects/:projectId/workflows` and `projects/:projectId/folders/:folderId?/workflows`
  routes (`features/collaboration/projects/projects.routes.ts`). Merges all cached folder
  graphs, rebuilds nodes/edges, full dagre re-layout + `fitView` on every change.
- `composables/useProjectDependencyGraph.ts` — per-folder fetch cache + `expandedFolders` set.
- `composables/useProjectCanvasLayout.ts` — dagre LR layout, every node laid out flat.
- `components/ProjectCanvasNode.vue` — card with generic workflow icon, Active/Inactive
  badge, Creds/Tables/Tags count badges; folder card with chevron. Handles: `target-left`,
  `source-right`, `source-bottom` (no top target handle).
- `components/ProjectCanvasEdge.vue` — calls = orange bezier, tool = violet dashed smoothstep.

## Problems with the current behavior (all observed in code)

1. **No folder aggregation.** Workflows inside collapsed folders leak onto the canvas as
   the server's "referenced" ghost nodes, and edges point at them directly. Folders and
   their contents float as disconnected flat nodes — folder membership is invisible.
2. **Expanding a folder just dumps more flat nodes** and re-runs dagre over everything;
   every expand/collapse/filter toggle scrambles all positions and re-fits the viewport.
3. **Tool edges are wired wrong**: `targetHandle: 'source-right'` — they enter the target's
   right side (and via a handle of type `source`). The prototype's rule is bottom-of-source
   → **top-of-target**. There is no top handle on the node component at all.
4. No containers, no animation, no overlap handling, no drag-to-file, no hover
   highlighting, generic node icons, and edges have no arrowheads.
5. **Missing edges from a stale dependency index.** The draft/published filter is already
   handled (`getGraph` passes `options.draft` through untouched; `undefined` = both draft
   and published rows in `WorkflowDependencyQueryService`). But `aiToolWorkflowCall` is a
   brand-new dependency type on this branch, and the indexer only writes rows on workflow
   save/activate events or for workflows the startup backfill considers "needing
   indexing". Workflows indexed before this branch never re-index, so `uses-as-tool`
   edges are missing at the source (a dev database can have literally zero
   `aiToolWorkflowCall` rows while showing plenty of other dependency rows). Make the
   backfill invalidate on indexer version — bump a version constant stored with the
   `workflowIndexed` marker so `buildIndex` reprocesses every workflow once after the
   extraction logic changes — and verify with:
   `SELECT "dependencyType", COUNT(*) FROM workflow_dependency GROUP BY 1;`

## Target behavior (match `project-graph-prototype.html` exactly unless noted)

### 1. Folders aggregate their contents
- Default view: only root-level workflows and root-level folder nodes. Nothing inside a
  collapsed folder appears on canvas.
- Any edge whose endpoint is hidden inside a collapsed folder re-routes to that workflow's
  **outermost collapsed ancestor folder**, deduplicated per (visibleSource, visibleTarget,
  type). Edges whose endpoints resolve to the same visible node are dropped.
- Collapsed folder card shows a folder icon, name, "N workflows inside" subtitle, and a
  count pill (N = descendant workflow count, recursive).

### 2. Expand / collapse in place
- Clicking a folder expands it **in place** into a dashed rounded container with a header
  (uppercase folder name, workflow count, collapse affordance). Children animate outward
  from the folder's position into a wrap-grid inside the container (4 per row).
- Edges immediately re-resolve to the real child workflows, including edges that cross the
  container boundary. Internal edges render between children.
- Nested folders render as folder nodes inside the parent container and expand into nested
  containers. Collapsing a folder auto-collapses its expanded descendants, animates direct
  children back into a collapsed folder node placed at the container's origin.
- The vue-flow-idiomatic mapping is sub-flows: container = a non-draggable group/parent
  node, children with `parentNode` set and relative positions; z-order parents behind
  children. If group nodes fight the animation model, absolutely-positioned overlay
  containers (as in the prototype: container bbox derived each frame from child rects +
  padding + header) are acceptable.

### 3. Overlap resolution instead of global re-layout
- Never re-run the full layout after the initial render. Positions are stable; expansion
  pushes neighbours out of the way, collapse leaves them where they are.
- On expand, compute the container's final rect, then push every other same-level unit
  (workflow cards, collapsed folder cards, other containers — a container moves with all
  its children as one unit) clear of it with ~40px clearance, along the axis of minimal
  displacement. Iterate to convergence (cap ~40 passes): clear overlaps with the fixed
  (newly expanded) rect first each pass, then separate movable pairs by splitting the push
  between both; finish with a guaranteed sweep so nothing remains under the expanded
  container. For nested expansion, resolve at each ancestor level (siblings inside the
  parent container first, then the grown parent container against root-level units).
  Port this directly from `resolveLevel` / `resolveAround` / `separationVector` in the
  prototype — the naive "move one node per pass" version oscillates and fails to converge.
- All movement animates (~260 ms cubic ease-out). Add a completion watchdog per tween
  (setTimeout at duration + ~120 ms that snaps to target and fires the callback if the
  rAF loop was throttled) — background/embedded tabs otherwise leave moves half-applied.

### 4. Initial automatic layout (replace flat dagre-over-everything)
- Lay out **root-level units only** (root workflows + root folder nodes), using the
  folder-aggregated edge set. Dagre LR with the aggregated edges may be acceptable, but
  match the prototype's rules: columns = longest path along **trigger edges only**
  (left → right); a node referenced only by tool edges sits in its caller's column, below
  it; order within a column by barycenter of already-placed neighbours.
- Units with no edges go into a separate grid (5 per row) below the connected graph.
- `fitView` once on first load only — never on expand/collapse/filter changes.
- Nodes are **never** freely draggable (`nodes-draggable` stays effectively false; see §7).

### 5. Edges
- `calls-workflow` ("Triggered by"): solid, **muted grey** (not orange), bezier, from
  right of source to left of target, small arrowhead at the target (vue-flow
  `markerEnd`). n8n token: something like `--color-foreground-dark`-ish muted grey; the
  prototype uses `#a8a294`.
- `uses-as-tool`: violet dashed bezier, from **bottom of source to top of target**
  (add a `target-top` handle of type `target` to the node component and use it),
  arrowhead at the target. Keep `handles-errors-for` on the trigger styling for now.
- No edge labels of any kind.
- Hovering a node highlights its connected edges (thicker/darker) and dims all others
  (~0.18 opacity); leaving clears it.

### 6. Node cards (n8n visual language, per the prototype)
- Workflow card: 38px rounded icon tile + name (semibold, ellipsized) + subtitle row of
  status dot (green when `active`) and the trigger type label.
- Icon tile per trigger type: Chat/Webhook/Slack → brand-tinted, Schedule/Form → teal,
  Error → amber, MCP → violet, Sub-workflow/Manual → grey. A workflow that is the target
  of any `uses-as-tool` edge overrides to the violet tool icon and "Tool workflow" label.
  The backend must supply the trigger type (see "Backend changes"); until it does, derive
  what's available and default to Sub-workflow.
- Drop the Creds/Tables/Tags badges from the card for this view (keep `DependencyPill`
  work untouched elsewhere).
- Folder card: dashed border, amber folder icon tile, count pill in the top-right corner.
- Keep the existing behavior that clicking a **workflow** card navigates to that workflow;
  folders toggle expand/collapse. (Prototype has no navigation; this is a deliberate keep.)

### 7. Drag = filing only (no free repositioning)
- Dragging a workflow card lifts it (shadow, follows cursor, its edges follow live; the
  source container's bbox ignores it while lifted).
- Valid drop targets highlight as the cursor moves: collapsed folder cards take priority,
  otherwise the **deepest** expanded container under the cursor. Dropping:
  - on a collapsed folder → card glides into the folder node and disappears; count pill,
    edge re-routing, everything updates;
  - into an expanded container → the container's grid re-packs with the workflow slotted
    in, and overlap resolution runs;
  - from inside a container onto empty canvas → moves the workflow to project root at the
    drop point; the source container re-packs (a folder emptied this way collapses away);
  - anything else (root card onto empty canvas, onto another workflow, back into its own
    folder) → snaps back to its position. Free repositioning must be impossible.
- Persist the move: call the existing workflow update/move API (the same endpoint the
  workflows list uses to move a workflow between folders — look at how
  `WorkflowsView`/folder move actions do it) with the new `parentFolderId`, optimistic UI,
  toast + revert on failure.
- Folders are not draggable.

### 8. Keep from the current branch
- The relationship-type filter checkboxes (calls/tool/error) — they compose fine with
  aggregation; re-resolve visible edges when toggled, without re-layout.
- Back-to-projects toolbar, loading/empty states, MiniMap/Controls, route wiring.
- The per-folder fetch cache in `useProjectDependencyGraph` (lazy fetch on expand is right).

## Backend changes (small, in `project-dependency-graph.service.ts` + schema)

1. **Referenced workflow nodes need `metadata.parentFolderId`** (and ideally the full
   ancestor folder chain up to the scoped root, e.g. `metadata.folderPath: string[]`).
   Without it the client cannot re-route an edge to the correct collapsed folder — today
   referenced nodes have empty `metadata`. This is the one blocking backend gap.
2. **Folder nodes need a descendant workflow count** (`metadata.workflowCount`) for count
   pills, computed recursively over the folder hierarchy.
3. Workflow nodes should carry a `metadata.triggerType` (one of: chat, webhook, schedule,
   slack, error, form, mcp, subworkflow, manual, none) derived from the workflow's trigger
   nodes, so the card icons work. If that's too costly here, put it behind the existing
   workflow-index data and default the UI gracefully.

## Verification

- `pnpm --filter n8n-editor-ui typecheck && pnpm --filter n8n-editor-ui lint` clean;
  build the cli package if backend types changed.
- Run the app (`pnpm dev`), open a project with folders (including one nested folder) and
  cross-folder trigger + tool relationships, and walk the whole matrix against
  `project-graph-prototype.html` side by side:
  root aggregation and edge dedup → expand each folder (neighbours pushed, nothing
  overlaps, edges reconnect to children) → nested expand → collapse (descendants
  auto-collapse) → hover highlighting → all four drag outcomes (into collapsed folder,
  into open container, out to root, snap-back) including persistence after reload →
  filter toggles → confirm positions never globally re-shuffle and fitView only fires once.
- Add/update component tests for: edge re-routing to collapsed ancestors (incl. nested),
  edge dedup, overlap-resolution convergence (no unit overlaps the fixed rect after
  resolve), drag-drop target resolution (collapsed folder beats container, deepest
  container wins), and snap-back.

Work through this incrementally — aggregation + expand/collapse first, then layout
stability, then drag-to-file — keeping the branch compiling at each step. Do not commit
`project-graph-prototype.html` or this prompt file.
