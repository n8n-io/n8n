export const iconSelector = {
    // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
    displayName: 'Icon to Display on Canvas',
    name: 'icon',
    type: 'options',
    // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
    description: 'Select a type of node to show corresponding icon',
    default: 'n8n-nodes-base.noOp',
    typeOptions: {
        loadOptionsMethod: 'getNodeTypes',
    },
};
export const subtitleProperty = {
    displayName: 'Subtitle',
    name: 'subtitle',
    type: 'string',
    default: '',
    placeholder: "e.g. 'record: read'",
};
export const jsonOutputProperty = {
    displayName: 'JSON',
    name: 'jsonOutput',
    type: 'json',
    typeOptions: {
        rows: 5,
    },
    default: '[\n  {\n  "my_field_1": "value",\n  "my_field_2": 1\n  }\n]',
    validateType: 'array',
};
export const executionDurationProperty = {
    displayName: 'Execution Duration (MS)',
    name: 'executionDuration',
    type: 'number',
    default: 150,
    description: 'Execution duration in milliseconds',
    typeOptions: {
        minValue: 0,
    },
};
//# sourceMappingURL=descriptions.js.map