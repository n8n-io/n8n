import type * as express from 'express';
import { type IncomingHttpHeaders } from 'http';
import { type ICredentialDataDecryptedObject, type IDataObject, type INode, type INodeType, type ITriggerFunctions, type Logger as WorkflowLogger, type NodeTypeAndVersion, type VersionedNodeType, type Workflow } from 'n8n-workflow';
import type { MockedFunction } from 'vitest';
import { mock } from 'vitest-mock-extended';
type MockDeepPartial<T> = Parameters<typeof mock<T>>[0];
type TestTriggerNodeOptions = {
    mode?: 'manual' | 'trigger';
    node?: MockDeepPartial<INode>;
    timezone?: string;
    workflowStaticData?: IDataObject;
    credential?: ICredentialDataDecryptedObject;
    credentials?: Record<string, ICredentialDataDecryptedObject>;
    helpers?: Partial<ITriggerFunctions['helpers']>;
    workflow?: {
        id?: string;
        name?: string;
        active?: boolean;
    };
};
type TestWebhookTriggerNodeOptions = TestTriggerNodeOptions & {
    webhookName?: string;
    request?: MockDeepPartial<express.Request>;
    bodyData?: IDataObject;
    childNodes?: NodeTypeAndVersion[];
    workflow?: Workflow;
    headerData?: IncomingHttpHeaders;
};
type TestPollingTriggerNodeOptions = TestTriggerNodeOptions & {
    /** Overrides the poll time budget the context reports (default: 5 minutes). */
    pollBudgetMs?: number;
};
export declare function testTriggerNode(Trigger: (new () => INodeType) | INodeType, options?: TestTriggerNodeOptions): Promise<{
    close: import("vitest").Mock<import("n8n-workflow").CloseFunction>;
    manualTriggerFunction: (() => Promise<void>) | undefined;
    emit: MockedFunction<(data: import("n8n-workflow").INodeExecutionData[][], responsePromise?: import("@n8n/utils/promise/deferred-promise").IDeferredPromise<import("n8n-workflow").IExecuteResponsePromiseData>, donePromise?: import("@n8n/utils/promise/deferred-promise").IDeferredPromise<import("n8n-workflow").IRun>, deduplicationKey?: string) => void>;
    emitError: MockedFunction<(error: Error, responsePromise?: import("@n8n/utils/promise/deferred-promise").IDeferredPromise<import("n8n-workflow").IExecuteResponsePromiseData>) => void>;
    logger: {
        debug: ((message: string, metadata?: import("n8n-workflow").LogMetadata) => void) & import("vitest-mock-extended").CalledWithMock<void, [message: string, metadata?: import("n8n-workflow").LogMetadata | undefined]>;
        error: ((message: string, metadata?: import("n8n-workflow").LogMetadata) => void) & import("vitest-mock-extended").CalledWithMock<void, [message: string, metadata?: import("n8n-workflow").LogMetadata | undefined]>;
        info: ((message: string, metadata?: import("n8n-workflow").LogMetadata) => void) & import("vitest-mock-extended").CalledWithMock<void, [message: string, metadata?: import("n8n-workflow").LogMetadata | undefined]>;
        warn: ((message: string, metadata?: import("n8n-workflow").LogMetadata) => void) & import("vitest-mock-extended").CalledWithMock<void, [message: string, metadata?: import("n8n-workflow").LogMetadata | undefined]>;
    } & WorkflowLogger;
}>;
export declare function testVersionedWebhookTriggerNode(Trigger: new () => VersionedNodeType, version?: number, options?: TestWebhookTriggerNodeOptions): Promise<{
    responseData: import("n8n-workflow").IWebhookResponseData | undefined;
    response: express.Response<any, Record<string, any>>;
}>;
export declare function testWebhookTriggerNode(Trigger: (new () => INodeType) | INodeType, options?: TestWebhookTriggerNodeOptions): Promise<{
    responseData: import("n8n-workflow").IWebhookResponseData | undefined;
    response: express.Response<any, Record<string, any>>;
}>;
export declare function testPollingTriggerNode(Trigger: (new () => INodeType) | INodeType, options?: TestPollingTriggerNodeOptions): Promise<{
    response: import("n8n-workflow").INodeExecutionData[][] | null | undefined;
}>;
export {};
//# sourceMappingURL=TriggerHelpers.d.ts.map