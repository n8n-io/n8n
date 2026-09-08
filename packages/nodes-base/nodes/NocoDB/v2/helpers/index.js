import { NodeOperationError } from 'n8n-workflow';
export const JSONSafeParse = (source) => {
    try {
        if (!source) {
            return undefined;
        }
        return JSON.parse(source);
    }
    catch {
        return undefined;
    }
};
export const parseApiError = (error) => {
    if (!('messages' in error) || !error.messages.length) {
        return error.message;
    }
    else {
        const message = error.messages[0];
        try {
            const messageJSON = JSON.parse(message.substring(message.indexOf('{')));
            // v2 api errors
            if ('msg' in messageJSON) {
                return {
                    message: messageJSON.msg,
                    error: '',
                };
            }
            else {
                return messageJSON;
            }
        }
        catch {
            return message;
        }
    }
};
export const parseToApiNodeOperationError = ({ node, errorLevel, subject, error, }) => {
    const parsedError = parseApiError(error);
    const errorMessage = typeof parsedError === 'object' ? parsedError.message : parsedError;
    return new NodeOperationError(node, new Error(subject ? `${subject} ${errorMessage}` : errorMessage), {
        level: errorLevel ?? 'warning',
    });
};
//# sourceMappingURL=index.js.map