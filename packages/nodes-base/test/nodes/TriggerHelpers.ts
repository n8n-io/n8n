import type * as express from 'express';
import { mock } from 'jest-mock-extended';
import get from 'lodash/get';
import merge from 'lodash/merge';
import { returnJsonArray, type InstanceSettings } from 'n8n-core';
import { ScheduledTaskManager } from 'n8n-core/dist/ScheduledTaskManager';
import type {
	IBinaryData,
	IDataObject,
	INode,
	INodeType,
	ITriggerFunctions,
	IWebhookFunctions,
	NodeTypeAndVersion,
	VersionedNodeType,
	Workflow,
} from 'n8n-workflow';

type MockDeepPartial<T> = Parameters<typeof mock<T>>[0];

type TestTriggerNodeOptions = {
	mode?: 'manual' | 'trigger';
	node?: MockDeepPartial<INode>;
	timezone?: string;
	workflowStaticData?: IDataObject;
};

type TestWebhookTriggerNodeOptions = TestTriggerNodeOptions & {
	mode?: 'manual' | 'trigger';
	webhookName?: string;
	request?: MockDeepPartial<express.Request>;
	bodyData?: IDataObject;
	childNodes?: NodeTypeAndVersion[];
};

export async function testVersionedTriggerNode(
	Trigger: new () => VersionedNodeType,
	version?: number,
	options: TestTriggerNodeOptions = {},
) {
	const instance = new Trigger();
	return await testTriggerNode(instance.nodeVersions[version ?? instance.currentVersion], options);
}

export async function testTriggerNode(
	Trigger: (new () => INodeType) | INodeType,
	options: TestTriggerNodeOptions = {},
) {
	const trigger = 'description' in Trigger ? Trigger : new Trigger();
	const emit: jest.MockedFunction<ITriggerFunctions['emit']> = jest.fn();

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

	const scheduledTaskManager = new ScheduledTaskManager(mock<InstanceSettings>());
	const helpers = mock<ITriggerFunctions['helpers']>({
		returnJsonArray,
		registerCron: (cronExpression, onTick) =>
			scheduledTaskManager.registerCron(workflow, cronExpression, onTick),
	});

	const triggerFunctions = mock<ITriggerFunctions>({
		helpers,
		emit,
		getTimezone: () => timezone,
		getNode: () => node,
		getMode: () => options.mode ?? 'trigger',
		getWorkflowStaticData: () => options.workflowStaticData ?? {},
		getNodeParameter: (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback,
	});

	const response = await trigger.trigger?.call(triggerFunctions);

	if (options.mode === 'manual') {
		expect(response?.manualTriggerFunction).toBeInstanceOf(Function);
		await response?.manualTriggerFunction?.();
	} else {
		expect(response?.manualTriggerFunction).toBeUndefined();
	}

	return {
		close: jest.fn(response?.closeFunction),
		emit,
	};
}

export async function testVersionedWebhookTriggerNode(
	Trigger: new () => VersionedNodeType,
	version?: number,
	options: TestWebhookTriggerNodeOptions = {},
) {
	const instance = new Trigger();
	return await testWebhookTriggerNode(
		instance.nodeVersions[version ?? instance.currentVersion],
		options,
	);
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
			type: trigger.description.name,
			name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
			typeVersion: typeof version === 'number' ? version : version.at(-1),
		} satisfies Partial<INode>,
		options.node,
	) as INode;
	const workflow = mock<Workflow>({ timezone: options.timezone ?? 'Europe/Berlin' });

	const scheduledTaskManager = new ScheduledTaskManager(mock<InstanceSettings>());
	const helpers = mock<ITriggerFunctions['helpers']>({
		returnJsonArray,
		registerCron: (cronExpression, onTick) =>
			scheduledTaskManager.registerCron(workflow, cronExpression, onTick),
	});

	const request = mock<express.Request>({
		method: 'GET',
		...options.request,
	});
	const response = mock<express.Response>({ status: jest.fn(() => mock<express.Response>()) });
	const webhookFunctions = mock<IWebhookFunctions>({
		helpers,
		nodeHelpers: {
			copyBinaryFile: jest.fn(async () => mock<IBinaryData>()),
		},
		getTimezone: () => timezone,
		getNode: () => node,
		getMode: () => options.mode ?? 'trigger',
		getInstanceId: () => 'instanceId',
		getBodyData: () => options.bodyData ?? {},
		getHeaderData: () => ({}),
		getInputConnectionData: async () => ({}),
		getNodeWebhookUrl: (name) => `/test-webhook-url/${name}`,
		getParamsData: () => ({}),
		getQueryData: () => ({}),
		getRequestObject: () => request,
		getResponseObject: () => response,
		getWebhookName: () => options.webhookName ?? 'default',
		getWorkflowStaticData: () => options.workflowStaticData ?? {},
		getNodeParameter: (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback,
		getChildNodes: () => options.childNodes ?? [],
	});

	const responseData = await trigger.webhook?.call(webhookFunctions);

	return {
		responseData,
		response: webhookFunctions.getResponseObject(),
	};
}
