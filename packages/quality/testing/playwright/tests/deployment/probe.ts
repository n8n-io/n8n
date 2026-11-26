import { isRecord } from '@n8n/utils/is-record';
import { sleep } from '@n8n/utils/sleep';
import { expect, request, test, type APIRequestContext, type APIResponse } from '@playwright/test';
import flatted from 'flatted';
import { execFileSync } from 'node:child_process';
import type { N8NConfig, N8NStack } from 'n8n-containers/stack';
import { createN8NStack } from 'n8n-containers/stack';
import { N8NStartupError } from 'n8n-containers/services/n8n';
import { TEST_CONTAINER_IMAGES } from 'n8n-containers/test-containers';
import { nanoid } from 'nanoid';

const OWNER_EMAIL = 'deployment-probe@example.com';
const OWNER_PASSWORD = 'DeploymentProbe123';
const DISTROLESS_RUNNER_TITLE = 'n8n task runners (distroless)';
const DISTROLESS_RUNNER_USER = '65532:65532';

export interface DeploymentRequestOptions {
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';
	headers?: Record<string, string>;
	data?: unknown;
	timeout?: number;
}

export interface SignInResult {
	version: string;
}

export interface WebhookRunResult {
	workflowId: string;
	webhookPath: string;
	token: string;
	responseBody: Record<string, unknown>;
}

export interface CodeRunResult {
	workflowId: string;
	webhookPath: string;
	responseBody: Record<string, unknown>;
}

export interface RunCodeNodesOptions {
	/** Run a Python Code node in addition to JavaScript (requires an external task runner). */
	python?: boolean;
}

export interface RunCodeNodesResult {
	js: CodeRunResult;
	python?: CodeRunResult;
}

export interface ReadExecutionOptions {
	timeoutMs?: number;
	pollIntervalMs?: number;
}

export interface ReadExecutionResult {
	executionId: string;
	status: string;
	finished: boolean;
	runData: Record<string, unknown>;
}

export interface BinaryRoundTripResult {
	workflowId: string;
	webhookPath: string;
	payload: string;
	extracted: string;
}

export interface ContainerImageInfo {
	containerImage: string;
	imageId: string;
	user: string;
	labels: Record<string, string>;
	repoDigests: string[];
	repoTags: string[];
}

export interface DeploymentCellContext {
	stack: N8NStack;
	probe: DeploymentProbe;
	version: string;
}

export interface DeploymentCellOptions<TProbeOutput = unknown> {
	stack?: N8NConfig;
	probe: (ctx: DeploymentCellContext) => Promise<TProbeOutput>;
	check: (ctx: DeploymentCellContext & { probeOutput: TProbeOutput }) => Promise<void>;
}

function normalizeBaseUrl(baseUrl: string): string {
	return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function normalizeRelativePath(relativePath: string): string {
	return relativePath.replace(/^\/+/, '');
}

function resolveReachableBaseUrl(stack: N8NStack): string {
	const url = new URL(normalizeBaseUrl(stack.baseUrl));
	const containerHost = stack.containers[0]?.getHost();
	if (url.hostname === 'localhost' && containerHost && containerHost !== 'localhost') {
		url.hostname = containerHost;
	}
	return normalizeBaseUrl(url.href);
}

function normalizeArch(arch: string): string {
	if (arch === 'x64') return 'amd64';
	return arch;
}

function unwrapData(body: unknown): Record<string, unknown> {
	if (!isRecord(body)) return {};
	if (isRecord(body.data)) return body.data;
	return body;
}

function toIdString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
}

async function parseJsonBody(response: APIResponse): Promise<{ body: unknown; text: string }> {
	const text = await response.text();
	try {
		return { body: JSON.parse(text), text };
	} catch {
		return { body: null, text };
	}
}

/**
 * API-only probe for published n8n deployments (no browser, no e2e controller).
 * Uses relative paths against a normalized base URL so path prefixes and HTTPS
 * work without changes.
 */
export class DeploymentProbe {
	readonly baseUrl: string;
	private readonly cookies = new Map<string, string>();

	private constructor(
		baseUrl: string,
		private readonly context: APIRequestContext,
	) {
		this.baseUrl = baseUrl;
	}

	static async create(baseUrl: string): Promise<DeploymentProbe> {
		const normalized = normalizeBaseUrl(baseUrl);
		const context = await request.newContext({
			baseURL: normalized,
			ignoreHTTPSErrors: true,
		});
		return new DeploymentProbe(normalized, context);
	}

