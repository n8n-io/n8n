import { type IDataObject, type IWebhookFunctions } from 'n8n-workflow';
import type { SendAndWaitResponder } from '../../../utils/sendAndWait/interfaces';
/**
 * Slack webhook entry point. Interactive button clicks (signed POSTs) are signature-verified,
 * attributed to a responder, and lock the message; everything else — plain-link approvals, form
 * responses — is handed to the shared handler unchanged.
 */
export declare function slackSendAndWaitWebhook(this: IWebhookFunctions): Promise<{
    webhookResponse?: undefined;
    workflowData?: undefined;
    noWebhookResponse: boolean;
} | {
    noWebhookResponse?: undefined;
    webhookResponse: string;
    workflowData: {
        json: {
            data: {
                text: IDataObject[] | import("n8n-workflow").GenericValue[] | IDataObject | import("n8n-workflow").GenericValue;
                respondedAt: string;
            };
        };
    }[][];
} | {
    noWebhookResponse?: undefined;
    webhookResponse: string;
    workflowData: import("n8n-workflow").INodeExecutionData[][];
} | {
    noWebhookResponse?: undefined;
    webhookResponse: string;
    workflowData: {
        json: {
            data: {
                approved: boolean;
                respondedAt: string;
            };
        };
    }[][];
} | {
    webhookResponse: string;
    workflowData: {
        json: {
            data: {
                approved: boolean;
                responder: SendAndWaitResponder;
                respondedAt: string;
                channel: string | undefined;
                messageId: string | undefined;
            };
        };
    }[][];
}>;
//# sourceMappingURL=SlackHitlWebhook.d.ts.map