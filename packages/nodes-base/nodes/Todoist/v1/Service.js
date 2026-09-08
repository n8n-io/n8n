import { CloseHandler, CreateHandler, DeleteHandler, GetAllHandler, GetHandler, MoveHandler, ReopenHandler, SyncHandler, UpdateHandler, } from './OperationHandler';
export class TodoistService {
    async execute(ctx, operation, itemIndex) {
        return await this.handlers[operation].handleOperation(ctx, itemIndex);
    }
    handlers = {
        create: new CreateHandler(),
        close: new CloseHandler(),
        delete: new DeleteHandler(),
        get: new GetHandler(),
        getAll: new GetAllHandler(),
        reopen: new ReopenHandler(),
        update: new UpdateHandler(),
        move: new MoveHandler(),
        sync: new SyncHandler(),
    };
}
//# sourceMappingURL=Service.js.map