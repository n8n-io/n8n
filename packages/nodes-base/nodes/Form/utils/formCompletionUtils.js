import { getHtmlSandboxCSP, isFormHtmlSandboxingDisabled } from 'n8n-core';
import { OperationalError, } from 'n8n-workflow';
import { generateFormUserAuthToken, getHostNavigationPath, getN8nWebsiteLink, getNodeReference, handleNewlines, resolveRawData, sanitizeCustomCss, sanitizeHtml, validateSafeRedirectUrl, } from './utils';
const getBinaryDataFromNode = (context, nodeName) => {
    try {
        return context.evaluateExpression(`{{ ${getNodeReference(nodeName)}.first().binary }}`);
    }
    catch {
        // Parent nodes without run data (e.g. branches of another Form Trigger,
        // or nodes that ran before a resumed waiting form in queue mode) throw
        // an ExpressionError — treat them as having no binary data.
        return undefined;
    }
};
const getInputDataFieldNames = (inputDataFieldName) => {
    const fieldNames = inputDataFieldName
        .split(',')
        .map((fieldName) => fieldName.trim())
        .filter(Boolean);
    return fieldNames.length ? fieldNames : [inputDataFieldName];
};
export const binaryResponse = async (context) => {
    const inputDataFieldName = context.getNodeParameter('inputDataFieldName', '');
    const inputDataFieldNames = getInputDataFieldNames(inputDataFieldName);
    const responses = [];
    const parentNodesBinaries = context
        .getParentNodes(context.getNode().name)
        .reverse()
        .map((node) => getBinaryDataFromNode(context, node.name) ?? {});
    for (const fieldName of inputDataFieldNames) {
        const nodeBinary = parentNodesBinaries.find((bin) => Object.hasOwn(bin, fieldName));
        if (!nodeBinary) {
            throw new OperationalError(`No binary data with field ${fieldName} found.`);
        }
        const binaryData = nodeBinary[fieldName];
        responses.push({
            // If a binaryData has an id, the following field is set:
            // N8N_DEFAULT_BINARY_DATA_MODE=filesystem
            data: binaryData.id
                ? await context.helpers.binaryToBuffer(await context.helpers.getBinaryStream(binaryData.id))
                : atob(binaryData.data),
            fileName: binaryData.fileName ?? 'file',
            type: binaryData.mimeType,
        });
    }
    return responses;
};
export const renderFormCompletion = async (context, res, trigger, authedUser) => {
    const completionTitle = context.getNodeParameter('completionTitle', '');
    const completionMessage = handleNewlines(sanitizeHtml(context.getNodeParameter('completionMessage', '')));
    const redirectUrl = context.getNodeParameter('redirectUrl', '');
    const options = context.getNodeParameter('options', {});
    const respondWith = context.getNodeParameter('respondWith', '');
    const responseText = respondWith === 'showText'
        ? (context.getNodeParameter('responseText', '') ?? '')
        : '';
    const binary = respondWith === 'returnBinary' ? await binaryResponse(context) : [];
    const triggerRef = getNodeReference(trigger.name);
    let title = options.formTitle;
    if (!title) {
        title = context.evaluateExpression(`{{ ${triggerRef}.params.formTitle }}`);
        title = resolveRawData(context, title);
    }
    // The completion page inherits the trigger's attribution setting unless it
    // carries its own, so an ending page can drop the footer on its own.
    const appendAttribution = options.appendAttribution ??
        context.evaluateExpression(`{{ ${triggerRef}.params.options?.appendAttribution === false ? false : true }}`);
    if (respondWith !== 'redirect' && !isFormHtmlSandboxingDisabled()) {
        res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
    }
    // Embed the form auth token so the completion page's auto-POST (which
    // resumes the paused workflow) can re-authenticate the user — cookies
    // aren't sent on fetch from the sandboxed completion page.
    const authToken = authedUser
        ? generateFormUserAuthToken(context.getNode(), authedUser, {
            workflowId: context.getWorkflow().id,
            executionId: context.getExecutionId(),
        })
        : undefined;
    res.render('form-trigger-completion', {
        title: completionTitle,
        message: completionMessage,
        formTitle: title,
        appendAttribution,
        // Without this the footer's anchor renders with an empty href and the
        // browser resolves it against the completion page's own URL.
        n8nWebsiteLink: appendAttribution ? getN8nWebsiteLink(context.getInstanceId()) : undefined,
        responseText,
        responseBinary: encodeURIComponent(JSON.stringify(binary)),
        dangerousCustomCss: sanitizeCustomCss(options.customCss),
        redirectUrl: validateSafeRedirectUrl(redirectUrl) ?? undefined,
        authToken,
        // The completion page reloads itself while the run finishes, and that hop is
        // subject to the same cookie semantics as every other page of the form, so it
        // goes through the host when the host is the shell.
        hostNavigationPath: getHostNavigationPath(context),
    });
    return { noWebhookResponse: true };
};
//# sourceMappingURL=formCompletionUtils.js.map