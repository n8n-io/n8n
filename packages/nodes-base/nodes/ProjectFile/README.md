# Project file node

Reads, saves and deletes **project files** — persistent files attached to a
project, alongside its workflows and data tables — from inside a workflow.

Node type: `n8n-nodes-base.projectFile` · displayed as **Project file**.

Project files outlive executions. A file written by one workflow is readable by
every other workflow in the same project, and shows up on the project's **Files**
tab, attributed to the workflow that wrote it.

---

## Operations

| Operation | Input | Output |
|---|---|---|
| **Write** | Binary field on the item | File metadata as JSON; the input binary is passed through unchanged |
| **Read** | A file selector | File metadata as JSON, plus the file's bytes as binary |
| **Delete** | A file selector | `{ id, name, deleted: true }` |

One operation applies to every input item — the node loops, so ten items on a
Write means ten files (or ten replacements of the same file, if the name is
static).

## Parameters

### Write

| Parameter | Default | Notes |
|---|---|---|
| **Input Binary Field** | `data` | The item's binary field holding the file to save |
| **File Name** | `{{ $binary[$parameter.binaryPropertyName].fileName }}` | Name to store the file under. Unique per project |
| **Replace Existing File** | on | When off, the node fails instead of replacing a file of the same name |

### Read and Delete

| Parameter | Default | Notes |
|---|---|---|
| **File** | *From List* | Pick the file three ways: **From List** (searchable picker), **By Name**, or **By ID** |
| **Put Output File in Field** *(read only)* | `data` | Output binary field to place the file in |

**By Name** is usually the right mode in an automation: names are the stable,
human-meaningful handle (`rates-latest.csv`), while ids are generated. Use
**From List** while building and **By Name** once the workflow is wired up.

---

## Usage

### Save a generated file

Anything that produces binary data can feed Write — *Convert to File*, *HTTP
Request* downloading a document, *Extract from File*, *Read/Write Files from
Disk*, a *Code* node building a buffer.

```
HTTP Request → Convert to File → Project file (write)
                                 File Name: rates-latest.csv
                                 Replace Existing File: on
```

Because the name is fixed and replacement is on, every run **updates the same
file** instead of accumulating copies. That is the useful pattern for a "current
state" artifact other workflows read.

### Keep a dated archive as well

Wire two Write nodes off the same binary — one with a dated name, one with a
stable name:

```
Convert to File ─┬→ Project file (write)  rates-2026-08-12-EUR.csv   replace: off
                 └→ Project file (write)  rates-latest.csv           replace: on
```

The dated node has replacement **off**, so a second run on the same day fails
loudly rather than silently rewriting history.

### Read a file back

```
Project file (read) → Extract from File → …
File: By Name → rates-latest.csv
```

The read puts the bytes on the item as binary, so any node that consumes binary
data works downstream. The file's metadata (`name`, `mimeType`, `fileSizeBytes`,
`updatedAt`, …) lands in the item's JSON.

### Clean up

```
Project file (delete)
File: By Name → temp-export.csv
```

Deletion is **permanent** — the row and the stored bytes both go. There is no
soft delete and no version history to restore from.

---

## Behavior worth knowing

**Which project?** Always the project that owns the workflow. There is no project
parameter: a workflow can only reach its own project's files, which is also the
authorization boundary. Moving the workflow to another project moves which files
it can see.

**The workflow must be saved.** Project resolution needs a persisted workflow, so
an unsaved workflow fails with *"Could not find the project this workflow belongs
to."*

**Names are normalized and unique per project.** They are sanitized on the way in
and the same normalization is applied when you address a file by name, so
`  report.csv  ` finds `report.csv`. An empty name is rejected rather than
silently renamed. Names longer than 200 characters are truncated.

