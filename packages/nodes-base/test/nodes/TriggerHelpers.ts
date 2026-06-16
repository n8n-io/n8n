import type { SsrfBridge } from '@n8n/backend-network';
import type * as express from 'express';
import { type IncomingHttpHeaders } from 'http';
import get from 'lodash/get';
import merge from 'lodash/merge';
import set from 'lodash/set';
import { PollContext, returnJsonArray } from 'n8n-core';
import type { InstanceSettings, ExecutionLifecycleHooks } from 'n8n-core';
import { ScheduledTaskManager } from 'n8n-core/dist/execution-engine/scheduled-task-manager';
import {
	createDeferredPromise,
	type IBinaryData,
	type ICredentialDataDecryptedObject,
	type IDataObject,
	type IHttpRequestOptions,
	type INode,
	type INodeType,
	type INodeTypes,
	type ITriggerFunctions,
	type IWebhookFunctions,
	type IWorkflowExecuteAdditionalData,
	type Logger,
	type NodeTypeAndVersion,
	type VersionedNodeType,
	type Workflow,
	type CronContext,
	type Cron,
} from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';

const logger = mock({
	scoped: vi.fn().mockReturnValue(
		mock({
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		}),
	),
});

type MockDeepPartial<T> = Parameters<typeof mock<T>>[0];

type TestTriggerNodeOptions = {
	mode?: 'manual' | 'trigger';
	node?: MockDeepPartial<INode>;
	timezone?: string;
	workflowStaticData?: IDataObject;
	credential?: ICredentialDataDecryptedObject;
	credentials?: Record<string, ICredentialDataDecryptedObject>;
	helpers?: Partial<ITriggerFunctions['helpers']>;
	workflow?: { id?: string; name?: string; active?: boolean };
};

type TestWebhookTriggerNodeOptions = TestTriggerNodeOptions & {
	webhookName?: string;
	request?: MockDeepPartial<express.Request>;
	bodyData?: IDataObject;
	childNodes?: NodeTypeAndVersion[];
	workflow?: Workflow;
	headerData?: IncomingHttpHeaders;
};

type TestPollingTriggerNodeOptions = TestTriggerNodeOptions & {};

function getNodeVersion(Trigger: new () => VersionedNodeType, version?: number) {
	const instance = new Trigger();
	return instance.nodeVersions[version ?? instance.currentVersion];
}

