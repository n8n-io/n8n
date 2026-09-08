import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import { Readable } from 'stream';
export const driveNode = {
    id: '11',
    name: 'Google Drive node',
    typeVersion: 3,
    type: 'n8n-nodes-base.googleDrive',
    position: [42, 42],
    parameters: {},
};
export const createMockExecuteFunction = (nodeParameters, node, continueOnFail = false) => {
    const fakeExecuteFunction = {
        getNodeParameter(parameterName, _itemIndex, fallbackValue, options) {
            const parameter = options?.extractValue ? `${parameterName}.value` : parameterName;
            return get(nodeParameters, parameter, fallbackValue);
        },
        getNode() {
            return node;
        },
        helpers: {
            constructExecutionMetaData,
            returnJsonArray: () => [],
            prepareBinaryData: () => { },
            httpRequest: () => { },
        },
        continueOnFail: () => continueOnFail,
    };
    return fakeExecuteFunction;
};
export function createTestStream(byteSize) {
    let bytesSent = 0;
    const CHUNK_SIZE = 64 * 1024; // 64kB chunks (default NodeJS highWaterMark)
    return new Readable({
        read() {
            const remainingBytes = byteSize - bytesSent;
            if (remainingBytes <= 0) {
                this.push(null);
                return;
            }
            const chunkSize = Math.min(CHUNK_SIZE, remainingBytes);
            const chunk = Buffer.alloc(chunkSize, 'A'); // Test data just a string of "A"
            bytesSent += chunkSize;
            this.push(chunk);
        },
    });
}
//# sourceMappingURL=helpers.js.map