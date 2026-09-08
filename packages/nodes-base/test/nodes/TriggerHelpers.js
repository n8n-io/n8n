import { passthroughEgressFilter } from '@n8n/backend-network';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import get from 'lodash/get';
import merge from 'lodash/merge';
import set from 'lodash/set';
import { PollContext, returnJsonArray, ScheduledTaskManager } from 'n8n-core';
import { mock } from 'vitest-mock-extended';
const schedulerScopedLogger = mock({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
});
const schedulerLogger = mock({
    scoped: vi.fn().mockReturnValue(schedulerScopedLogger),
});
function getNodeVersion(Trigger, version) {
    const instance = new Trigger();
    return instance.nodeVersions[version ?? instance.currentVersion];
}
export async function testTriggerNode(Trigger, options = {}) {
    const trigger = 'description' in Trigger ? Trigger : new Trigger();
    const emit = vi.fn();
    const emitError = vi.fn();
    const timezone = options.timezone ?? 'Europe/Berlin';
    const version = trigger.description.version;
    const node = merge({
        id: options.node?.id ?? '1',
        type: trigger.description.name,
        name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
        typeVersion: typeof version === 'number' ? version : version.at(-1),
    }, options.node);
    const workflow = mock({
        id: options.workflow?.id ?? 'workflow-1',
        timezone: options.timezone ?? 'Europe/Berlin',
    });
    const scheduledTaskManager = new ScheduledTaskManager(mock({ isLeader: true }), schedulerLogger, mock());
    const helpers = mock({
        createDeferredPromise,
        returnJsonArray,
        getSecureEgressFilter: () => passthroughEgressFilter,
        registerCron: (cron, onTick) => {
            const ctx = {
                expression: cron.expression,
                recurrence: cron.recurrence,
                nodeId: node.id,
                workflowId: workflow.id,
                timezone: workflow.timezone,
            };
            scheduledTaskManager.register({
                group: { type: 'workflow', id: ctx.workflowId },
                targetId: ctx.nodeId,
                timezone: ctx.timezone,
                expression: ctx.expression,
                recurrence: ctx.recurrence,
            }, onTick);
        },
    });
    const workflowMetadata = {
        id: options.workflow?.id,
        name: options.workflow?.name,
        active: options.workflow?.active ?? false,
    };
    const triggerLogger = mock({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    });
    const triggerFunctions = mock({
        helpers,
        emit,
        emitError,
        logger: triggerLogger,
        getTimezone: () => timezone,
        getNode: () => node,
        getWorkflow: () => workflowMetadata,
        getCredentials: async (type) => (options.credentials?.[type] ?? options.credential ?? {}),
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
        emitError,
        logger: triggerLogger,
    };
}
export async function testVersionedWebhookTriggerNode(Trigger, version, options = {}) {
    return await testWebhookTriggerNode(getNodeVersion(Trigger, version), options);
}
export async function testWebhookTriggerNode(Trigger, options = {}) {
    const trigger = 'description' in Trigger ? Trigger : new Trigger();
    const timezone = options.timezone ?? 'Europe/Berlin';
    const version = trigger.description.version;
    const node = merge({
        id: options.node?.id ?? '1',
        type: trigger.description.name,
        name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
        typeVersion: typeof version === 'number' ? version : version.at(-1),
    }, options.node);
    const workflow = options.workflow ??
        mock({
            id: 'workflow-1',
            timezone: options.timezone ?? 'Europe/Berlin',
        });
    const scheduledTaskManager = new ScheduledTaskManager(mock({ isLeader: true }), schedulerLogger, mock());
    const helpers = mock({
        returnJsonArray,
        getSecureEgressFilter: () => passthroughEgressFilter,
        registerCron: (cron, onTick) => {
            const ctx = {
                expression: cron.expression,
                recurrence: cron.recurrence,
                nodeId: node.id,
                workflowId: workflow.id,
                timezone: workflow.timezone,
            };
            scheduledTaskManager.register({
                group: { type: 'workflow', id: ctx.workflowId },
                targetId: ctx.nodeId,
                timezone: ctx.timezone,
                expression: ctx.expression,
                recurrence: ctx.recurrence,
            }, onTick);
        },
        prepareBinaryData: options.helpers?.prepareBinaryData ?? vi.fn(),
    });
    const request = mock({
        method: 'GET',
        ...options.request,
    });
    const response = mock({ status: vi.fn(() => mock()) });
    const webhookFunctions = mock({
        helpers,
        nodeHelpers: {
            copyBinaryFile: vi.fn(async () => mock()),
        },
        getTimezone: () => timezone,
        getNode: () => node,
        getMode: () => options.mode ?? 'trigger',
        getInstanceId: () => 'instanceId',
        getBodyData: () => options.bodyData ?? {},
        getHeaderData: () => options.headerData ?? request.headers ?? {},
        getInputConnectionData: async () => ({}),
        getNodeWebhookUrl: (name) => `/test-webhook-url/${name}`,
        getWebhookResourceUrl: (name) => `/test-webhook-url/${name}`,
        getParamsData: () => ({}),
        getQueryData: () => ({}),
        getRequestObject: () => request,
        getResponseObject: () => response,
        getWorkflow: () => options.workflow ?? mock(),
        getWebhookName: () => options.webhookName ?? 'default',
        getWorkflowStaticData: () => options.workflowStaticData ?? {},
        getWorkflowSettings: () => ({}),
        getNodeParameter: (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback,
        getChildNodes: () => options.childNodes ?? [],
        getCredentials: async (type) => (options.credentials?.[type] ?? options.credential ?? {}),
    });
    const responseData = await trigger.webhook?.call(webhookFunctions);
    return {
        responseData,
        response: webhookFunctions.getResponseObject(),
    };
}
export async function testPollingTriggerNode(Trigger, options = {}) {
    const trigger = 'description' in Trigger ? Trigger : new Trigger();
    const timezone = options.timezone ?? 'Europe/Berlin';
    const version = trigger.description.version;
    const node = merge({
        type: trigger.description.name,
        name: trigger.description.defaults.name ?? `Test Node (${trigger.description.name})`,
        typeVersion: typeof version === 'number' ? version : version.at(-1),
        credentials: {},
    }, options.node);
    const workflow = mock({
        timezone,
        nodeTypes: mock({
            getByNameAndVersion: () => {
                const nodeType = mock();
                nodeType.description = trigger.description;
                return nodeType;
            },
        }),
        getStaticData: () => options.workflowStaticData ?? {},
    });
    const mode = options.mode ?? 'trigger';
    const additionalData = mock({
        currentNodeParameters: node.parameters,
        credentialsHelper: mock({
            getParentTypes: () => [],
            authenticate: async (_creds, _type, options) => {
                set(options, 'headers.authorization', 'mockAuth');
                return options;
            },
        }),
        hooks: mock(),
        ssrfBridge: {
            validateIp: vi.fn().mockReturnValue({ ok: true, result: undefined }),
            validateUrl: vi.fn().mockResolvedValue({ ok: true, result: undefined }),
            validateConnectionHost: vi.fn().mockReturnValue({ ok: true, result: undefined }),
            validateRedirectSync: vi.fn(),
            createSecureLookup: vi.fn().mockReturnValue(vi.fn()),
        },
    });
    // Prevent the auto-mocked property from being truthy so request helpers
    // don't take the eval-mock code path.
    additionalData.evalLlmMockHandler = undefined;
    const { pollBudgetMs } = options;
    // Each undefined keeps a PollContext default: __emit, __emitError,
    // __commitCursor, __runPoll, resolveNodeStaticData. The poll-budget getter is
    // the only constructor argument this helper sets.
    const pollContext = new PollContext(workflow, node, additionalData, mode, 'init', undefined, undefined, undefined, undefined, undefined, pollBudgetMs === undefined ? undefined : () => pollBudgetMs);
    pollContext.getNode = () => node;
    pollContext.getCredentials = async () => (options.credential ?? {});
    pollContext.getNodeParameter = (parameterName, fallback) => get(node.parameters, parameterName) ?? fallback;
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
//# sourceMappingURL=TriggerHelpers.js.map