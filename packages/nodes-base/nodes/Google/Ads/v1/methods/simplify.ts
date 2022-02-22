import {
	IDataObject,
} from 'n8n-workflow';

/**
 * Simplifies the output
 *
 * @export
 * @param IDataObject responseData
 * @returns IDataObject
 */
export function simplify(responseData: IDataObject, property = 'results'): IDataObject {
	if (Object.keys(responseData[property] as IDataObject).length !== 0) {
		// if responseData[property] is not empty
		return responseData[property] as IDataObject;
	} else {
		return responseData;
	}
}
