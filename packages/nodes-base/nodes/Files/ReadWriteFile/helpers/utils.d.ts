import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
export declare function errorMapper(this: IExecuteFunctions, error: Error, itemIndex: number, context?: IDataObject): NodeOperationError;
export declare function normalizeFileSelector(fileSelectorRaw: string): string;
export declare function escapeBracketsAndParens(fileSelector: string): string;
//# sourceMappingURL=utils.d.ts.map