**There are no folders.** The name is a flat string, and characters that are
invalid in a filename — including `/` and `\` — are replaced with `_`. So
`reports/rates.csv` is stored as `reports_rates.csv`, not as `rates.csv` inside a
`reports` folder. Prefixes still work fine as a naming convention, they just are
not a hierarchy:

```
rates-2026-08-12-EUR.csv     ✅ reads back exactly as written
reports-rates-2026-08-12.csv ✅ prefix as convention
reports/rates-2026-08-12.csv ⚠️  stored as reports_rates-2026-08-12.csv
```

> Name matching is **case-sensitive on Postgres** and case-insensitive on
> SQLite/MySQL. On SQLite, `Logo.png` and `logo.png` are the same file; on
> Postgres they are two. Pick one casing convention and stick to it.

**Attribution.** Files written by this node are credited to the **workflow**, not
to whoever triggered it. The Files tab shows the workflow name, linking back to
it.

**Read copies the bytes.** A read does not hand the item a reference to the
stored file; it streams a fresh copy into execution storage. So reading a large
file repeatedly costs disk for as long as those executions are retained. This is
deliberate — see [Why read copies](#why-read-copies).

**Errors are per item.** Turn on *Continue on Fail* to collect an `error` on the
item instead of stopping the branch — useful for best-effort cleanup with Delete,
or for a Write that may hit a name conflict.

---

## Limits

| Limit | Default | Env var |
|---|---|---|
| Single file size | 100 MiB | `N8N_PROJECT_FILES_MAX_FILE_SIZE_BYTES` |
| Total per team project | 2 GiB | `N8N_PROJECT_FILES_PROJECT_MAX_SIZE_BYTES` |
| Total across **all** personal projects | 1 GiB | `N8N_PROJECT_FILES_PERSONAL_TOTAL_MAX_SIZE_BYTES` |

Personal projects share one instance-wide budget rather than getting one each, so
a Write from a workflow in a personal project can be refused because of *other
people's* files. The error message says so explicitly.

Exceeding a limit fails the node with a message naming what is used and what the
ceiling is.

## Requirements

- The **`project-files` module must be enabled**. It is on by default; if it is
  listed in `N8N_DISABLED_MODULES` the node fails with a message saying so.
- The instance must use a **persistent binary data mode**. `filesystem` (the
  default outside queue mode), `database` (the default in queue mode), `s3` and
  `azure` all qualify. The in-memory `default` mode keeps no durable reference, so
  writes are rejected with a clear error.

## Not available

- **As an AI tool.** The node is deliberately not `usableAsTool`: an agent
  holding it could delete any file in the project by guessing names.
- **Rename or move.** Use the Files tab in the UI.
- **Listing files as an operation.** The searchable picker lists them, but a
  workflow cannot yet iterate over a project's files.
- **Cross-project access.** By design (see above).

---

## For maintainers

The node cannot import from `packages/cli`, so it reaches the project-files
service through the module-context proxy pattern — the same mechanism the Data
Table node uses:

```
ProjectFile.node.ts
  → this.helpers.getProjectFileProxy()                (packages/nodes-base)
  → getProjectFileHelperFunctions(...)                 (packages/core)
  → additionalData['project-files'].projectFileProxyProvider
  → ProjectFileProxyService                            (packages/cli)
  → ProjectFileService.store / getAsStream / delete / list
```

The proxy is where project resolution, the workflow actor, the
`branchReadOnly` guard, the node-type allowlist and error translation live. The
node itself only marshals parameters and binary data.

Layout:

```
ProjectFile.node.ts        description + operation router
common/utils.ts            proxy access, file-selector → reference
common/methods.ts          fileSearch (backs the "From List" mode)
operations/*.operation.ts  one file per operation
test/                      per-operation suites + a shared setup helper
```

The proxy is exposed in two node-execution contexts: `execute-context.ts` (for
`execute`) and `load-options-context.ts` (for the file picker). It is
deliberately **absent** from `supply-data-context.ts`, which is the AI-tool path.

### Why read copies

Read streams the stored bytes into a new execution-scoped binary rather than
putting the project file's own `binaryDataId` on the item.

`GET /rest/binary-data?id=` is authenticated but performs **no ownership check**,
so a project file's reference appearing in execution data would let anyone who
can view that execution read the file — across projects. Copying also gives the
right lifecycle: the copy is pruned with the execution, while the project file is
untouched.

There are regression tests for this in `test/read.operation.test.ts` and in
`packages/cli/test/integration/modules/project-files.proxy.test.ts`; if you
change the read path, keep them.
