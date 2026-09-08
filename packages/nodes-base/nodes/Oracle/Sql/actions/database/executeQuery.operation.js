import { getResolvables, updateDisplayOptions } from '@utils/utilities';
import { getBindParameters } from '../../helpers/utils';
import { optionsCollection } from '../common.descriptions';
const properties = [
    {
        displayName: 'Statement',
        name: 'query',
        type: 'string',
        default: '',
        placeholder: 'e.g. SELECT id, name FROM product WHERE quantity > :1 AND price <= :2',
        noDataExpression: true,
        required: true,
        description: "The SQL statement to execute. You can use n8n expressions and positional parameters like :1, :2, :3, or named parameters like :name, :ID, etc to refer to the 'Bind Variable Placeholder Values' set in options below.",
        typeOptions: {
            editor: 'sqlEditor',
            sqlDialect: 'OracleDB',
        },
        hint: 'Consider using bind parameters to prevent SQL injection attacks. Add them in the options below',
    },
    ...optionsCollection,
];
const displayOptions = {
    show: {
        resource: ['database'],
        operation: ['execute'],
    },
};
export const description = updateDisplayOptions(displayOptions, properties);
/**
 * Query execution function for this node.
 *
 * This method is called once for every execution of the node during a workflow run.
 * It receives input data from the previous node(s) and returns output data to the next node(s).
 *
 *
 * Returns:
 * - An array of `INodeExecutionData` objects containing JSON data and optionally binary data, PairedItem,...
 */
export async function execute(runQueries, items, nodeOptions, _pool) {
    const queries = [];
    for (let index = 0; index < items.length; index++) {
        let query = this.getNodeParameter('query', index);
        // Dynamically replaces placeholders ({{...}}) in SQL queries.
        // Ex: SELECT * FROM users WHERE name = '{{ $json["name"] }}'
        // to SELECT * FROM users WHERE name = 'Alice'
        for (const resolvable of getResolvables(query)) {
            query = query.replace(resolvable, this.evaluateExpression(resolvable, index));
        }
        let values = [];
        // get list of param objects entered by user
        const parameterIDataObjectList = this.getNodeParameter('options.params', index, {})
            .values || [];
        if (parameterIDataObjectList.length) {
            const { updatedQuery, bindParameters } = getBindParameters(query, parameterIDataObjectList, nodeOptions);
            query = updatedQuery;
            values = bindParameters;
        }
        queries.push({ query, values });
    }
    return await runQueries(queries, items, nodeOptions);
}
//# sourceMappingURL=executeQuery.operation.js.map