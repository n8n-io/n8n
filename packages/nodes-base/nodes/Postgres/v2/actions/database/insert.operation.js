import { updateDisplayOptions } from '@utils/utilities';
import { addReturning, checkItemAgainstSchema, configureTableSchemaUpdater, getTableSchema, prepareItem, convertArraysToPostgresFormat, replaceEmptyStringsByNulls, hasJsonDataTypeInSchema, convertValuesToJsonWithPgp, runQueriesAndHandleErrors, } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';
const properties = [
    {
        displayName: 'Data Mode',
        name: 'dataMode',
        type: 'options',
        options: [
            {
                name: 'Auto-Map Input Data to Columns',
                value: 'autoMapInputData',
                description: 'Use when node input properties names exactly match the table column names',
            },
            {
                name: 'Map Each Column Manually',
                value: 'defineBelow',
                description: 'Set the value for each destination column manually',
            },
        ],
        default: 'autoMapInputData',
        description: 'Whether to map node input properties and the table data automatically or manually',
        displayOptions: {
            show: {
                '@version': [2, 2.1],
            },
        },
    },
    {
        displayName: `
		In this mode, make sure incoming data fields are named the same as the columns in your table. If needed, use an 'Edit Fields' node before this node to change the field names.
		`,
        name: 'notice',
        type: 'notice',
        default: '',
        displayOptions: {
            show: {
                dataMode: ['autoMapInputData'],
                '@version': [2, 2.1],
            },
        },
    },
    {
        displayName: 'Values to Send',
        name: 'valuesToSend',
        placeholder: 'Add Value',
        type: 'fixedCollection',
        typeOptions: {
            multipleValueButtonText: 'Add Value',
            multipleValues: true,
        },
        displayOptions: {
            show: {
                dataMode: ['defineBelow'],
                '@version': [2, 2.1],
            },
        },
        default: {},
        options: [
            {
                displayName: 'Values',
                name: 'values',
                values: [
                    {
                        // eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
                        displayName: 'Column',
                        name: 'column',
                        type: 'options',
                        // eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
                        description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/" target="_blank">expression</a>',
                        typeOptions: {
                            loadOptionsMethod: 'getColumns',
                            loadOptionsDependsOn: ['schema.value', 'table.value'],
                        },
                        default: [],
                    },
                    {
                        displayName: 'Value',
                        name: 'value',
                        type: 'string',
                        default: '',
                    },
                ],
            },
        ],
    },
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        noDataExpression: true,
        required: true,
        typeOptions: {
            loadOptionsDependsOn: ['table.value', 'operation'],
            resourceMapper: {
                resourceMapperMethod: 'getMappingColumns',
                mode: 'add',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: true,
            },
        },
        displayOptions: {
            show: {
                '@version': [{ _cnd: { gte: 2.2 } }],
            },
        },
    },
    optionsCollection,
];
const displayOptions = {
    show: {
        resource: ['database'],
        operation: ['insert'],
    },
    hide: {
        table: [''],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(runQueries, items, nodeOptions, db, pgp) {
    items = replaceEmptyStringsByNulls(items, nodeOptions.replaceEmptyStrings);
    const nodeVersion = nodeOptions.nodeVersion;
    let schema = this.getNodeParameter('schema', 0, undefined, {
        extractValue: true,
    });
    let table = this.getNodeParameter('table', 0, undefined, {
        extractValue: true,
    });
    const updateTableSchema = configureTableSchemaUpdater(schema, table);
    let tableSchema = await getTableSchema(db, schema, table);
    const queries = [];
    const errorItemsMap = new Map();
    for (let i = 0; i < items.length; i++) {
        try {
            schema = this.getNodeParameter('schema', i, undefined, {
                extractValue: true,
            });
            table = this.getNodeParameter('table', i, undefined, {
                extractValue: true,
            });
            const options = this.getNodeParameter('options', i, {});
            let onConflict = '';
            if (options.skipOnConflict) {
                onConflict = ' ON CONFLICT DO NOTHING';
            }
            let query = `INSERT INTO $1:name.$2:name($3:name) VALUES($3:csv)${onConflict}`;
            let values = [schema, table];
            const dataMode = nodeVersion < 2.2
                ? this.getNodeParameter('dataMode', i)
                : this.getNodeParameter('columns.mappingMode', i);
            let item = {};
            if (dataMode === 'autoMapInputData') {
                item = items[i].json;
            }
            if (dataMode === 'defineBelow') {
                const valuesToSend = nodeVersion < 2.2
                    ? this.getNodeParameter('valuesToSend', i, [])
                        .values
                    : this.getNodeParameter('columns.values', i, [])
                        .values;
                item =
                    nodeVersion < 2.2
                        ? prepareItem(valuesToSend)
                        : hasJsonDataTypeInSchema(tableSchema)
                            ? convertValuesToJsonWithPgp(pgp, tableSchema, this.getNodeParameter('columns', i)?.value)
                            : this.getNodeParameter('columns.value', i);
            }
            tableSchema = await updateTableSchema(db, tableSchema, schema, table);
            if (nodeVersion >= 2.4) {
                item = convertArraysToPostgresFormat(item, tableSchema, this.getNode(), i);
            }
            values.push(checkItemAgainstSchema(this.getNode(), item, tableSchema, i));
            const outputColumns = this.getNodeParameter('options.outputColumns', i, ['*']);
            if (nodeVersion >= 2.6 && Object.keys(item).length === 0) {
                query = 'INSERT INTO $1:name.$2:name DEFAULT VALUES';
            }
            [query, values] = addReturning(query, outputColumns, values);
            queries.push({ query, values });
        }
        catch (e) {
            if (this.continueOnFail()) {
                const error = e instanceof Error ? e : String(e);
                errorItemsMap.set(i, { json: { error }, pairedItem: { item: i } });
                continue;
            }
            throw e;
        }
    }
    return await runQueriesAndHandleErrors(runQueries, queries, nodeOptions, errorItemsMap);
}
//# sourceMappingURL=insert.operation.js.map