import { IExecuteFunctions } from "n8n-core";
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodePropertyTypes
} from "n8n-workflow";

import { sleepSeconds, sleepMinutes, sleepHours, sleepDays } from "sleepjs";

export class Pause implements INodeType {
	description: INodeTypeDescription = {
		displayName: "Pause",
		name: "Pause",
		icon: "fa:pause",
		group: ["organization"],
		version: 1,
		description: "Pause execution for given time",
		defaults: {
			name: "Pause",
			color: "#b0b0b0"
		},
		inputs: ["main"],
		outputs: ["main"],
		properties: [
			{
				displayName: "Seconds",
				name: "seconds",
				type: "number" as NodePropertyTypes,
				default: 1,
				placeholder: "",
				required: true,
				description: "Number of seconds to pause the execution."
			},
			{
				displayName: "Minutes",
				name: "minutes",
				type: "number" as NodePropertyTypes,
				default: 0,
				placeholder: "",
				required: true,
				description: "Number of minutes to pause the execution."
			},
			{
				displayName: "Hours",
				name: "hours",
				type: "number" as NodePropertyTypes,
				default: 0,
				placeholder: "",
				required: true,
				description: "Number of hours to pause the execution."
			},
			{
				displayName: "Days",
				name: "days",
				type: "number" as NodePropertyTypes,
				default: 0,
				placeholder: "",
				required: true,
				description: "Number of days to pause the execution."
			}
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const seconds = this.getNodeParameter("seconds", 0) as number;
		const minutes = this.getNodeParameter("minutes", 0) as number;
		const hours = this.getNodeParameter("hours", 0) as number;
		const days = this.getNodeParameter("days", 0) as number;
		await sleepSeconds(seconds);
		await sleepMinutes(minutes);
		await sleepHours(hours);
		await sleepDays(days);
		return this.prepareOutputData(items);
	}
}
