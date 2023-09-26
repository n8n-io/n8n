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
