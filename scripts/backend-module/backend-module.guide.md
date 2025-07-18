# Backend module

A backend module is a self-contained unit of functionality tied to a specific feature.

Benefits of modularity:

- **Organization:** Keep code structured, focused and discoverable
- **Independence**: Reduce conflicts among teams working independently
- **Decoupling**: Prevent features from becoming entangled with internals
- **Simplicity:** Make logic easier to maintain, test and reason about
- **Efficiency**: Load and run only modules that are explicitly enabled

## File structure

To set up a backend module, run this command at monorepo root:

```sh
pnpm setup-backend-module
```

Your new module will be located at `packages/cli/src/modules/my-feature`. Rename `my-feature` in the dirname and in the filenames to your actual feature name, Use kebab-case.

A module’s file structure is as follows:

```sh
.
├── __tests__
│   ├── my-feature.controller.test.ts
│   ├── my-feature.service.test.ts
│		└── ...
├── my-feature.entity.ts            # DB model
├── my-feature.repository.ts        # DB access
├── my-feature.config.ts            # env vars
├── my-feature.constants.ts         # constants
├── my-feature.controller.ts        # HTTP REST routes
├── my-feature.service.ts           # business logic
└── my-feature.module.ts            # entrypoint
```

This is only a template - your module may not need all of these files, or it may need more than these and also subdirs to keep e.g. multiple entities and repositories organized. Infixes are currently not enforced (except for the `.module.ts` entrypoint), but infixed are strongly recommended, as they make the contents of a module searchable and discoverable.

Since backend modules curreny live at `packages/cli/src/modules`, imports can be:

- from inside the module dir
- from common packages like `@n8n/db`, `@n8n/backend-common`, `@n8n/backend-test-utils`, etc.
- from third-party libs available in, or added to, `cli`

Enabling and disabling modules is done via the env vars:

- To enable a module so that it is **activated** on instance startup, set it via the env var `N8N_ENABLED_MODULES`.
- To disable a module so that it is **skipped** on instance startup, set it via the env var `N8N_DISABLED_MODULES`.
- Some modules are **default modules** that are always enabled unless specifically disabled. To make your module enabled by default, add it to `ModuleRegistry.defaultModules` at `packages/@n8n/backend-common/src/modules/module-registry.ts`.

## Entrypoint

The `.module.ts` file is the entrypoint of the module, using the `@BackendModule()` decorator:

```ts
@BackendModule({ name: 'my-feature' })
export class MyFeatureModule implements ModuleInterface {
	async init() {
		await import('./my-feature.controller');

		const { MyFeatureService } = await import('./my-feature.service');

		Container.get(MyFeatureService).start();
	}

	@OnShutdown()
	async shutdown() {
		const { MyFeatureService } = await import('./my-feature.service');

		await Container.get(MyFeatureService).shutdown();
	}

	async entities() {
		const { MyEntity } = await import('./my-feature.entity.ts');
		return [MyEntity]
	}

	async settings() {
		const { MyFeatureService } = await import('./my-feature.service');

		return Container.get(MyFeatureService).settings();
	}
}
```

The entrypoint is responsible for providing:

- initialization logic, e.g. in insights, start running timers to compact insights, 
- shutdown logic, e.g. in insights, stop running timers to compact insights,
- database entities to register with `typeorm`, e.g. in insights, the three database entities `InsightsMetadata`, `InsightsByPeriod` and `InsightsRaw`
- settings sent to the client to adjust the UI, e.g. in insights, `{ summary: true, dashboard: false }`

A module entrypoint may or may not need to implement all of these methods.

Why dynamic imports? `await import('...')` ensures we load module logic **only when needed**, so that n8n instances which do not have a module enabled do not pay for the performance cost. Linting enforces that relative imports in the module entrypoint must use dynamic imports. Loading on demand is also the reason why the entrypoint does not use dependency injection - linting enforces this as well.

A module may be fully behind a license flag:

```ts
@BackendModule({
	name: 'external-secrets',
	licenseFlag: 'feat:externalSecrets'
})
export class ExternalSecretsModule implements ModuleInterface {
  // This module will be activated only if the license flag is true.
}
```

If a module is only _partially_ behind a license flag, e.g. insights, then use the `@Licensed()` decorator instead:

```ts
class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/by-workflow')
	@Licensed('feat:insights:viewDashboard')
	async getInsightsByWorkflow(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListInsightsWorkflowQueryDto,
	) {
		const dateRangeAndMaxAgeInDays = this.getMaxAgeInDaysAndGranularity({
			dateRange: payload.dateRange ?? 'week',
		});
		return await this.insightsService.getInsightsByWorkflow({
			maxAgeInDays: dateRangeAndMaxAgeInDays.maxAgeInDays,
			skip: payload.skip,
			take: payload.take,
			sortBy: payload.sortBy,
		});
	}
}
```

Module-level decorators to be aware of:

- `@OnShutdown()` to register a method to be called during the instance shutdown sequence

## Controller

To register a **controller** with the server, simply import the controller file in the module entrypoint: 

```ts
@BackendModule({ name: 'my-feature' })
export class MyFeatureModule implements ModuleInterface {
	async init() {
		await import('./my-feature.controller');
	}
}
```

A controller must handle only request-response orchestration, delegating business logic to services.

Controller-level decorators to be aware of:

- `@RestController()` to define a REST controller
- `@Get()`, `@Post()`, `@Put()`, etc. to define controller routes
- `@Query()`, `@Body()`, etc. to validate requests
- `@GlobalScope()` to gate a method depending on a user's instance-wide permissions
- `@ProjectScopeo()` to gate a method depending on a user's project-specific permissions
- `@Licensed()` to gate a method depending on license state