	async dispose(): Promise<void> {
		await this.context.dispose();
	}

	private captureCookies(response: APIResponse): void {
		for (const header of response.headersArray()) {
			if (header.name.toLowerCase() !== 'set-cookie') continue;
			const pair = header.value.split(';', 1)[0]?.trim();
			if (!pair) continue;
			const separator = pair.indexOf('=');
			if (separator <= 0) continue;
			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1).trim();
			if (value.length === 0) {
				this.cookies.delete(name);
			} else {
				this.cookies.set(name, value);
			}
		}
	}

	private cookieHeader(): string | undefined {
		if (this.cookies.size === 0) return undefined;
		return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	async fetch(relativePath: string, options: DeploymentRequestOptions = {}): Promise<APIResponse> {
		const method = options.method ?? 'GET';
		const headers: Record<string, string> = {
			'browser-id': 'deployment-probe',
			...options.headers,
		};
		const cookie = this.cookieHeader();
		if (cookie && !('cookie' in headers)) {
			headers.cookie = cookie;
		}

		// Retry transient connection resets only on safe reads, never on state-changing requests.
		const maxRetries = method === 'GET' || method === 'HEAD' ? 3 : 0;
		const response = await this.context.fetch(normalizeRelativePath(relativePath), {
			method,
			headers,
			data: options.data,
			timeout: options.timeout,
			maxRetries,
		});
		this.captureCookies(response);
		return response;
	}

	async createWorkflow(
		workflow: Record<string, unknown>,
	): Promise<{ id: string; versionId: string }> {
		const response = await this.fetch('rest/workflows', {
			method: 'POST',
			data: workflow,
		});
		const { body, text } = await parseJsonBody(response);
		if (!response.ok()) {
			throw new Error(`POST rest/workflows failed (${response.status()}): ${text.slice(0, 400)}`);
		}
		const data = unwrapData(body);
		const id = toIdString(data.id);
		const versionId = typeof data.versionId === 'string' ? data.versionId : '';
		if (!id) {
			throw new Error(`POST rest/workflows returned no workflow id: ${text.slice(0, 400)}`);
		}
		return { id, versionId };
	}

	async activateWorkflow(workflowId: string, versionId: string): Promise<void> {
		let response = await this.fetch(`rest/workflows/${workflowId}/activate`, {
			method: 'POST',
			data: { versionId },
		});
		if (response.status() === 404 || response.status() === 405) {
			response = await this.fetch(`rest/workflows/${workflowId}`, {
				method: 'PATCH',
				data: { active: true, versionId },
			});
		}
		if (!response.ok()) {
			const text = await response.text();
			throw new Error(
				`Activate workflow ${workflowId} failed (${response.status()}): ${text.slice(0, 400)}`,
			);
		}
	}

	async triggerWebhook(
		webhookPath: string,
		options: DeploymentRequestOptions & {
			query?: Record<string, string>;
			maxNotFoundRetries?: number;
			retryDelayMs?: number;
		} = {},
	): Promise<APIResponse> {
		const maxNotFoundRetries = options.maxNotFoundRetries ?? 20;
		const retryDelayMs = options.retryDelayMs ?? 250;
		const queryString = options.query ? `?${new URLSearchParams(options.query).toString()}` : '';
		const targetPath = `webhook/${normalizeRelativePath(webhookPath)}${queryString}`;

		let lastResponse: APIResponse | undefined;
		for (let attempt = 0; attempt <= maxNotFoundRetries; attempt++) {
			lastResponse = await this.fetch(targetPath, {
				method: options.method ?? 'GET',
				headers: options.headers,
				data: options.data,
				timeout: options.timeout,
			});
			if (lastResponse.status() !== 404 || attempt === maxNotFoundRetries) {
				return lastResponse;
			}
			await sleep(retryDelayMs);
		}

		return lastResponse!;
	}

	/** Check readiness, complete owner setup if needed, and log in via REST API. */
	async signIn(): Promise<SignInResult> {
		const readinessDeadline = Date.now() + 15_000;
		let ready = false;
		let lastReadinessStatus = 0;
		let lastReadinessBody = '';

		while (Date.now() < readinessDeadline) {
			const res = await this.fetch('healthz/readiness');
			lastReadinessStatus = res.status();
			lastReadinessBody = await res.text();
			if (res.ok()) {
				ready = true;
				break;
			}
			await sleep(250);
		}
		if (!ready) {
			throw new Error(
				`Readiness check failed (${lastReadinessStatus}): ${lastReadinessBody.slice(0, 300)}`,
			);
		}

		const settingsRes = await this.fetch('rest/settings');
		const settingsParsed = await parseJsonBody(settingsRes);
		if (!settingsRes.ok()) {
			throw new Error(
				`GET rest/settings failed (${settingsRes.status()}): ${settingsParsed.text.slice(0, 300)}`,
			);
		}
		const settingsData = unwrapData(settingsParsed.body);
		const userManagement = isRecord(settingsData.userManagement) ? settingsData.userManagement : {};
		const needsOwnerSetup = userManagement.showSetupOnFirstLoad !== false;

		if (needsOwnerSetup) {
			const setupRes = await this.fetch('rest/owner/setup', {
				method: 'POST',
				data: {
					email: OWNER_EMAIL,
					firstName: 'Deployment',
					lastName: 'Probe',
					password: OWNER_PASSWORD,
				},
			});
			if (!setupRes.ok()) {
				const text = await setupRes.text();
				throw new Error(
					`POST rest/owner/setup failed (${setupRes.status()}): ${text.slice(0, 300)}`,
				);
			}
		}

		this.cookies.clear();
		let loginRes = await this.fetch('rest/login', {
			method: 'POST',
			data: {
				emailOrLdapLoginId: OWNER_EMAIL,
				password: OWNER_PASSWORD,
			},
		});
		if (!loginRes.ok()) {
			loginRes = await this.fetch('rest/login', {
				method: 'POST',
				data: {
					email: OWNER_EMAIL,
					password: OWNER_PASSWORD,
				},
			});
		}
		const loginParsed = await parseJsonBody(loginRes);
		if (!loginRes.ok()) {
			throw new Error(
				`POST rest/login failed (${loginRes.status()}): ${loginParsed.text.slice(0, 300)}`,
			);
		}
		const loginData = unwrapData(loginParsed.body);
		if (typeof loginData.id !== 'string' || loginData.id.length === 0) {
			throw new Error(`POST rest/login returned no user id: ${loginParsed.text.slice(0, 300)}`);
		}

		// Authenticated /rest/settings exposes versionCli; unauthenticated responses omit it.
		const authSettingsRes = await this.fetch('rest/settings');
		const authSettingsParsed = await parseJsonBody(authSettingsRes);
		const authSettingsData = authSettingsRes.ok()
			? unwrapData(authSettingsParsed.body)
			: settingsData;
		const version =
			typeof authSettingsData.versionCli === 'string' && authSettingsData.versionCli.length > 0
				? authSettingsData.versionCli
				: 'unknown';

		return { version };
	}

	/** Import and activate a workflow, trigger its production webhook, and verify the response. */
	async runWebhook(): Promise<WebhookRunResult> {
		const token = nanoid(10);
		const webhookId = nanoid(12);
		const webhookPath = `probe-webhook-${nanoid(8).toLowerCase()}`;

		const { id: workflowId, versionId } = await this.createWorkflow({
			name: `Deployment Probe Webhook (${token})`,
			active: false,
			nodes: [
				{
					id: 'webhook',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					webhookId,
					parameters: {
						httpMethod: 'GET',
						path: webhookPath,
						responseMode: 'lastNode',
						responseData: 'firstEntryJson',
						options: {},
					},
				},
				{
					id: 'set',
					name: 'Edit Fields',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [220, 0],
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'echo',
									name: 'echo',
									value: "={{ 'probe:' + $json.query.token }}",
									type: 'string',
								},
							],
						},
						options: {},
					},
				},
			],
			connections: {
				Webhook: { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] },
			},
			settings: { executionOrder: 'v1' },
		});

		await this.activateWorkflow(workflowId, versionId);

		const response = await this.triggerWebhook(webhookPath, { query: { token } });
		const { body, text } = await parseJsonBody(response);
		if (!response.ok()) {
			throw new Error(`Webhook probe failed (${response.status()}): ${text.slice(0, 400)}`);
		}
		if (!isRecord(body) || body.echo !== `probe:${token}`) {
			throw new Error(
				`Webhook probe response mismatch. Expected echo="probe:${token}", got: ${text.slice(0, 400)}`,
			);
		}

		return { workflowId, webhookPath, token, responseBody: body };
	}

	/** Run a JavaScript Code node, and a Python Code node when `python: true`. */
	async runCodeNodes(options: RunCodeNodesOptions = {}): Promise<RunCodeNodesResult> {
		const js = await this.runCodeNode('javaScript');
		if (!options.python) {
			return { js };
		}
		const python = await this.runCodeNode('pythonNative');
		return { js, python };
	}

	private async runCodeNode(language: 'javaScript' | 'pythonNative'): Promise<CodeRunResult> {
		const token = nanoid(10);
		const webhookId = nanoid(12);
		const label = language === 'javaScript' ? 'js' : 'py';
		const webhookPath = `probe-code-${label}-${nanoid(8).toLowerCase()}`;

		const codeParameters =
			language === 'javaScript'
				? {
						mode: 'runOnceForAllItems',
						language: 'javaScript',
						jsCode:
							'const token = $input.first().json.query.token;\nreturn [{ json: { runtime: "js", echo: "js:" + token, result: 21 + 21 } }];',
					}
				: {
						mode: 'runOnceForAllItems',
						language: 'pythonNative',
						pythonCode:
							'token = _items[0]["json"]["query"]["token"]\nreturn [{"json": {"runtime": "python", "echo": f"py:{token}", "result": 6 * 7}}]',
					};

		const { id: workflowId, versionId } = await this.createWorkflow({
			name: `Deployment Probe Code ${label} (${token})`,
			active: false,
			nodes: [
				{
					id: 'webhook',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					webhookId,
					parameters: {
						httpMethod: 'GET',
						path: webhookPath,
						responseMode: 'lastNode',
						responseData: 'firstEntryJson',
						options: {},
					},
				},
				{
					id: 'code',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [220, 0],
					parameters: codeParameters,
				},
			],
			connections: {
				Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
			},
			settings: { executionOrder: 'v1' },
		});

		await this.activateWorkflow(workflowId, versionId);

		const response = await this.triggerWebhook(webhookPath, { query: { token } });
		const { body, text } = await parseJsonBody(response);
		if (!response.ok()) {
			throw new Error(
				`${language} Code node webhook failed (${response.status()}): ${text.slice(0, 400)}`,
			);
		}

		const expectedRuntime = language === 'javaScript' ? 'js' : 'python';
		const expectedEcho = `${label}:${token}`;
		if (
			!isRecord(body) ||
			body.runtime !== expectedRuntime ||
			body.echo !== expectedEcho ||
			body.result !== 42
		) {
			throw new Error(
				`${language} Code node returned unexpected payload. Expected runtime="${expectedRuntime}", echo="${expectedEcho}", result=42. Got: ${text.slice(0, 400)}`,
			);
		}

		return { workflowId, webhookPath, responseBody: body };
	}

	/** Read the finished execution for `workflowId` back via REST API. */
	async readExecution(
		workflowId: string,
		options: ReadExecutionOptions = {},
	): Promise<ReadExecutionResult> {
		const timeoutMs = options.timeoutMs ?? 15_000;
		const pollIntervalMs = options.pollIntervalMs ?? 250;
		const deadline = Date.now() + timeoutMs;

		const params = new URLSearchParams({
			filter: JSON.stringify({ workflowId }),
			limit: '5',
		});

		let settledId: string | undefined;
		let settledStatus: string | undefined;

		while (Date.now() < deadline) {
			const listRes = await this.fetch(`rest/executions?${params.toString()}`);
			const { body, text } = await parseJsonBody(listRes);
			if (!listRes.ok()) {
				throw new Error(`GET rest/executions failed (${listRes.status()}): ${text.slice(0, 400)}`);
			}

			const listData = unwrapData(body);
			const results = Array.isArray(listData.results)
				? listData.results
				: Array.isArray(body)
					? body
					: [];

			for (const entry of results) {
				if (!isRecord(entry)) continue;
				const status = typeof entry.status === 'string' ? entry.status : '';
				if (
					status === 'success' ||
					status === 'error' ||
					status === 'crashed' ||
					status === 'canceled'
				) {
					settledId = toIdString(entry.id);
					settledStatus = status;
					break;
				}
			}

			if (settledId) break;
			await sleep(pollIntervalMs);
		}

		if (!settledId) {
			throw new Error(
				`readExecution: no finished execution for workflow ${workflowId} within ${timeoutMs}ms`,
			);
		}
		if (settledStatus !== 'success') {
			throw new Error(
				`readExecution: execution ${settledId} for workflow ${workflowId} finished with status "${settledStatus}"`,
			);
		}

		const detailRes = await this.fetch(`rest/executions/${settledId}`);
		const { body: detailBody, text: detailText } = await parseJsonBody(detailRes);
		if (!detailRes.ok()) {
			throw new Error(
				`GET rest/executions/${settledId} failed (${detailRes.status()}): ${detailText.slice(0, 400)}`,
			);
		}

		const detail = unwrapData(detailBody);
		const finished = Boolean(detail.finished);
		const status = typeof detail.status === 'string' ? detail.status : '';
		if (!finished || status !== 'success') {
			throw new Error(
				`readExecution: execution ${settledId} is not a finished success (finished=${String(finished)}, status=${status})`,
			);
		}

		const parsedData: unknown =
			typeof detail.data === 'string' ? flatted.parse(detail.data) : detail.data;
		const resultData =
			isRecord(parsedData) && isRecord(parsedData.resultData) ? parsedData.resultData : null;
		const runData = resultData && isRecord(resultData.runData) ? resultData.runData : null;
		if (!runData || Object.keys(runData).length === 0) {
			throw new Error(`readExecution: execution ${settledId} has no runData`);
		}

		return {
			executionId: settledId,
			status,
			finished,
			runData,
		};
	}

	/** Write binary data in one node and read it in a later node. */
	async roundTripBinary(): Promise<BinaryRoundTripResult> {
		const token = nanoid(10);
		const payload = `binary-probe-${token}`;
		const expectedExtracted = `${payload}:written`;
		const webhookId = nanoid(12);
		const webhookPath = `probe-binary-${nanoid(8).toLowerCase()}`;

		const { id: workflowId, versionId } = await this.createWorkflow({
			name: `Deployment Probe Binary (${token})`,
			active: false,
			nodes: [
				{
					id: 'webhook',
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					typeVersion: 2,
					position: [0, 0],
					webhookId,
					parameters: {
						httpMethod: 'POST',
						path: webhookPath,
						responseMode: 'lastNode',
						responseData: 'firstEntryJson',
						options: { binaryData: true },
					},
				},
				{
					id: 'extract-upload',
					name: 'Extract Uploaded',
					type: 'n8n-nodes-base.extractFromFile',
					typeVersion: 1.1,
					position: [220, 0],
					parameters: {
						operation: 'text',
						binaryPropertyName: 'data',
						destinationKey: 'uploaded',
						options: {},
					},
				},
				{
					id: 'set',
					name: 'Transform',
					type: 'n8n-nodes-base.set',
					typeVersion: 3.4,
					position: [440, 0],
					parameters: {
						assignments: {
							assignments: [
								{
									id: 'text',
									name: 'text',
									value: "={{ $json.uploaded + ':written' }}",
									type: 'string',
								},
							],
						},
						options: {},
					},
				},
				{
					id: 'convert',
					name: 'Convert to File',
					type: 'n8n-nodes-base.convertToFile',
					typeVersion: 1.1,
					position: [660, 0],
					parameters: {
						operation: 'toText',
						sourceProperty: 'text',
						binaryPropertyName: 'written',
						options: { fileName: 'probe.txt' },
					},
				},
				{
					id: 'extract-written',
					name: 'Extract Written',
					type: 'n8n-nodes-base.extractFromFile',
					typeVersion: 1.1,
					position: [880, 0],
					parameters: {
						operation: 'text',
						binaryPropertyName: 'written',
						destinationKey: 'extracted',
						options: {},
					},
				},
			],
			connections: {
				Webhook: { main: [[{ node: 'Extract Uploaded', type: 'main', index: 0 }]] },
				'Extract Uploaded': { main: [[{ node: 'Transform', type: 'main', index: 0 }]] },
				Transform: { main: [[{ node: 'Convert to File', type: 'main', index: 0 }]] },
				'Convert to File': { main: [[{ node: 'Extract Written', type: 'main', index: 0 }]] },
			},
			settings: { executionOrder: 'v1' },
		});

		await this.activateWorkflow(workflowId, versionId);

		const response = await this.triggerWebhook(webhookPath, {
			method: 'POST',
			headers: { 'content-type': 'application/octet-stream' },
			data: Buffer.from(payload),
		});
		const { body, text } = await parseJsonBody(response);
		if (!response.ok()) {
			throw new Error(`Binary probe webhook failed (${response.status()}): ${text.slice(0, 400)}`);
		}
		if (!isRecord(body) || body.extracted !== expectedExtracted) {
			throw new Error(
				`Binary round-trip mismatch. Expected extracted="${expectedExtracted}", got: ${text.slice(0, 400)}`,
			);
		}

		return {
			workflowId,
			webhookPath,
			payload,
			extracted: expectedExtracted,
		};
	}
}

