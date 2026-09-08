import { NodeOperationError } from 'n8n-workflow';
import * as database from './database/Database.resource';
import { addExecutionHints } from '../../../../utils/utilities';
import { configurePostgres } from '../../transport';
import { configureQueryRunner } from '../helpers/utils';
export async function router() {
    let returnData = [];
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const credentials = await this.getCredentials('postgres');
    const options = this.getNodeParameter('options', 0, {});
    const node = this.getNode();
    options.nodeVersion = node.typeVersion;
    options.operation = operation;
    const { db, pgp } = await configurePostgres.call(this, credentials, options);
    const runQueries = configureQueryRunner.call(this, this.getNode(), this.continueOnFail(), pgp, db);
    const postgresNodeData = {
        resource,
        operation,
    };
    switch (postgresNodeData.resource) {
        case 'database':
            returnData = await database[postgresNodeData.operation].execute.call(this, runQueries, items, options, db, pgp);
            break;
        default:
            throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported!`);
    }
    addExecutionHints(this, node, items, operation, node.executeOnce);
    return [returnData];
}
//# sourceMappingURL=router.js.map