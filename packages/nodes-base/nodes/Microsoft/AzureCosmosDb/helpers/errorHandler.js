import { jsonParse, NodeApiError } from 'n8n-workflow';
export const ErrorMap = {
    Container: {
        Conflict: {
            getMessage: (id) => `Container "${id}" already exists.`,
            description: "Use a unique value for 'ID' and try again.",
        },
        NotFound: {
            getMessage: (id) => `Container "${id}" was not found.`,
            description: "Double-check the value in the parameter 'Container' and try again.",
        },
    },
    Item: {
        NotFound: {
            getMessage: (id) => `Item "${id}" was not found.`,
            description: "Double-check the values in the parameter 'Item' and 'Partition Key' (if applicable) and try again.",
        },
    },
};
export async function handleError(data, response) {
    if (String(response.statusCode).startsWith('4') || String(response.statusCode).startsWith('5')) {
        const resource = this.getNodeParameter('resource');
        const error = response.body;
        let errorMessage = error.message;
        let errorDetails = undefined;
        if (resource === 'container') {
            if (error.code === 'Conflict') {
                const newContainerValue = this.getNodeParameter('containerCreate');
                throw new NodeApiError(this.getNode(), error, {
                    message: ErrorMap.Container.Conflict.getMessage(newContainerValue ?? 'Unknown'),
                    description: ErrorMap.Container.Conflict.description,
                });
            }
            if (error.code === 'NotFound') {
                const containerValue = this.getNodeParameter('container', undefined, {
                    extractValue: true,
                });
                throw new NodeApiError(this.getNode(), error, {
                    message: ErrorMap.Container.NotFound.getMessage(containerValue ?? 'Unknown'),
                    description: ErrorMap.Container.NotFound.description,
                });
            }
        }
        else if (resource === 'item') {
            if (error.code === 'NotFound') {
                const itemValue = this.getNodeParameter('item', undefined, {
                    extractValue: true,
                });
                throw new NodeApiError(this.getNode(), error, {
                    message: ErrorMap.Item.NotFound.getMessage(itemValue ?? 'Unknown'),
                    description: ErrorMap.Item.NotFound.description,
                });
            }
        }
        try {
            // Certain error responses have nested Message
            errorMessage = jsonParse(errorMessage).message;
        }
        catch { }
        const match = errorMessage.match(/Message: ({.*?})/);
        if (match?.[1]) {
            try {
                errorDetails = jsonParse(match[1]).Errors;
            }
            catch { }
        }
        if (errorDetails && errorDetails.length > 0) {
            throw new NodeApiError(this.getNode(), error, {
                message: error.code,
                description: errorDetails.join('\n'),
            });
        }
        else {
            throw new NodeApiError(this.getNode(), error, {
                message: error.code,
                description: error.message,
            });
        }
    }
    return data;
}
//# sourceMappingURL=errorHandler.js.map