export function inspectContainerImage(containerId: string): ContainerImageInfo {
	const rawContainer = execFileSync('docker', ['inspect', containerId], { encoding: 'utf8' });
	const containerList: unknown = JSON.parse(rawContainer);
	const containerEntry = Array.isArray(containerList) ? containerList[0] : null;
	if (!isRecord(containerEntry)) {
		throw new Error(`docker inspect returned no container entry for ${containerId}`);
	}

	const config = isRecord(containerEntry.Config) ? containerEntry.Config : {};
	const containerImage = typeof config.Image === 'string' ? config.Image : '';
	const imageId = typeof containerEntry.Image === 'string' ? containerEntry.Image : '';
	const user = typeof config.User === 'string' ? config.User : '';
	const labels: Record<string, string> = {};
	if (isRecord(config.Labels)) {
		for (const [key, value] of Object.entries(config.Labels)) {
			if (typeof value === 'string') labels[key] = value;
		}
	}

	const rawImage = execFileSync('docker', ['image', 'inspect', imageId], { encoding: 'utf8' });
	const imageList: unknown = JSON.parse(rawImage);
	const imageEntry = Array.isArray(imageList) ? imageList[0] : null;
	const repoDigests =
		isRecord(imageEntry) && Array.isArray(imageEntry.RepoDigests)
			? imageEntry.RepoDigests.filter((entry): entry is string => typeof entry === 'string')
			: [];
	const repoTags =
		isRecord(imageEntry) && Array.isArray(imageEntry.RepoTags)
			? imageEntry.RepoTags.filter((entry): entry is string => typeof entry === 'string')
			: [];

	return { containerImage, imageId, user, labels, repoDigests, repoTags };
}

