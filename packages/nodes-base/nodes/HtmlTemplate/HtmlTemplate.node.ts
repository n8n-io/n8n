import {
	INodeExecutionData,
	IExecuteFunctions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class HtmlTemplate implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'HTML Template',
		name: 'htmlTemplate',
		icon: 'file:html.svg',
		group: ['transform'],
		version: 1,
		subtitle: 'Render HTML',
		description: 'Render an HTML template',
		defaults: {
			name: 'HTML Template',
		},
		inputs: ['main'],
		outputs: ['main'],
		parameterPane: 'wide',
		properties: [
			{
				displayName: 'HTML',
				name: 'html',
				typeOptions: {
					editor: 'htmlEditor',
				},
				type: 'string',
				default: placeholder,
				noDataExpression: true,
				description: 'HTML template to render',
			},
			{
				displayName:
					'<b>Tips</b>: Type ctrl+space for completions. Use <code>{{ }}</code> for expressions and <code>&lt;style&gt;</code> tags for CSS. More options in the triple-dot button. JS in <code>&lt;script&gt;</code> tags is included but not executed.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				let html = this.getNodeParameter('html', i) as string;

				for (const resolvable of getResolvables(html)) {
					html = html.replace(resolvable, this.evaluateExpression(resolvable, i) as any);
				}

				returnData.push(...makeEecutionData.call(this, html, i));
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push(...makeEecutionData.call(this, error.message, i));
					continue;
				}

				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}

function makeEecutionData(this: IExecuteFunctions, html: string, itemIndex: number) {
	return this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({ html }), {
		itemData: { item: itemIndex },
	});
}

function getResolvables(html: string) {
	const resolvables = [];

	for (let i = 0; i < html.length; i++) {
		if (html[i] === '{' && html[i + 1] === '{') {
			const startIndex = i;
			let endIndex = -1;

			i += 2;

			while (html[i] !== '}' && html[i + 1] !== '}') {
				i++;
			}

			i += 3;
			endIndex = i;

			resolvables.push(html.slice(startIndex, endIndex));
		}
	}

	return resolvables;
}

export const placeholder = `
<!DOCTYPE html>

<html>
<head>
	<meta charset="UTF-8">
	<title>Document</title>
</head>
<body>
	<div class="container">
		<h1>This is a Heading</h1>
		<p>This is a paragraph.</p>
		<div>
			Some more content!
		</div>
	</div>
</body>
</html>

<style>
.container {
  background-color: lightblue;
  text-align: center;
  padding: 16px;
  border-radius: 10px;
}

h1 {
  color: purple;
  font-size: 24px;
  font-weight: bold;
  padding: 8px;
}
</style>

<script>
console.log('Hello World!')
</script>
`.trim();
