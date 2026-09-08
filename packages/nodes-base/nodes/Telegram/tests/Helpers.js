import get from 'lodash/get';
export const telegramNode = {
    id: 'b3039263-29ad-4476-9894-51dfcc5a706d',
    name: 'Telegram node',
    typeVersion: 1.2,
    type: 'n8n-nodes-base.telegram',
    position: [0, 0],
    parameters: {
        resource: 'callback',
        operation: 'answerQuery',
    },
};
export const createMockExecuteFunction = (nodeParameters) => {
    const fakeExecuteFunction = {
        getInputData() {
            return [{ json: {} }];
        },
        getNodeParameter(parameterName, _itemIndex, fallbackValue, options) {
            const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
            return get(nodeParameters, parameter, fallbackValue);
        },
        getNode() {
            return telegramNode;
        },
        helpers: {},
        continueOnFail: () => false,
    };
    return fakeExecuteFunction;
};
//# sourceMappingURL=Helpers.js.map