## Services

Services handle business logic, delegating to database access to repositories.

To kickstart a service during module init, run the relevant method in the module entrypoint:

```ts
@BackendModule({ name: 'my-feature' })
export class MyFeatureModule implements ModuleInterface {
	async init() {
		const { MyFeatureService } = await import('./my-feature.service');
		Container.get(MyFeatureService).start();
	}
}
```

A module may have one or multiple services.

Service-level decorators to be aware of:

- `@Service()` to make a service usable by the dependency injection container
- `@OnLifecycleEvent()` to register a class method to be called on an execution lifecycle event, e.g. `nodeExecuteBefore`, `nodeExecuteAfter`, `workflowExecuteBefore`, and `workflowExecuteAfter`
- `@OnPubSubEvent()` to register a class method to be called on receiving a message via Redis pubsub
- `@OnLeaderTakeover()` and `@OnLeaderStopdown` to register a class method to be called on leadership transition in a multi-main setup

## Repositories

Repositories handle database access using `typeorm`, operating on database models ("entities").

```ts
@Service()
export class MyFeatureRepository extends Repository<MyFeatureEntity> {
	constructor(dataSource: DataSource) {
		super(MyFeatureEntity, dataSource.manager);
	}

	async getSummary() {
		return await /* typeorm query on entities */; 
	}
}
```

Repository-level decorators to be aware of:

- `@Service()` to make a repository usable by the dependency injection container

## Entities

Entities are database models, typically representing tables in the database.

```ts
@Entity()
export class MyFeatureEntity extends BaseEntity {
	@Column()
	name: string;

	@Column()
	count: number;
}
```

We recommend using the `.entity.ts` infix, but omit the `-Entity` suffix from the class name for less verbosity. The `-Entity` suffix in the setup example is only a placeholder.

Entities must be registered with `typeorm` in the module entrypoint:

```ts
class MyFeatureModule implements ModuleInterface {
	async entities() {
		const { MyFeatureEntity } = await import('./my-feature.entity');
		
		return [MyFeatureEntity];
	}
}
```

Entity-level decorators to be aware of:

- `@Entity()` to define an entity (from `typeorm`)

## Migrations

Unlike most aspects of a module, migrations remain centralized at `@n8n/db/src/migrations`, because conditionally running migrations would introduce unwanted complexity at this time. This means that schema changes from modules are always applied to the database, even when modules are disabled.

## Configuration

Module-specific configuration is defined in the the `.config.ts` file:

```ts
@Config
export class MyFeatureConfig {
	/**
	 * How often in minutes to run some task.
	 * @default 30
	 */
	@Env('N8N_MY_FEATURE_TASK_INTERVAL')
	taskInterval: number = 30;
}
```

Config-level decorators to be aware of:

- `@Env()` to define environment variables
- `@Config()` to register a config class and make it usable by the dependency injection container

## CLI commands

Occasionally, a module may need to define a feature-specific CLI command. To do so, set up a `.command.ts` file and use the `@Command()` decorator. Currently there are no module-specific commands, so use any of the existing global CLI commands at `packages/cli/src/commands` as a reference.

## Tests

Place unit and integration tests at `packages/cli/src/modules/{featureName}/__tests__` with the `.test.ts` infix.

Currently, testing utilities live partly at `cli` and partly at `@n8n/backend-test-utils`. In future, all testing utilities will be moved to common packages, to make modules more decoupled from `cli`.

## Future work

1. A few aspects of modules continue to be defined outside the module dir:

- Add a license flag in `LICENSE_FEATURES` at `packages/@n8n/constants/src/index.ts`
- Add a logging scope in `LOG_SCOPES` at `packages/cli/src/logging.config.ts`
- Add a license check to `LicenseState` at `packages/@n8n/backend-common/src/license-state.ts`
- Add a migration (as discussed above) at `packages/@n8n/db/src/migrations`
- Add request payload validation using `zod` at `@n8n/api-types`
- Add a module to default modules at `packages/@n8n/backend-common/src/modules/module-registry.ts`

2. License events (e.g. expiration) currently do not trigger a module activation or shutdown.

3. Some core functionality is yet to be moved from `cli` into common packages. This is not a blocker for module adoption, but this is desirable so that (a) modules become decoupled from `cli` in the long term, and (b) to enable future external extensions to access some of that functionality. 

4. Existing features that are not modules (e.g. LDAP) should be turned into modules over time.

### FAQs

**What is a good example of a backend module?**

Look at the `insights` module at `packages/@n8n/modules/insights`.

**My feature is already a separate package at `packages/@n8n/{feature}`, or I know in advance that my upcoming feature will have zero dependencies on `cli`. How does this work with modules?**

If your feature is or will be fully decoupled from `cli`, you already stand to gain most of the benefits of modularity. In this case, you can add a thin module to `cli` containing an entrypoint to your feature, so that it is loaded only when needed.

**How do I hot reload a module?**

Modules are part of `cli` so you can use the usual `watch` command.

**Are backend modules meant for use by external contributors?**

No, they are meant for sizable features develoepd by the core team.

**How do modules interoperate with each other?**

This is not supported at this time. Please reach out if you need this.

**My module has a requirement that is currently not accounted for by modules. What should I do?**

Aim to keep your module as decoupled as possible, but modules live in `cli` so any imports from `cli` remain available. Decoupling is desirable but a blocker for progress. Reach out if you have a use case where the module system needs to be expanded to prevent introducing tech debt. Some use cases may be rare enough that they are not worth the extra work.
