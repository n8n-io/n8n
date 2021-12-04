import { IExecuteFunctions, ILoadOptionsFunctions, returnJsonArray } from "n8n-core";
import { IAllExecuteFunctions, IBinaryData, IContextObject, ICredentialDataDecryptedObject, IDataObject, IExecuteResponsePromiseData, IExecuteWorkflowInfo, IHttpRequestOptions, IN8nHttpFullResponse, IN8nHttpResponse, INode, INodeExecutionData, INodeParameters, IOAuth2Options, IWorkflowDataProxyData, IWorkflowMetadata, NodeParameterValue, WorkflowExecuteMode } from "n8n-workflow";
import { OptionsWithUri, OptionsWithUrl } from "request";
import { RequestPromiseOptions } from "request-promise-native";

export enum HELPER_TYPE {
    httpRequest = "httpRequest",
    request = "request",
    prepareBinaryData = "prepareBinaryData",
    requestOAuth2 = "requestOAuth2",
    requestOAuth1 = "requestOAuth1",
    getBinaryDataBuffer = "getBinaryDataBuffer",
}

export class LoadOptionsFunctionsStub implements ILoadOptionsFunctions, IExecuteFunctions {
    private nodeParameters: INodeParameters = {};
    private credentials: Map<string, ICredentialDataDecryptedObject>;
    public constructor(credentials: Map<string, ICredentialDataDecryptedObject>, nodeParameters: INodeParameters) {
        this.credentials = credentials;
        this.nodeParameters = nodeParameters;
    }
    public setHelper(key: HELPER_TYPE, helper:
        ((requestOptions: IHttpRequestOptions) => Promise<any>) &
        ((uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>) &
        ((binaryData: Buffer, filePath?: string, mimeType?: string) => Promise<IBinaryData>) &
        ((itemIndex: number, propertyName: string) => Promise<Buffer>) &
        ((this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | RequestPromiseOptions, oAuth2Options?: IOAuth2Options) => Promise<any>) &
        ((this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | RequestPromiseOptions) => Promise<any>)) {
            this.helpers[key] = helper;
    }
    public continueOnFail(): boolean {
        throw new Error("Method not implemented.");
    }
    public evaluateExpression(expression: string, itemIndex: number): INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[] {
        throw new Error("Method not implemented.");
    }
    public executeWorkflow(workflowInfo: IExecuteWorkflowInfo, inputData?: INodeExecutionData[]): Promise<any> {
        throw new Error("Method not implemented.");
    }
    public getContext(type: string): IContextObject {
        throw new Error("Method not implemented.");
    }
    public getInputData(inputIndex?: number, inputName?: string): INodeExecutionData[] {
        throw new Error("Method not implemented.");
    }
    public getMode(): WorkflowExecuteMode {
        throw new Error("Method not implemented.");
    }
    public getWorkflowDataProxy(itemIndex: number): IWorkflowDataProxyData {
        throw new Error("Method not implemented.");
    }
    public getWorkflowStaticData(type: string): IDataObject {
        throw new Error("Method not implemented.");
    }
    public getWorkflow(): IWorkflowMetadata {
        throw new Error("Method not implemented.");
    }
    public prepareOutputData(outputData: INodeExecutionData[], outputIndex?: number): Promise<INodeExecutionData[][]> {
        throw new Error("Method not implemented.");
    }
    public putExecutionToWait(waitTill: Date): Promise<void> {
        throw new Error("Method not implemented.");
    }
    public sendMessageToUI(message: any): void {
        throw new Error("Method not implemented.");
    }
    public sendResponse(response: IExecuteResponsePromiseData): void {
        throw new Error("Method not implemented.");
    }
    public async getCredentials(type: string): Promise<ICredentialDataDecryptedObject | undefined> {
        return this.credentials.get(type);
    }
    public getNode(): INode {
        throw new Error("Method not implemented.");
    }
    public getNodeParameter(parameterName: string, fallbackValue?: any): object | INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[] {
        return this.nodeParameters[parameterName];
    }
    public getCurrentNodeParameter(parameterName: string): object | INodeParameters | NodeParameterValue | NodeParameterValue[] | INodeParameters[] {
        throw new Error("Method not implemented.");
    }
    public getCurrentNodeParameters(): INodeParameters | undefined {
        return this.nodeParameters;
    }
    public getTimezone(): string {
        throw new Error("Method not implemented.");
    }
    public getRestApiUrl(): string {
        throw new Error("Method not implemented.");
    }
    public helpers: {
        httpRequest(requestOptions: IHttpRequestOptions): Promise<any>;
        prepareBinaryData(binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData>;
        getBinaryDataBuffer(itemIndex: number, propertyName: string): Promise<Buffer>;
        request: (uriOrObject: string | IDataObject | any, options?: IDataObject) => Promise<any>;
        requestOAuth2: (this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUri | RequestPromiseOptions, oAuth2Options?: IOAuth2Options) => Promise<any>;
        requestOAuth1: (this: IAllExecuteFunctions, credentialsType: string, requestOptions: OptionsWithUrl | RequestPromiseOptions) => Promise<any>;
        returnJsonArray: (jsonData: IDataObject | IDataObject[]) => INodeExecutionData[];
    } = {
        httpRequest: async (requestOptions: IHttpRequestOptions): Promise<any> => {
            throw new Error("Method not implemented.");
        },
        prepareBinaryData: async (binaryData: Buffer, filePath?: string, mimeType?: string): Promise<IBinaryData> => {
            throw new Error("Method not implemented.");
        },
        getBinaryDataBuffer: async (itemIndex: number, propertyName: string): Promise<Buffer> => {
            throw new Error("Method not implemented.");
        },
        request: async (uriOrObject: string | IDataObject | any, options?: IDataObject): Promise<any> => {
            throw new Error("Method not implemented.");
        },
        requestOAuth2: async (credentialsType: string, requestOptions: OptionsWithUri | RequestPromiseOptions, oAuth2Options?: IOAuth2Options) => {
            throw new Error("Method not implemented.");
        },
        requestOAuth1: async (credentialsType: string, requestOptions: OptionsWithUri | RequestPromiseOptions) => {
            throw new Error("Method not implemented.");
        },
        returnJsonArray: returnJsonArray,
    };
}