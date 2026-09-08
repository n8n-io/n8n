import { databaseUrlExtractionRegexp, databaseUrlValidationRegexp, idExtractionRegexp, idValidationRegexp, } from '../constants';
const colors = [
    {
        name: 'Default',
        value: 'default',
    },
    {
        name: 'Gray',
        value: 'gray',
    },
    {
        name: 'Brown',
        value: 'brown',
    },
    {
        name: 'Orange',
        value: 'orange',
    },
    {
        name: 'Yellow',
        value: 'yellow',
    },
    {
        name: 'Green',
        value: 'green',
    },
    {
        name: 'Blue',
        value: 'blue',
    },
    {
        name: 'Purple',
        value: 'purple',
    },
    {
        name: 'Pink',
        value: 'pink',
    },
    {
        name: 'Red',
        value: 'red',
    },
    {
        name: 'Gray Background',
        value: 'gray_background',
    },
    {
        name: 'Brown Background',
        value: 'brown_background',
    },
    {
        name: 'Orange Background',
        value: 'orange_background',
    },
    {
        name: 'Yellow Background',
        value: 'yellow_background',
    },
    {
        name: 'Green Background',
        value: 'green_background',
    },
    {
        name: 'Blue Background',
        value: 'blue_background',
    },
    {
        name: 'Purple Background',
        value: 'purple_background',
    },
    {
        name: 'Pink Background',
        value: 'pink_background',
    },
    {
        name: 'Red Background',
        value: 'red_background',
    },
];
const annotation = [
    {
        displayName: 'Annotations',
        name: 'annotationUi',
        type: 'collection',
        placeholder: 'Add Annotation',
        default: {},
        options: [
            {
                displayName: 'Bold',
                name: 'bold',
                type: 'boolean',
                default: false,
                description: 'Whether the text is bolded',
            },
            {
                displayName: 'Italic',
                name: 'italic',
                type: 'boolean',
                default: false,
                description: 'Whether the text is italicized',
            },
            {
                displayName: 'Strikethrough',
                name: 'strikethrough',
                type: 'boolean',
                default: false,
                description: 'Whether the text is struck through',
            },
            {
                displayName: 'Underline',
                name: 'underline',
                type: 'boolean',
                default: false,
                description: 'Whether the text is underlined',
            },
            {
                displayName: 'Code',
                name: 'code',
                type: 'boolean',
                default: false,
                description: 'Whether the text is code style',
            },
            {
                displayName: 'Color',
                name: 'color',
                type: 'options',
                options: colors,
                default: '',
                description: 'Color of the text',
            },
        ],
        description: 'All annotations that apply to this rich text',
    },
];
const DEFAULT_BLOCKS_CONFIG = {
    blockTypesLoadOptionsMethod: 'getBlockTypes',
    databaseSearchListMethod: 'getDatabases',
    usersLoadOptionsMethod: 'getUsers',
};
function getBlocksConfig(config = {}) {
    return {
        ...DEFAULT_BLOCKS_CONFIG,
        ...config,
    };
}
const typeMention = (config = {}) => {
    const resolvedConfig = getBlocksConfig(config);
    return [
        {
            displayName: 'Type',
            name: 'mentionType',
            type: 'options',
            displayOptions: {
                show: {
                    textType: ['mention'],
                },
            },
            options: [
                {
                    name: 'Database',
                    value: 'database',
                },
                {
                    name: 'Date',
                    value: 'date',
                },
                {
                    name: 'Page',
                    value: 'page',
                },
                {
                    name: 'User',
                    value: 'user',
                },
            ],
            default: '',
            description: 'An inline mention of a user, page, database, or date. In the app these are created by typing @ followed by the name of a user, page, database, or a date.',
        },
        {
            displayName: 'User Name or ID',
            name: 'user',
            type: 'options',
            typeOptions: {
                loadOptionsMethod: resolvedConfig.usersLoadOptionsMethod,
            },
            displayOptions: {
                show: {
                    mentionType: ['user'],
                },
            },
            default: '',
            description: 'The ID of the user being mentioned. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
        },
        {
            displayName: 'Page ID',
            name: 'page',
            type: 'string',
            displayOptions: {
                show: {
                    mentionType: ['page'],
                },
            },
            default: '',
            description: 'The ID of the page being mentioned',
        },
        {
            displayName: 'Database',
            name: 'database',
            type: 'resourceLocator',
            default: { mode: 'list', value: '' },
            modes: [
                {
                    displayName: 'Database',
                    name: 'list',
                    type: 'list',
                    placeholder: 'Select a Database...',
                    typeOptions: {
                        searchListMethod: resolvedConfig.databaseSearchListMethod,
                        searchable: true,
                    },
                },
                {
                    displayName: 'Link',
                    name: 'url',
                    type: 'string',
                    placeholder: 'https://www.notion.com/0fe2f7de558b471eab07e9d871cdf4a9?v=f2d424ba0c404733a3f500c78c881610',
                    validation: [
                        {
                            type: 'regex',
                            properties: {
                                regex: databaseUrlValidationRegexp,
                                errorMessage: 'Not a valid Notion Database URL',
                            },
                        },
                    ],
                    extractValue: {
                        type: 'regex',
                        regex: databaseUrlExtractionRegexp,
                    },
                },
                {
                    displayName: 'ID',
                    name: 'id',
                    type: 'string',
                    placeholder: 'ab1545b247fb49fa92d6f4b49f4d8116',
                    validation: [
                        {
                            type: 'regex',
                            properties: {
                                regex: idValidationRegexp,
                                errorMessage: 'Not a valid Notion Database ID',
                            },
                        },
                    ],
                    extractValue: {
                        type: 'regex',
                        regex: idExtractionRegexp,
                    },
                    url: '=https://www.notion.com/{{$value.replace(/-/g, "")}}',
                },
            ],
            displayOptions: {
                show: {
                    mentionType: ['database'],
                },
            },
            description: 'The Notion Database being mentioned',
        },
        {
            displayName: 'Range',
            name: 'range',
            displayOptions: {
                show: {
                    mentionType: ['date'],
                },
            },
            type: 'boolean',
            default: false,
            description: 'Whether or not you want to define a date range',
        },
        {
            displayName: 'Date',
            name: 'date',
            displayOptions: {
                show: {
                    mentionType: ['date'],
                    range: [false],
                },
            },
            type: 'dateTime',
            default: '',
            description: 'An ISO 8601 format date, with optional time',
        },
        {
            displayName: 'Date Start',
            name: 'dateStart',
            displayOptions: {
                show: {
                    mentionType: ['date'],
                    range: [true],
                },
            },
            type: 'dateTime',
            default: '',
            description: 'An ISO 8601 format date, with optional time',
        },
        {
            displayName: 'Date End',
            name: 'dateEnd',
            displayOptions: {
                show: {
                    range: [true],
                    mentionType: ['date'],
                },
            },
            type: 'dateTime',
            default: '',
            description: 'An ISO 8601 formatted date, with optional time. Represents the end of a date range.',
        },
    ];
};
const typeEquation = [
    {
        displayName: 'Expression',
        name: 'expression',
        type: 'string',
        displayOptions: {
            show: {
                textType: ['equation'],
            },
        },
        default: '',
    },
];
const typeText = [
    {
        displayName: 'Text',
        name: 'text',
        displayOptions: {
            show: {
                textType: ['text'],
            },
        },
        type: 'string',
        default: '',
        description: "Text content. This field contains the actual content of your text and is probably the field you'll use most often.",
    },
    {
        displayName: 'Is Link',
        name: 'isLink',
        displayOptions: {
            show: {
                textType: ['text'],
            },
        },
        type: 'boolean',
        default: false,
    },
    {
        displayName: 'Text Link',
        name: 'textLink',
        displayOptions: {
            show: {
                textType: ['text'],
                isLink: [true],
            },
        },
        type: 'string',
        default: '',
        description: 'The URL that this link points to',
    },
];
export const text = (displayOptions, config = {}) => [
    {
        displayName: 'Text',
        name: 'text',
        placeholder: 'Add Text',
        type: 'fixedCollection',
        default: {},
        typeOptions: {
            multipleValues: true,
        },
        displayOptions,
        options: [
            {
                name: 'text',
                displayName: 'Text',
                values: [
                    {
                        displayName: 'Type',
                        name: 'textType',
                        type: 'options',
                        options: [
                            {
                                name: 'Equation',
                                value: 'equation',
                            },
                            {
                                name: 'Mention',
                                value: 'mention',
                            },
                            {
                                name: 'Text',
                                value: 'text',
                            },
                        ],
                        default: 'text',
                    },
                    ...typeText,
                    ...typeMention(config),
                    ...typeEquation,
                    ...annotation,
                ],
            },
        ],
        description: 'Rich text in the block',
    },
];
const todo = (type) => [
    {
        displayName: 'Checked',
        name: 'checked',
        type: 'boolean',
        default: false,
        displayOptions: {
            show: {
                type: [type],
            },
        },
        description: 'Whether the to_do is checked or not',
    },
];
const title = (type) => [
    {
        displayName: 'Title',
        name: 'title',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                type: [type],
            },
        },
        description: 'Plain text of page title',
    },
];
const richText = (displayOptions) => [
    {
        displayName: 'Rich Text',
        name: 'richText',
        type: 'boolean',
        displayOptions,
        default: false,
    },
];
const textContent = (displayOptions) => [
    {
        displayName: 'Text',
        name: 'textContent',
        type: 'string',
        displayOptions,
        default: '',
    },
];
const imageBlock = (type) => [
    {
        displayName: 'Image URL',
        name: 'url',
        type: 'string',
        displayOptions: {
            show: {
                type: [type],
            },
        },
        default: '',
        description: 'Image file reference',
    },
];
const block = (blockType, config = {}) => {
    const data = [];
    switch (blockType) {
        case 'to_do':
            data.push.apply(data, todo(blockType));
            data.push.apply(data, richText({
                show: {
                    type: [blockType],
                },
            }));
            data.push.apply(data, textContent({
                show: {
                    type: [blockType],
                    richText: [false],
                },
            }));
            data.push.apply(data, text({
                show: {
                    type: [blockType],
                    richText: [true],
                },
            }, config));
            break;
        case 'child_page':
            data.push.apply(data, title(blockType));
            break;
        case 'image':
            data.push.apply(data, imageBlock(blockType));
            break;
        default:
            data.push.apply(data, richText({
                show: {
                    type: [blockType],
                },
            }));
            data.push.apply(data, textContent({
                show: {
                    type: [blockType],
                    richText: [false],
                },
            }));
            data.push.apply(data, text({
                show: {
                    type: [blockType],
                    richText: [true],
                },
            }, config));
            break;
    }
    return data;
};
export const blocks = (resource, operation, config = {}) => {
    const resolvedConfig = getBlocksConfig(config);
    const displayOptions = resolvedConfig.displayOptions ?? {
        show: {
            resource: [resource],
            operation: [operation],
        },
    };
    const typeOptions = {
        multipleValues: true,
        ...(resolvedConfig.sortable ? { sortable: true } : {}),
    };
    return [
        {
            displayName: 'Blocks',
            name: 'blockUi',
            type: 'fixedCollection',
            typeOptions,
            default: {},
            displayOptions,
            placeholder: 'Add Block',
            options: [
                {
                    name: 'blockValues',
                    displayName: 'Block',
                    ...(resolvedConfig.sortable ? { typeOptions: { sortable: true } } : {}),
                    values: [
                        {
                            displayName: 'Type Name or ID',
                            name: 'type',
                            type: 'options',
                            description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
                            typeOptions: {
                                loadOptionsMethod: resolvedConfig.blockTypesLoadOptionsMethod,
                            },
                            default: 'paragraph',
                        },
                        ...block('paragraph', resolvedConfig),
                        ...block('heading_1', resolvedConfig),
                        ...block('heading_2', resolvedConfig),
                        ...block('heading_3', resolvedConfig),
                        ...block('toggle', resolvedConfig),
                        ...block('to_do', resolvedConfig),
                        ...block('child_page', resolvedConfig),
                        ...block('bulleted_list_item', resolvedConfig),
                        ...block('numbered_list_item', resolvedConfig),
                        ...block('image', resolvedConfig),
                    ],
                },
            ],
        },
    ];
};
//# sourceMappingURL=Blocks.js.map