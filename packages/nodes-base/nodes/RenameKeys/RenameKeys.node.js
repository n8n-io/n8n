import get from 'lodash/get';
import set from 'lodash/set';
import unset from 'lodash/unset';
import { NodeConnectionTypes, deepCopy, safeRegex } from 'n8n-workflow';
export class RenameKeys {
    description = {
        displayName: 'Rename Keys',
        name: 'renameKeys',
        icon: 'node:rename-keys',
        iconColor: 'crimson',
        group: ['transform'],
        version: 1,
        description: 'Update item field names',
        defaults: {
            name: 'Rename Keys',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        properties: [
            {
                displayName: 'Keys',
                name: 'keys',
                placeholder: 'Add new key',
                description: 'Adds a key which should be renamed',
                type: 'fixedCollection',
                typeOptions: {
                    multipleValues: true,
                    sortable: true,
                },
                default: {},
                options: [
                    {
                        displayName: 'Key',
                        name: 'key',
                        values: [
                            {
                                displayName: 'Current Key Name',
                                name: 'currentKey',
                                type: 'string',
                                default: '',
                                placeholder: 'currentKey',
                                requiresDataPath: 'single',
                                description: 'The current name of the key. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.currentKey".',
                            },
                            {
                                displayName: 'New Key Name',
                                name: 'newKey',
                                type: 'string',
                                default: '',
                                placeholder: 'newKey',
                                description: 'The name the key should be renamed to. It is also possible to define deep keys by using dot-notation like for example: "level1.level2.newKey".',
                            },
                        ],
                    },
                ],
            },
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                default: {},
                placeholder: 'Add option',
                options: [
                    {
                        displayName: 'Regex',
                        name: 'regexReplacement',
                        placeholder: 'Add new regular expression',
                        description: 'Adds a regular expression',
                        type: 'fixedCollection',
                        typeOptions: {
                            multipleValues: true,
                            sortable: true,
                        },
                        default: {},
                        options: [
                            {
                                displayName: 'Replacement',
                                name: 'replacements',
                                values: [
                                    {
                                        displayName: 'Be aware that by using regular expression previously renamed keys can be affected',
                                        name: 'regExNotice',
                                        type: 'notice',
                                        default: '',
                                    },
                                    {
                                        displayName: 'Regular Expression',
                                        name: 'searchRegex',
                                        type: 'string',
                                        default: '',
                                        placeholder: 'e.g. [N-n]ame',
                                        description: 'Regex to match the key name',
                                        hint: 'Learn more and test RegEx <a href="https://regex101.com/">here</a>',
                                    },
                                    {
                                        displayName: 'Replace With',
                                        name: 'replaceRegex',
                                        type: 'string',
                                        default: '',
                                        placeholder: 'replacedName',
                                        description: "The name the key/s should be renamed to. It's possible to use regex captures e.g. $1, $2, ...",
                                    },
                                    {
                                        displayName: 'Options',
                                        name: 'options',
                                        type: 'collection',
                                        default: {},
                                        placeholder: 'Add Regex Option',
                                        options: [
                                            {
                                                displayName: 'Case Insensitive',
                                                name: 'caseInsensitive',
                                                type: 'boolean',
                                                description: 'Whether to use case insensitive match',
                                                default: false,
                                            },
                                            {
                                                displayName: 'Max Depth',
                                                name: 'depth',
                                                type: 'number',
                                                default: -1,
                                                description: 'Maximum depth to replace keys',
                                                hint: 'Specify number for depth level (-1 for unlimited, 0 for top level only)',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
        hints: [
            {
                type: 'warning',
                message: 'Complex regex patterns like nested quantifiers .*+, ()*+, or multiple wildcards may cause performance issues. Consider using simpler patterns like [a-z]+ or \\w+ for better performance.',
                displayCondition: '={{ $parameter.additionalOptions.regexReplacement.replacements && $parameter.additionalOptions.regexReplacement.replacements.some(r => r.searchRegex && /(\\.\\*\\+|\\)\\*\\+|\\+\\*|\\*.*\\*|\\+.*\\+|\\?.*\\?|\\{[0-9]+,\\}|\\*{2,}|\\+{2,}|\\?{2,}|[a-zA-Z0-9]{4,}[\\*\\+]|\\([^)]*\\|[^)]*\\)[\\*\\+])/.test(r.searchRegex)) }}',
                whenToDisplay: 'always',
                location: 'outputPane',
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        let item;
        let newItem;
        let renameKeys;
        let value;
        const renameKey = (key) => {
            if (key.currentKey === '' || key.newKey === '' || key.currentKey === key.newKey) {
                // Ignore all which do not have all the values set or if the new key is equal to the current key
                return;
            }
            value = get(item.json, key.currentKey);
            if (value === undefined) {
                return;
            }
            set(newItem.json, key.newKey, value);
            unset(newItem.json, key.currentKey);
        };
        const regexReplaceKey = (replacement) => {
            const { searchRegex, replaceRegex, options } = replacement;
            const { depth, caseInsensitive } = options;
            const flags = caseInsensitive ? 'i' : undefined;
            const renameObjectKeys = (obj, objDepth) => {
                for (const key in obj) {
                    if (Array.isArray(obj)) {
                        // Don't rename array object references
                        if (objDepth !== 0) {
                            renameObjectKeys(obj[key], objDepth - 1);
                        }
                    }
                    else if (obj.hasOwnProperty(key)) {
                        if (typeof obj[key] === 'object' && objDepth !== 0) {
                            renameObjectKeys(obj[key], objDepth - 1);
                        }
                        if (safeRegex.test(searchRegex, key, flags)) {
                            const newKey = safeRegex.replace(searchRegex, key, flags, replaceRegex);
                            if (newKey !== key) {
                                obj[newKey] = obj[key];
                                delete obj[key];
                            }
                        }
                    }
                }
                return obj;
            };
            newItem.json = renameObjectKeys(newItem.json, depth);
        };
        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                renameKeys = this.getNodeParameter('keys.key', itemIndex, []);
                const regexReplacements = this.getNodeParameter('additionalOptions.regexReplacement.replacements', itemIndex, []);
                item = items[itemIndex];
                // Copy the whole JSON data as data on any level can be renamed
                newItem = {
                    json: deepCopy(item.json),
                    pairedItem: {
                        item: itemIndex,
                    },
                };
                if (item.binary !== undefined) {
                    // Reference binary data if any exists. We can reference it
                    // as this nodes does not change it
                    newItem.binary = item.binary;
                }
                renameKeys.forEach(renameKey);
                regexReplacements.forEach(regexReplaceKey);
                returnData.push(newItem);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    const executionErrorData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ error: error.message }), { itemData: { item: itemIndex } });
                    returnData.push(...executionErrorData);
                    continue;
                }
                throw error;
            }
        }
        return [returnData];
    }
}
//# sourceMappingURL=RenameKeys.node.js.map