export function assertContainerImage(
	containerId: string,
	expectedImage: string,
	role: string,
): ContainerImageInfo {
	const info = inspectContainerImage(containerId);
	expect(info.containerImage, `Expected ${role} container to boot image "${expectedImage}"`).toBe(
		expectedImage,
	);

	if (expectedImage.includes('@sha256:')) {
		expect(
			info.repoDigests,
			`Expected ${role} image digests to include pinned ref "${expectedImage}"`,
		).toContain(expectedImage);
	}

	return info;
}

export function assertDistrolessRunner(stack: N8NStack): ContainerImageInfo {
	const runner = stack.serviceResults.taskRunner?.container;
	expect(runner, 'Expected an external task-runner container in the stack').toBeDefined();

	const expectedImage = TEST_CONTAINER_IMAGES.taskRunner;
	const info = assertContainerImage(runner!.getId(), expectedImage, 'task-runner');

	expect(
		info.labels['org.opencontainers.image.title'],
		`Expected distroless runner image label "${DISTROLESS_RUNNER_TITLE}", got "${info.labels['org.opencontainers.image.title'] ?? ''}" (image: ${info.containerImage})`,
	).toBe(DISTROLESS_RUNNER_TITLE);

	expect(
		info.user,
		`Expected distroless runner nonroot user "${DISTROLESS_RUNNER_USER}", got "${info.user}"`,
	).toBe(DISTROLESS_RUNNER_USER);

	return info;
}

