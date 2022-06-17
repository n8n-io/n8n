import {
	IDataObject,
	IExecuteFunctions
} from 'n8n-workflow';

export function getNodeParameterAsObject(this: IExecuteFunctions, parameterName: string, index: number ): IDataObject {
	const parameter = this.getNodeParameter(parameterName, index) as IDataObject | string;
	if(!parameter){
		return {};
	}
	if( typeof parameter === 'string'){
			return JSON.parse(parameter);
	}
	return parameter;
}
