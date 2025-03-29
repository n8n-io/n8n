import crypto from 'crypto';
import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import oracledb from 'oracledb';

import { OracleConnection } from './core/connection';

export class OracleDatabase implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Oracle Database with Parameterization ',
		name: 'oracleDatabaseWithParameterization',
		icon: 'file:oracle.svg',
		group: ['input'],
		version: 1,
		description: 'Upsert, get, add and update data in Oracle database',
		defaults: {
			name: 'Oracle Database',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'oracleCredentialsApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'SQL Statement',
				name: 'query',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				placeholder: 'SELECT id, name FROM product WHERE id < :param_name',
				required: true,
				description: 'The SQL query to execute',
			},
			{
				displayName: 'Parameters',
				name: 'params',
				placeholder: 'Add Parameter',
				type: 'fixedCollection',
				typeOptions: {
					multipleValueButtonText: 'Add another Parameter',
					multipleValues: true,
				},
				default: {},
				options: [
					{
						displayName: 'Values',
						name: 'values',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								placeholder: 'e.g. param_name',
								hint: 'Do not start with ":"',
								required: true,
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								placeholder: 'Example: 12345',
								required: true,
							},
							{
								displayName: 'Data Type',
								name: 'datatype',
								type: 'options',
								required: true,
								default: 'string',
								options: [
									{ name: 'String', value: 'string' },
									{ name: 'Number', value: 'number' },
								],
							},
							{
								displayName: 'Parse for IN Statement',
								name: 'parseInStatement',
								type: 'options',
								required: true,
								default: false,
								hint: 'If "Yes" the "Value" field should be a string of comma-separated values. i.e: 1,2,3 or str1,str2,str3',
								options: [
									{ name: 'No', value: false },
									{ name: 'Yes', value: true },
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		/*
    better not change prototype locally.. 
    if (typeof String.prototype.replaceAll === "undefined") {
      String.prototype.replaceAll = function (match, replace) {
        return this.replace(new RegExp(match, 'g'), () => replace);
      }
    } */

		const credentials = await this.getCredentials('oracleCredentials');
		const oracleCredentials = {
			user: String(credentials.user),
			password: String(credentials.password),
			connectionString: String(credentials.connectionString),
		};

		const db = new OracleConnection(oracleCredentials, Boolean(credentials.thinMode));
		const connection = await db.getConnection();

		let returnItems = [];

		try {
			//get query
			let query = this.getNodeParameter('query', 0) as string;

			//get list of param objects entered by user:
			const parameterIDataObjectList =
				((this.getNodeParameter('params', 0, {}) as IDataObject).values as Array<{
					name: string;
					value: string | number;
					datatype: string;
					parseInStatement: boolean;
				}>) || [];

			//convert parameterIDataObjectList to map of BindParameters that OracleDB wants
			const bindParameters: { [key: string]: oracledb.BindParameter } =
				parameterIDataObjectList.reduce(
					(result: { [key: string]: oracledb.BindParameter }, item) => {
						//set data type to be correct type
						let datatype: oracledb.DbType;
						if (item.datatype && item.datatype === 'number') {
							datatype = oracledb.NUMBER;
						} else {
							datatype = oracledb.STRING;
						}

						if (!item.parseInStatement) {
							//normal process.
							result[item.name] = {
								type: datatype,
								val:
									item.datatype && item.datatype === 'number'
										? Number(item.value)
										: String(item.value),
							};
							return result;
						} else {
							//in this else block, we make it possible to use a parameter for an IN statement

							const valList = item.value.toString().split(',');
							let generatedSqlString = '(';
							for (let i = 0; i < valList.length; i++) {
								//generate unique parameter names for each item in list
								const uniqueId: string = crypto.randomUUID().replaceAll('-', '_'); //dashes don't work in parameter names.
								const newParamName = item.name + uniqueId;

								//add new param to param list
								result[newParamName] = {
									type: datatype,
									val:
										item.datatype && item.datatype === 'number'
											? Number(valList[i])
											: String(valList[i]),
								};

								//create sql sting for list with new param names
								generatedSqlString += `:${newParamName},`;
							}

							generatedSqlString = generatedSqlString.slice(0, -1) + ')'; //replace trailing comma with closing parenthesis.

							//replace all occurrences of original parameter name with new generated sql
							query = query.replaceAll(':' + item.name, generatedSqlString);

							return result;
						}
					},
					{},
				);

			//execute query
			const result = await connection.execute(query, bindParameters, {
				outFormat: oracledb.OUT_FORMAT_OBJECT,
				autoCommit: true,
			});

			returnItems = this.helpers.returnJsonArray(result as unknown as IDataObject[]);
		} catch (error: unknown) {
			if (error instanceof Error) {
				throw new NodeOperationError(this.getNode(), error.message);
			}
			throw new NodeOperationError(this.getNode(), String(error));
		} finally {
			if (connection) {
				try {
					await connection.close();
				} catch (error) {
					console.error(`OracleDB: Failed to close the database connection: ${error}`);
				}
			}
		}

		return await this.prepareOutputData(returnItems);
	}
}
