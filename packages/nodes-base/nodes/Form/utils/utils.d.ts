import type { Response } from 'express';
import type { CredentialCheckStatus, INode, INodeExecutionData, IUser, IDataObject, IWebhookFunctions, FormFieldsParameter, NodeTypeAndVersion } from 'n8n-workflow';
import type { FormTriggerData } from '../interfaces';
export declare const getNodeReference: (nodeName: string) => string;
/** Binding claims tying a form auth token to the run that minted it. */
export type FormUserAuthTokenBinding = {
    workflowId?: string;
    executionId?: string;
};
export declare function sanitizeHtml(text: string): string;
/**
 *  Replaces `\n` strings with actual newline characters.
 *  Also replaces `\\n` strings with `\n` string
 * @param text - The text to replace newlines in
 * @returns Updated text
 */
export declare const handleNewlines: (text: string) => string;
export declare const prepareFormFields: (fields: FormFieldsParameter) => {
    fieldLabel: string;
    elementName?: string;
    fieldType?: string;
    requiredField?: boolean;
    fieldOptions?: {
        values: Array<{
            option: string;
        }>;
    };
    multiselect?: boolean;
    multipleFiles?: boolean;
    acceptFileTypes?: string;
    formatDate?: string;
    html?: string;
    placeholder?: string;
    defaultValue?: string;
    fieldName?: string;
    fieldValue?: string;
    limitSelection?: 'exact' | 'range' | 'unlimited';
    numberOfSelections?: number;
    minSelections?: number;
    maxSelections?: number;
}[];
export declare function sanitizeCustomCss(css: string | undefined): string | undefined;
/**
 * Validates that a URL uses a safe scheme.
 * Returns the normalized URL if valid, or null if invalid.
 */
export declare function validateSafeRedirectUrl(url: string | undefined): string | null;
export declare function createDescriptionMetadata(description: string): string;
/** Target of the "Form automated with n8n" attribution footer. */
export declare function getN8nWebsiteLink(instanceId?: string): string;
export declare function prepareFormData({ formTitle, formDescription, formSubmittedHeader, formSubmittedText, redirectUrl, formFields, testRun, query, instanceId, useResponseData, appendAttribution, buttonLabel, customCss, nodeVersion, authToken, shellInner, hasAuthenticatedSubmitter, hostNavigationPath, }: {
    formTitle: string;
    formDescription: string;
    formSubmittedText: string | undefined;
    redirectUrl: string | undefined;
    formFields: FormFieldsParameter;
    testRun: boolean;
    query: IDataObject;
    instanceId?: string;
    useResponseData?: boolean;
    appendAttribution?: boolean;
    buttonLabel?: string;
    formSubmittedHeader?: string;
    customCss?: string;
    nodeVersion?: number;
    authToken?: string;
    shellInner?: boolean;
    hasAuthenticatedSubmitter?: boolean;
    hostNavigationPath?: string;
}): FormTriggerData;
export declare const validateResponseModeConfiguration: (context: IWebhookFunctions) => void;
export declare function addFormResponseDataToReturnItem(returnItem: INodeExecutionData, formFields: FormFieldsParameter, bodyData: IDataObject, nodeVersion?: number): void;
export declare function prepareFormReturnItem(context: IWebhookFunctions, formFields: FormFieldsParameter, mode: 'test' | 'production', useWorkflowTimezone?: boolean, authedUser?: IUser): Promise<INodeExecutionData>;
export declare function renderForm({ context, res, formTitle, formDescription, formFields, responseMode, mode, formSubmittedText, redirectUrl, appendAttribution, buttonLabel, customCss, authToken, shellInner, hasAuthenticatedSubmitter, }: {
    context: IWebhookFunctions;
    res: Response;
    formTitle: string;
    formDescription: string;
    formFields: FormFieldsParameter;
    responseMode: string;
    mode: 'test' | 'production';
    formSubmittedText?: string;
    redirectUrl?: string;
    appendAttribution?: boolean;
    buttonLabel?: string;
    customCss?: string;
    authToken?: string;
    shellInner?: boolean;
    hasAuthenticatedSubmitter?: boolean;
}): void;
/**
 * The path prefix this render may ask the hosting shell to navigate to, or
 * `undefined` when the render isn't in the shell's frame and so keeps navigating
 * itself.
 */
export declare function getHostNavigationPath(context: IWebhookFunctions, shellInner?: boolean): string | undefined;
export declare const isFormConnected: (nodes: NodeTypeAndVersion[]) => boolean;
/**
 * Submit-time credential readiness gate, shared by the trigger's POST and the
 * Form node's POST. Answers 428 with the missing-credential list when the
 * submitter's required accounts aren't all connected, 503 when the check itself
 * fails. Returns true when a response was sent and the submission must not
 * proceed. A no-op (`undefined` readiness) outside the dynamic-credentials flow.
 */
