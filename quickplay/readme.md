# n8n Fork for Quickplay Videocoud Platform

- [Compare this fork with original n8n repo](https://github.com/n8n-io/n8n/compare/master...fl-g6:qp-n8n:master) to know what exactly was changed in this fork

## Development setup

```
pnpm install
pnpm run build
pnpm start
```

## Hiding UI components

To hide or change the visibility conditions of the sidebar elements, start your research with a file `packages/editor-ui/src/components/MainSidebar.vue`.
You can use `v-if` attribute to control visibility of elements and use any property from `computed` object as value. In `computed` you can refer to different stores (packages/editor-ui/src/stores).

To control access to routes, refer to `packages/editor-ui/src/router.ts`.

Some expressions use `frontendSettings` (search for `this.frontendSettings =` in `packages/cli/src/Server.ts`). Many of these params obtain its value from configuration - `packages/cli/src/config/schema.ts`.


## Update from upstream

The procedure of actions:
- update from upstream (see commands below)
- commit merge result with all conflicts
- resolve conflicts

To update from upstream tag:
```bash
git fetch upstream --tags
git checkout master
git pull
git checkout $new_branch
git merge n8n@1.25.1
```

Resolving merge conflicts:
- To find all merge conflicts, search for ">>>>>>> n8n@1.25.1" in all files.
- Open changes: https://github.com/n8n-io/n8n/compare/master...fl-g6:qp-n8n:master
- For each conflict file do:
  - Open file
  - Look for original [changes](https://github.com/n8n-io/n8n/compare/master...fl-g6:qp-n8n:master) in file **to understand what was implemented and why**.
  - In general case, we have to accept **incomming changes** and apply qickplay changes according to new architecture/changes.


### `git merge n8n@1.25.1` Log

```bash
$ git merge n8n@1.25.1
Auto-merging packages/cli/src/Server.ts
CONFLICT (content): Merge conflict in packages/cli/src/Server.ts
CONFLICT (modify/delete): packages/cli/src/middlewares/externalJWTAuth.ts deleted in n8n@1.25.1 and modified in HEAD.  Version HEAD of packages/cli/src/middlewares/externalJWTAuth.ts left in tree.
Auto-merging packages/design-system/src/css/skeleton.scss
CONFLICT (content): Merge conflict in packages/design-system/src/css/skeleton.scss
Auto-merging packages/editor-ui/src/components/ExecutionsView/ExecutionCard.vue
Auto-merging packages/editor-ui/src/components/MainSidebar.vue
CONFLICT (content): Merge conflict in packages/editor-ui/src/components/MainSidebar.vue
Auto-merging packages/editor-ui/src/router.ts
CONFLICT (content): Merge conflict in packages/editor-ui/src/router.ts
Auto-merging packages/editor-ui/src/utils/nodeViewUtils.ts
CONFLICT (content): Merge conflict in packages/editor-ui/src/utils/nodeViewUtils.ts
Auto-merging packages/editor-ui/src/utils/userUtils.ts
CONFLICT (content): Merge conflict in packages/editor-ui/src/utils/userUtils.ts
Automatic merge failed; fix conflicts and then commit the result.
```

Key commits:
- Nov 23, 2023 [feat(editor): Add routing middleware, permission checks, RBAC store, RBAC component](https://github.com/n8n-io/n8n/commit/67a88914f2f2d11c413e7f627d659333d8419af8)
- Dec 27, 2023 [refactor(core): Use Dependency Injection for all Controller classes (no-changelog)](https://github.com/n8n-io/n8n/commit/f69ddcd79646389f2fdbc764b96a7e42e4aa263b)
