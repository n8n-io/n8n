import { NodeOperationError } from 'n8n-workflow';
import { updateDisplayOptions } from '@utils/utilities';
import { getCompatibleValue, getInBindParametersForExecute, getOutBindDefsForExecute, getBindDefsForExecuteMany, getColumnMap, configureTableSchemaUpdater, getColumnMetaData, quoteSqlIdentifier, } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';
const properties = [
    {
        displayName: 'Columns',
        name: 'columns',
        type: 'resourceMapper',
        noDataExpression: true,
        default: {
            mappingMode: 'defineBelow',
            value: null,
        },
        required: true,
        typeOptions: {
            loadOptionsDependsOn: ['table.value', 'operation'],
            resourceMapper: {
                resourceMapperMethod: 'getMappingColumns',
                mode: 'update',
                fieldWords: {
                    singular: 'column',
                    plural: 'columns',
                },
                addAllFields: true,
                multiKeyMatch: true,
            },
        },
    },
    ...optionsCollection,
];
const displayOptions = {
    show: {
        resource: ['database'],
        operation: ['update'],
    },
    hide: {
        table: [''],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
export async function execute(runQueries, items, nodeOptions, pool) {
    let schema = this.getNodeParameter('schema', 0, undefined, {
        extractValue: true,
    });
    let table = this.getNodeParameter('table', 0, undefined, {
        extractValue: true,
    });
    let tableSchema = await getColumnMetaData(this.getNode(), pool, schema, table);
    const queries = [];
    const stmtBatching = nodeOptions.stmtBatching || 'single';
    if (stmtBatching === 'single') {
        const dataMode = this.getNodeParameter('columns.mappingMode', 0);
        let item = {};
        if (dataMode === 'autoMapInputData') {
            item = items[0].json;
        }
        else if (dataMode === 'defineBelow') {
            item = this.getNodeParameter('columns.value', 0);
        }
        const columnMetaDataObject = getColumnMap(tableSchema);
        // where clause column
        const columnsToMatchOn = this.getNodeParameter('columns.matchingColumns', 0);
        const updateColumns = Object.keys(item).filter((column) => !columnsToMatchOn.includes(column));
        if (!updateColumns.length) {
            throw new NodeOperationError(this.getNode(), "Add values to update to the input item or set the 'Data Mode' to 'Define Below' to define the values to update.");
        }
        let query = `UPDATE ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)}`;
        let outputColumns = this.getNodeParameter('options.outputColumns', 0, []);
        if (outputColumns.includes('*'))
            outputColumns = Object.keys(columnMetaDataObject);
        query = getBindDefsForExecuteMany(this.getNode(), query, columnMetaDataObject, updateColumns, outputColumns, item, nodeOptions, 'update', columnsToMatchOn);
        const executeManyValues = [];
        const keysOrder = [...updateColumns, ...columnsToMatchOn];
        for (let i = 0; i < items.length; i++) {
            if (dataMode === 'autoMapInputData') {
                item = items[i].json;
            }
            else if (dataMode === 'defineBelow') {
                item = this.getNodeParameter('columns.value', i);
            }
            const result = [];
            for (const key of keysOrder) {
                const type = columnMetaDataObject[key].type;
                let value = item[key];
                value = getCompatibleValue(type, value);
                result.push(value);
            }
            executeManyValues.push(result);
        }
        queries.push({ query, executeManyValues, outputColumns });
    }
    else {
        const updateTableSchema = configureTableSchemaUpdater(this.getNode(), schema, table);
        for (let index = 0; index < items.length; index++) {
            schema = this.getNodeParameter('schema', index, undefined, {
                extractValue: true,
            });
            table = this.getNodeParameter('table', index, undefined, {
                extractValue: true,
            });
            const dataMode = this.getNodeParameter('columns.mappingMode', index);
            let item = {};
            if (dataMode === 'autoMapInputData') {
                item = items[index].json;
                // Column refresh is needed only for 'autoMapInputData'
                tableSchema = await updateTableSchema(pool, tableSchema, schema, table, index);
            }
            else if (dataMode === 'defineBelow') {
                item = this.getNodeParameter('columns.value', index);
            }
            // where clause column
            const columnsToMatchOn = this.getNodeParameter('columns.matchingColumns', index);
            const columnMetaDataObject = getColumnMap(tableSchema);
            const updateColumns = Object.keys(item).filter((column) => !columnsToMatchOn.includes(column));
            if (!updateColumns.length) {
                throw new NodeOperationError(this.getNode(), "Add values to update to the input item or set the 'Data Mode' to 'Define Below' to define the values to update.");
            }
            if (Object.keys(item).length === columnsToMatchOn.length) {
                // Only match column exists, nothing to update
                throw new NodeOperationError(this.getNode(), "Add values to update to the input item or set the 'Data Mode' to 'Define Below' to define the values to update.");
            }
            const bindParams = []; // bindParameters
            let [quotedColsArray, _replacements, posIndex] = getInBindParametersForExecute(updateColumns, columnMetaDataObject, item, 'update', bindParams);
            let query = `UPDATE ${quoteSqlIdentifier(schema)}.${quoteSqlIdentifier(table)} SET ${quotedColsArray.join(',')}`;
            if (columnsToMatchOn.length > 0) {
                [quotedColsArray, _replacements, posIndex] = getInBindParametersForExecute(columnsToMatchOn, columnMetaDataObject, item, 'update', bindParams, posIndex);
                const condition = quotedColsArray.join(' AND ');
                query += ` WHERE ${condition}`;
            }
            let outputColumns = this.getNodeParameter('options.outputColumns', index, []);
            if (outputColumns.includes('*'))
                outputColumns = Object.keys(columnMetaDataObject);
            if (outputColumns.length > 0) {
                const updatedQuery = getOutBindDefsForExecute(query, columnMetaDataObject, outputColumns, bindParams, posIndex);
                query = updatedQuery;
            }
            queries.push({ query, values: bindParams, outputColumns });
        }
    }
    return await runQueries(queries, items, nodeOptions);
}
//# sourceMappingURL=update.operation.js.map