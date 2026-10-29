# Annotate node operations with their effect and idempotency

Date: 2026-10-20

Status: Active

Decision Owner: Nodes

Source: https://linear.app/n8n/issue/NODE-6178

## Context

Engine v2 saves a checkpoint after each step. When a worker crashes during a step, the engine
must decide to run the step again or to fail it. A second run is safe only when the operation is
idempotent. Otherwise an email is sent twice or a payment is charged twice.

n8n Assistant asks for approval before it runs a node. A read-only operation does not need the
approval, and a destructive operation needs a stronger warning. Workflow verification must know
if a node writes, so that it can simulate the node.

Most nodes mix read and write operations. In other nodes a parameter such as an HTTP method or a
`mode` decides the effect. The node description has no field for these facts.

## Decision

A node can declare `annotations` with three fields:

- `effect`: `read` or `write`.
- `destructive`: the operation changes or deletes existing data. An operation that only adds
  data is not destructive.
- `idempotent`: a second run with the same input succeeds and has no additional effect.

The annotations go on the option values of any `options` or `multiOptions` parameter, also inside
a `collection` or a `fixedCollection`, and on the node description. The property and each field
are optional.

One resolver in `n8n-workflow` reads the node parameters and returns a complete value. It
resolves each field separately:

1. The default is the most restrictive value of each field: `write`, destructive, and not
   idempotent.
2. Only explicit values change the default. A permissive value (`read`, not destructive,
   idempotent) replaces the default.
3. A restrictive value always wins over a permissive value. One explicit `write` makes the
   result `write`, also when another parameter declares `read`.

Only parameters that are visible for the current configuration count. When an expression in a
parameter does not resolve to one option before the run, the parameter counts as the most
restrictive of its annotated options. A value that matches no option counts as the restrictive
default.

The main reason: node authors put the deciding logic on different parameters. Community nodes
can set annotations wherever the logic of the node is. A fixed list of deciding parameters would
not allow this.

## Alternatives Considered

1. **A node-level `idempotent` flag.** We rejected it because most nodes mix read and write
   operations. One flag would be wrong for one of them.
2. **Annotations only on a fixed list of parameters, such as `operation` and `method`.** We
   rejected it because community nodes keep the deciding logic on other parameters. A fixed list
   would exclude them.
3. **The last or the most specific annotation wins.** We rejected it because the result would
   depend on the order of parameters. A permissive value could hide a write.
4. **A node method that returns the annotations at run time.** We rejected it because it runs
   node code. Catalogs, AI tools, and lint rules could not read it.
5. **The name `flow`.** We rejected it because `flow` would also hold the data shape of the
   output. `annotations` matches the MCP tool annotations.

## Consequences

1. Engine v2 and n8n Assistant read the same values through the same resolver.
2. A node that sets no annotations is treated as a destructive, non-idempotent write. Community
   nodes keep this default until their authors set annotations.
3. A permissive annotation on one parameter cannot hide a write that another parameter declares.
4. The resolver checks the visibility of each parameter, also of nested parameters. Its cost
   grows with the number of visible parameters. Most of the cost comes from filling in the
   parameter defaults, and it stays below a millisecond for each call on the largest nodes.
   Measurement: the Notion node (version 3) with `databasePage/create`, the configuration with
   the most visible nested parameters (213), and three entries in each `fixedCollection`. We ran
   the resolution 1000 times with only the first level of parameters and 1000 times with all
   nested parameters, on an Apple M4 Pro. The first level took 0.14 to 0.19 ms for each call. All
   nested parameters took 0.16 to 0.24 ms. Filling in the defaults alone took 0.13 to 0.14 ms.
5. A new annotation field must be optional and must have a restrictive default. Then it does not
   change behavior for nodes that do not set it.
6. An operation whose effect cannot be known, such as a raw SQL query, sets no annotation and
   stays at the default.
7. Annotations on `boolean` parameters are not possible. A node that needs them must model the
   choice as an `options` parameter.
8. Each node version has its own description, so each version has its own annotations. A version
   without annotations keeps the restrictive default.
9. A `collection` child that the user did not set counts with its default value. This is correct
   only when the node code uses the same default.

## Links

RFC: https://app.notion.com/p/3ff5b6e0c94f81c4a5c8e92855972c30

Documentation: -

Related ADRs: -