export declare function respondIfCredentialsNotReady(context: IWebhookFunctions, res: Response): Promise<boolean>;
/**
 * Generate a form auth token for n8nUserAuth. The token embeds the user info
 * in a signed JWT so the POST handler can authenticate the submission without
 * relying on the `n8n-auth` cookie (cookies aren't sent on fetch requests from
 * the sandboxed form page because the document has a null origin and the
 * cookie is `SameSite=Lax`).
 *
 * The `nid` and `wid` claims bind the token to a specific node + webhook,
 * preventing replay across forms. `wfid`/`eid` additionally bind it to the
 * workflow and — for tokens minted while a run is in progress — that run, which
 * is what lets the same token be accepted as the form page auth cookie. Signed
 * with HS256 using the instance's hmac signature secret.
 */
export declare function generateFormUserAuthToken(node: INode, user: IUser, binding: FormUserAuthTokenBinding): string;
/**
 * Verify a form auth token issued by `generateFormUserAuthToken` and presented
 * in the `x-auth-token` header. Returns the encoded user on success or `null` on
 * any failure (bad format, expired, wrong signature, wrong node, wrong
 * execution). The caller decides how to surface the failure.
 *
 * A token carrying an `eid` is only accepted for that execution. Tokens minted
 * before a run existed carry none and stay valid for the node they name.
 */
export declare function verifyFormUserAuthToken(token: string, node: INode, executionId?: string): IUser | null;
/**
 * Hand the follow-up pages of a multi-page form their own auth token, scoped to
 * the form-waiting path. Re-set on every page render, so a long form's later
 * pages get a token that is still within its TTL.
 */
export declare function setFormAuthCookie(context: IWebhookFunctions, token: string, binding: FormUserAuthTokenBinding): void;
/**
 * Multi-step Form/Wait nodes inherit `authentication` from the upstream
 * Form Trigger. This wrapper short-circuits when n8nUserAuth isn't in use.
 *
 * A page is reached by navigating to it, which cannot carry an `x-auth-token`
 * header, so a GET is authenticated from the form page auth cookie first. Every
 * other request — and any GET whose cookie is missing, doesn't verify, or names
 * someone other than the session on the same request — falls through to the
 * session cookie / `x-auth-token` checks, unchanged.
 *
 * Form pages never take the OAuth2 branch: the OAuth2 token's audience is the
 * trigger's URL, which a page's own resource URL is not.
 *
 * Returns `{ authedUser }` on success, `{ responded: true }` after sending a
 * 302/401 on failure, or `{}` if the trigger doesn't require auth.
 */
export declare function validateFormPageAuth(context: IWebhookFunctions, triggerAuthentication: string): Promise<{
    authedUser?: IUser;
    responded?: boolean;
}>;
export type FormShellCredentialRow = {
    id: string;
    name: string;
    type: string;
    status: CredentialCheckStatus['status'];
    connected: boolean;
    /** Letter tile, used whenever the provider icon doesn't resolve. */
    initial: string;
    iconUrl?: string;
    authorizationUrl?: string;
    revokeUrl?: string;
    resolverId?: string;
    account?: string;
    usedBy?: string;
};
export type FormShellViewModel = {
    credentials: FormShellCredentialRow[];
    total: number;
    connectedCount: number;
    useDialog: boolean;
    allConnected: boolean;
    summaryText: string;
    footerText: string;
    submitterEmail?: string;
};
/**
 * The one-line state of the connect panel for two or more accounts. Mirrored by
 * the shell's client-side `summaryText()`, which re-renders it in place as rows
 * connect (a reload would bounce the submitter back through consent).
 */
export declare function formShellSummaryText(total: number, connectedCount: number): string;
/**
 * View model for `form-shell.handlebars`. Two shapes: a single required account
 * gets its own row with a Connect button that opens the OAuth popup directly;
 * two or more collapse behind a summary line plus the "Connect your accounts"
 * dialog.
 */
export declare function buildFormShellViewModel(credentials: CredentialCheckStatus[], submitterEmail?: string): FormShellViewModel;
export declare function formWebhook(context: IWebhookFunctions, authProperty?: string): Promise<{
    noWebhookResponse: boolean;
    webhookResponse?: undefined;
    workflowData?: undefined;
} | {
    noWebhookResponse?: undefined;
    webhookResponse: {
        status: number;
    };
    workflowData: INodeExecutionData[][];
}>;
type ExpressionResolutionContext = Pick<IWebhookFunctions, 'evaluateExpression'>;
export declare function resolveRawData(context: ExpressionResolutionContext, rawData: string): string;
type ParseFormFieldsOptions = {
    defineForm: 'json' | 'fields';
    fieldsParameterName: string;
    mode?: 'test' | 'production';
};
export declare function parseFormFields(context: IWebhookFunctions, options: ParseFormFieldsOptions): FormFieldsParameter;
type ParseJsonFormFieldsCtx = Pick<IWebhookFunctions, 'evaluateExpression' | 'getNode'>;
/**
 * @throws {NodeOperationError} if the JSON is invalid or cannot be parsed into form fields
 */
export declare function parseJsonFormFields(context: ParseJsonFormFieldsCtx, getJsonOutput: () => string, mode?: 'test' | 'production'): FormFieldsParameter;
export {};
//# sourceMappingURL=utils.d.ts.map