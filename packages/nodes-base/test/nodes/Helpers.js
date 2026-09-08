import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
export const createMockExecuteFunction = (nodeParameters, nodeMock, continueBool = false) => ({
    getNodeParameter(parameterName, _itemIndex, fallbackValue, options) {
        const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
        return get(nodeParameters, parameter, fallbackValue);
    },
    getNode() {
        return nodeMock;
    },
    getWorkflow() {
        return { id: 'test-workflow-id', name: 'Test Workflow', active: false };
    },
    continueOnFail() {
        return continueBool;
    },
    helpers: {
        constructExecutionMetaData,
    },
});
//# sourceMappingURL=Helpers.js.map