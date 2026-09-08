import { NodeOperationError } from 'n8n-workflow';
import * as block from './block/Block.resource';
import * as database from './database/Database.resource';
import * as databasePage from './databasePage/DatabasePage.resource';
import * as dataSource from './dataSource/DataSource.resource';
import * as page from './page/Page.resource';
import * as user from './user/User.resource';
const resources = {
    block,
    database,
    databasePage,
    dataSource,
    page,
    user,
};
export async function router() {
    const items = this.getInputData();
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    const resourceRouter = resources[resource];
    const execute = resourceRouter?.[operation];
    if (typeof execute !== 'function') {
        throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported for resource "${resource}"`);
    }
    return [await execute.call(this, items)];
}
//# sourceMappingURL=router.js.map