export function assertN8nImage(
	stack: N8NStack,
	expectedImage = TEST_CONTAINER_IMAGES.n8n,
): ContainerImageInfo {
	const n8n = stack.findContainers(/-n8n(-main-1)?$/)[0];
	expect(n8n, 'Expected a main n8n container in the stack').toBeDefined();
	return assertContainerImage(n8n.getId(), expectedImage, 'n8n');
}

export async function assertPointerCompression(
	stack: N8NStack,
	expectedImage = TEST_CONTAINER_IMAGES.n8n,
): Promise<void> {
	const n8n = stack.findContainers(/-n8n(-main-1)?$/)[0];
	expect(n8n, 'Expected a main n8n container in the stack').toBeDefined();

	assertContainerImage(n8n.getId(), expectedImage, 'n8n');

	const result = await n8n.exec([
		'node',
		'-e',
		'process.stdout.write(String(Boolean(process.config.variables.v8_enable_pointer_compression)))',
	]);
	expect(result.exitCode, `Node pointer-compression check failed: ${result.output}`).toBe(0);
	expect(
		result.output.trim(),
		`Expected ${expectedImage} to run with V8 pointer compression enabled`,
	).toBe('true');
}

async function readContainerLogs(container: N8NStack['containers'][number]): Promise<string> {
	try {
		const stream = await container.logs();
		const chunks: Buffer[] = [];
		await new Promise<void>((resolve) => {
			const timer = setTimeout(() => {
				stream.destroy();
				resolve();
			}, 1500);
			stream.on('data', (chunk: Buffer | string) => {
				chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
			});
			stream.on('end', () => {
				clearTimeout(timer);
				resolve();
			});
			stream.on('error', () => {
				clearTimeout(timer);
				resolve();
			});
		});
		return Buffer.concat(chunks).toString('utf8');
	} catch {
		return '';
	}
}