export async function testTriggerNode(
	Trigger: (new () => INodeType) | INodeType,
	options: TestTriggerNodeOptions = {},
) {
	const trigger = 'description' in Trigger ? Trigger : new Trigger();
	const emit: MockedFunction<ITriggerFunctions['emit']> = vi.fn();

	const timezone = options.timezone ?? 'Europe/Berlin';
	const version = trigger.description.version;
	const node = merge(
		{
			type: trigger.description.name,
			name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
			typeVersion: typeof version === 'number' ? version : version.at(-1),
		} satisfies Partial<INode>,
		options.node,
	) as INode;
	const workflow = mock<Workflow>({ timezone: options.timezone ?? 'Europe/Berlin' });

	const scheduledTaskManager = new ScheduledTaskManager(
		mock<InstanceSettings>(),
		logger as any,
		mock(),
		mock(),
	);
	const helpers = mock<ITriggerFunctions['helpers']>({
		createDeferredPromise,
		returnJsonArray,
		registerCron: (cron: Cron, onTick) => {
			const ctx: CronContext = {
				expression: cron.expression,
				recurrence: cron.recurrence,
				nodeId: node.id,
				workflowId: workflow.id,
				timezone: workflow.timezone,
			};
			scheduledTaskManager.registerCron(ctx, onTick);
		},
	});

	const workflowMetadata = {
		id: options.workflow?.id,
		name: options.workflow?.name,
		active: options.workflow?.active ?? false,
	};
	const triggerLogger = mock<Logger>({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	});
	const triggerFunctions = mock<ITriggerFunctions>({
		helpers,
		emit,
		logger: triggerLogger,
		getTimezone: () => timezone,
		getNode: () => node,
		getWorkflow: () => workflowMetadata,
		getCredentials: async <T extends object = ICredentialDataDecryptedObject>(type: string) =>
			(options.credentials?.[type] ?? options.credential ?? {}) as T,
		getMode: () => options.mode ?? 'trigger',
		getWorkflowStaticData: () => options.workflowStaticData ?? {},
		getWorkflowSettings: () => ({}),
		getNodeParameter: (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback,
	});

	const response = await trigger.trigger?.call(triggerFunctions);

	if (options.mode === 'manual') {
		expect(response?.manualTriggerFunction).toBeInstanceOf(Function);
	}

	return {
		close: vi.fn(response?.closeFunction),
		manualTriggerFunction: options.mode === 'manual' ? response?.manualTriggerFunction : undefined,
		emit,
		logger: triggerLogger,
	};
}

export async function testVersionedWebhookTriggerNode(
	Trigger: new () => VersionedNodeType,
	version?: number,
	options: TestWebhookTriggerNodeOptions = {},
) {
	return await testWebhookTriggerNode(getNodeVersion(Trigger, version), options);
}

export async function testWebhookTriggerNode(
	Trigger: (new () => INodeType) | INodeType,
	options: TestWebhookTriggerNodeOptions = {},
) {
	const trigger = 'description' in Trigger ? Trigger : new Trigger();

	const timezone = options.timezone ?? 'Europe/Berlin';
	const version = trigger.description.version;
	const node = merge(
		{
			id: options.node?.id ?? '1',
			type: trigger.description.name,
			name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
			typeVersion: typeof version === 'number' ? version : version.at(-1),
		} satisfies Partial<INode>,
		options.node,
	) as INode;
	const workflow = mock<Workflow>({ timezone: options.timezone ?? 'Europe/Berlin' });

	const scheduledTaskManager = new ScheduledTaskManager(
		mock<InstanceSettings>(),
		logger as any,
		mock(),
		mock(),
	);
	const helpers = mock<ITriggerFunctions['helpers']>({
		returnJsonArray,
		registerCron: (cron: Cron, onTick) => {
			const ctx: CronContext = {
				expression: cron.expression,
				recurrence: cron.recurrence,
				nodeId: node.id,
				workflowId: workflow.id,
				timezone: workflow.timezone,
			};
			scheduledTaskManager.registerCron(ctx, onTick);
		},
		prepareBinaryData: options.helpers?.prepareBinaryData ?? vi.fn(),
	});

	const request = mock<express.Request>({
		method: 'GET',
		...options.request,
	});
	const response = mock<express.Response>({ status: vi.fn(() => mock<express.Response>()) });
	const webhookFunctions = mock<IWebhookFunctions>({
		helpers,
		nodeHelpers: {
			copyBinaryFile: vi.fn(async () => mock<IBinaryData>()),
		},
		getTimezone: () => timezone,
		getNode: () => node,
		getMode: () => options.mode ?? 'trigger',
		getInstanceId: () => 'instanceId',
		getBodyData: () => options.bodyData ?? {},
		getHeaderData: () => options.headerData ?? request.headers ?? {},
		getInputConnectionData: async () => ({}),
		getNodeWebhookUrl: (name) => `/test-webhook-url/${name}`,
		getParamsData: () => ({}),
		getQueryData: () => ({}),
		getRequestObject: () => request,
		getResponseObject: () => response,
		getWorkflow: () => options.workflow ?? mock<Workflow>(),
		getWebhookName: () => options.webhookName ?? 'default',
		getWorkflowStaticData: () => options.workflowStaticData ?? {},
		getWorkflowSettings: () => ({}),
		getNodeParameter: (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback,
		getChildNodes: () => options.childNodes ?? [],
		getCredentials: async <T extends object = ICredentialDataDecryptedObject>(type: string) =>
			(options.credentials?.[type] ?? options.credential ?? {}) as T,
	});

	const responseData = await trigger.webhook?.call(webhookFunctions);

	return {
		responseData,
		response: webhookFunctions.getResponseObject(),
	};
}

export async function testPollingTriggerNode(
	Trigger: (new () => INodeType) | INodeType,
	options: TestPollingTriggerNodeOptions = {},
) {
	const trigger = 'description' in Trigger ? Trigger : new Trigger();

	const timezone = options.timezone ?? 'Europe/Berlin';
	const version = trigger.description.version;
	const node = merge(
		{
			type: trigger.description.name,
			name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
			typeVersion: typeof version === 'number' ? version : version.at(-1),
			credentials: {},
		} satisfies Partial<INode>,
		options.node,
	) as INode;
	const workflow = mock<Workflow>({
		timezone,
		nodeTypes: mock<INodeTypes>({
			getByNameAndVersion: () => {
				const nodeType = mock<INodeType>();
				nodeType.description = trigger.description;
				return nodeType;
			},
		}),
		getStaticData: () => options.workflowStaticData ?? {},
	});
	const mode = options.mode ?? 'trigger';

	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		currentNodeParameters: node.parameters,
		credentialsHelper: mock<IWorkflowExecuteAdditionalData['credentialsHelper']>({
			getParentTypes: () => [],
			authenticate: async (_creds, _type, options) => {
				set(options, 'headers.authorization', 'mockAuth');
				return options as IHttpRequestOptions;
			},
		}),
		hooks: mock<ExecutionLifecycleHooks>(),
		ssrfBridge: {
			validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
			validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
			validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
			validateRedirectSync: vi.fn(),
			createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
		} as SsrfBridge,
	});
	// Prevent the auto-mocked property from being truthy so request helpers
	// don't take the eval-mock code path.
	(additionalData as unknown as Record<string, unknown>).evalLlmMockHandler = undefined;

	const pollContext = new PollContext(workflow, node, additionalData, mode, 'init');

	pollContext.getNode = () => node;
	pollContext.getCredentials = async <T extends object = ICredentialDataDecryptedObject>() =>
		(options.credential ?? {}) as T;
	pollContext.getNodeParameter = (parameterName, fallback) =>
		get(node.parameters, parameterName) ?? fallback;

	// Override OAuth helpers so tests don't flow through the real OAuth2
	// signing/token logic (which is fragile with mocked credentials).
	const originalRequest = pollContext.helpers.request.bind(pollContext.helpers);
	pollContext.helpers.requestOAuth2 = async function (_credentialsType, requestOptions) {
		set(requestOptions, 'headers.authorization', 'mockAuth');
		return await originalRequest(requestOptions);
	};
	pollContext.helpers.requestOAuth1 = async function (_credentialsType, requestOptions) {
		set(requestOptions, 'headers.authorization', 'mockAuth');
		return await originalRequest(requestOptions);
	};

	const response = await trigger.poll?.call(pollContext);

	return {
		response,
	};
}
