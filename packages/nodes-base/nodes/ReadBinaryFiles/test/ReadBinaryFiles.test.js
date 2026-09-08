import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import path from 'path';
describe('Test Read Binary Files Node', () => {
    const testHarness = new NodeTestHarness();
    const workflowData = testHarness.readWorkflowJSON('ReadBinaryFiles.workflow.json');
    const node = workflowData.nodes.find((n) => n.name === 'Read Binary Files');
    const dir = path.join(__dirname, 'data').split('\\').join('/');
    node.parameters.fileSelector = `${dir}/*.json`;
    const tests = [
        {
            description: 'nodes/ReadBinaryFiles/test/ReadBinaryFiles.workflow.json',
            input: {
                workflowData,
            },
            output: {
                assertBinaryData: true,
                nodeData: {
                    'Read Binary Files': [
                        [
                            {
                                binary: {
                                    data: {
                                        mimeType: 'application/json',
                                        fileType: 'json',
                                        fileExtension: 'json',
                                        data: 'ewoJInRpdGxlIjogIkxvcmVtIElwc3VtIgp9Cg==',
                                        fileName: 'sample.json',
                                        fileSize: '28 B',
                                    },
                                },
                                json: {},
                            },
                            {
                                binary: {
                                    data: {
                                        mimeType: 'application/json',
                                        fileType: 'json',
                                        fileExtension: 'json',
                                        data: 'ewoJInRpdGxlIjogIklwc3VtIExvcmVtIgp9Cg==',
                                        fileName: 'sample2.json',
                                        fileSize: '28 B',
                                    },
                                },
                                json: {},
                            },
                        ],
                    ],
                },
            },
        },
    ];
    for (const testData of tests) {
        testHarness.setupTest(testData);
    }
});
//# sourceMappingURL=ReadBinaryFiles.test.js.map