async function attachFailureLogs(stack: N8NStack | undefined, error: unknown): Promise<void> {
	const testInfo = test.info();

	if (error instanceof N8NStartupError) {
		for (const [name, logs] of Object.entries(error.diagnostics.logs)) {
			if (!logs) continue;
			await testInfo.attach(`${name}-startup.log`, {
				body: logs,
				contentType: 'text/plain',
			});
		}
	}

	if (!stack) return;

	for (const container of stack.containers) {
		const logs = await readContainerLogs(container);
		if (!logs) continue;
		const cleanName = container.getName().replace(/^\//, '');
		await testInfo.attach(`${cleanName}.log`, {
			body: logs,
			contentType: 'text/plain',
		});
	}
}

/**
 * Runs one deployment compatibility cell with the shared Naming Contract:
 * annotations (`channel`, `arch`, `n8n-image`, `runners-image`, `n8n-version`),
 * four standard `test.step` blocks (`Start stack`, `Sign in`, `Run probe`,
 * `Check setting`), failure log attachments, and guaranteed stack teardown.
 */
export async function runDeploymentCell<TProbeOutput = unknown>(
	options: DeploymentCellOptions<TProbeOutput>,
): Promise<void> {
	const testInfo = test.info();
	const channel = process.env.DEPLOYMENT_CHANNEL ?? 'local';
	const arch = process.env.DEPLOYMENT_ARCH ?? normalizeArch(process.arch);
	const n8nImage = options.stack?.image ?? TEST_CONTAINER_IMAGES.n8n;
	const runnersImage =
		options.stack?.env?.N8N_RUNNERS_MODE === 'internal'
			? 'internal'
			: TEST_CONTAINER_IMAGES.taskRunner;

	testInfo.annotations.push(
		{ type: 'channel', description: channel },
		{ type: 'arch', description: arch },
		{ type: 'n8n-image', description: n8nImage },
		{ type: 'runners-image', description: runnersImage },
	);

	let stack: N8NStack | undefined;
	let probe: DeploymentProbe | undefined;

	try {
		await test.step('Start stack', async () => {
			stack = await createN8NStack(options.stack);
			probe = await DeploymentProbe.create(resolveReachableBaseUrl(stack));
		});

		if (!stack || !probe) {
			throw new Error('Deployment cell stack failed to initialize');
		}
		const activeStack = stack;
		const activeProbe = probe;

		let version = 'unknown';
		await test.step('Sign in', async () => {
			const signInResult = await activeProbe.signIn();
			version = signInResult.version;
			testInfo.annotations.push({ type: 'n8n-version', description: version });
		});

		const ctx: DeploymentCellContext = { stack: activeStack, probe: activeProbe, version };
		let probeOutput!: TProbeOutput;
		await test.step('Run probe', async () => {
			probeOutput = await options.probe(ctx);
		});

		await test.step('Check setting', async () => {
			await options.check({ ...ctx, probeOutput });
		});
	} catch (error) {
		await attachFailureLogs(stack, error);
		throw error;
	} finally {
		await probe?.dispose().catch(() => undefined);
		await stack?.stop().catch(() => undefined);
	}
}
