# `scripts/call-graph-depth/`

Measure how deep the call chains in a set of TypeScript files go.

A deep chain makes code hard to read, test and change: to understand one
function, you must keep every function below it in mind. This script gives a
number for that cost, so a review can set a limit and check it.

## Use

```bash
pnpm call-depth <file-or-dir>… [--tsconfig <path>] [--max <n>] [--json]
pnpm call-depth packages/cli/src/modules/linked-instances --tsconfig packages/cli/tsconfig.json --max 6
```

- `--tsconfig`: the project file that resolves imports. The default is the
  nearest `tsconfig.json` above the first file.
- `--max`: the limit. The exit code is 1 when a function is deeper.
- `--json`: print a machine-readable summary.

## How it measures

1. The script builds one TypeScript program and uses the type checker to
   resolve each call and `new` expression in the target files.
2. A node is a function-like declaration in a target file: a function, a
   method, a constructor, an accessor, or an arrow function.
3. An edge goes to a callee only when the callee is also in a target file.
   Calls into other parts of the repository or into dependencies end the
   chain, so the number describes the code under review.
4. The depth of a function is the number of functions on its longest chain,
   itself included. A leaf has depth 1.
5. Mutual recursion collapses into one step. The report lists recursive
   functions.

Dynamic dispatch through interfaces, callbacks passed as values and calls
through `any` are not resolved. The number is a lower bound.

## Tests

```bash
pnpm call-depth:test
```
