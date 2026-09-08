export const cameraProxyOperations = [
    {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
            show: {
                resource: ['cameraProxy'],
            },
        },
        options: [
            {
                name: 'Get Screenshot',
                value: 'getScreenshot',
                description: 'Get the camera screenshot',
                action: 'Get a screenshot',
            },
        ],
        default: 'getScreenshot',
    },
];
export const cameraProxyFields = [
    /* -------------------------------------------------------------------------- */
    /*                       cameraProxy:getScreenshot                            */
    /* -------------------------------------------------------------------------- */
    {
        displayName: 'Camera Entity Name or ID',
        name: 'cameraEntityId',
        type: 'options',
        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
        typeOptions: {
            loadOptionsMethod: 'getCameraEntities',
        },
        default: '',
        required: true,
        displayOptions: {
            show: {
                operation: ['getScreenshot'],
                resource: ['cameraProxy'],
            },
        },
    },
    {
        displayName: 'Put Output File in Field',
        name: 'binaryPropertyName',
        type: 'string',
        required: true,
        default: 'data',
        displayOptions: {
            show: {
                operation: ['getScreenshot'],
                resource: ['cameraProxy'],
            },
        },
        hint: 'The name of the output binary field to put the file in',
    },
];
//# sourceMappingURL=CameraProxyDescription.js.map