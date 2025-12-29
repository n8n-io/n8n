import type { StartedTestContainer, StartedNetwork } from 'testcontainers';

export interface FileToMount {
	content: string;
	target: string;
}

export interface ServiceMeta {
	/**
	 * Files to mount into n8n containers. Use when n8n needs files that can't
	 * be passed via environment (e.g., NODE_EXTRA_CA_CERTS requires a file path).
	 * See keycloak.ts for usage example.
	 */
	n8nFilesToMount?: FileToMount[];
}

export interface ServiceResult<TMeta = unknown> {
	container: StartedTestContainer;
	meta: TMeta;
}

export interface StartContext {
	config: StackConfig;
	projectName: string;
	mains: number;
	workers: number;
	isQueueMode: boolean;
	usePostgres: boolean;
	needsLoadBalancer: boolean;
	environment: Record<string, string>;
	serviceResults: Record<string, ServiceResult>;
	allocatedPorts: { main?: number; loadBalancer?: number };
	baseUrl?: string;
}

export interface StackConfig {
	mains?: number;
	workers?: number;
	postgres?: boolean;
	env?: Record<string, string>;
	projectName?: string;
	resourceQuota?: { memory?: number; cpu?: number };
	services?: string[];
}

export interface Service<TResult extends ServiceResult = ServiceResult> {
	readonly description: string;
	readonly dependsOn?: readonly string[];
	shouldStart?(ctx: StartContext): boolean;
	getOptions?(ctx: StartContext): unknown;
	start(
		network: StartedNetwork,
		projectName: string,
		options?: unknown,
		ctx?: StartContext,
	): Promise<TResult>;
	env?(result: TResult): Record<string, string>;
	extraEnv?(result: TResult): Record<string, string>;
	verifyFromN8n?(result: TResult, n8nContainers: StartedTestContainer[]): Promise<void>;
}

export interface HelperContext {
	containers: StartedTestContainer[];
	findContainer(pattern: RegExp): StartedTestContainer | undefined;
	serviceResults: Record<string, ServiceResult>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ServiceHelpers {}

export type HelperFactory<T> = (ctx: HelperContext) => T;

export type HelperFactories = {
	[K in keyof ServiceHelpers]: HelperFactory<ServiceHelpers[K]>;
};
