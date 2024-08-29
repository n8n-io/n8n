import {
	Block,
	ClassDeclaration,
	ObjectLiteralExpression,
	Project,
	ScriptTarget,
	SourceFile,
	SyntaxKind,
} from 'ts-morph';

import prettier from 'prettier';

// const NODES_FOLDER_GLOBE = './packages/nodes-base/nodes/**/*.ts';
const NODES_FOLDER_GLOBE =
	'packages/nodes-base/nodes/Google/CloudStorage/GoogleCloudStorage.node.ts';
const TARGET_FILE = 'packages/nodes-base/nodes/generated-nodes-types.ts';

const project = new Project({
	compilerOptions: {
		target: ScriptTarget.ES2020,
	},
});

const nodesFiles = project.addSourceFilesAtPaths(NODES_FOLDER_GLOBE);
project.resolveSourceFileDependencies();

//-------------------------------------------------------------------------------
const getImports = (sourceFile: SourceFile) => {
	sourceFile.forEachChild((child) => {
		if (child.getKind() === SyntaxKind.ImportDeclaration) {
			const declaration = child.asKindOrThrow(SyntaxKind.ImportDeclaration);
			const importFile = declaration.getModuleSpecifierSourceFile();

			if (importFile) {
				const moduleSymbol = importFile.getSymbol();

				if (moduleSymbol) {
					const exportSymbols = moduleSymbol.getExports();
					exportSymbols.forEach((symbol) => {
						const value = symbol.getValueDeclaration();
						if (value && value.getKind() === SyntaxKind.VariableDeclaration) {
							const variable = value.asKindOrThrow(SyntaxKind.VariableDeclaration).getInitializer();
							if (!variable) return;
							console.log(variable.getText());
						}
					});
				}
			}
		}
	});
};

const getClasses = (sourceFiles: SourceFile[]) => {
	const returnData: ClassDeclaration[] = [];

	sourceFiles.forEach((file) => {
		const classes = file.getClasses();
		getImports(file);

		classes.forEach((declaration) => {
			declaration.getImplements().forEach((impl) => {
				if (impl.getText() === 'INodeType') {
					returnData.push(declaration);
				}
			});
		});
	});

	return returnData;
};

const getDescription = (declaration: ClassDeclaration): ObjectLiteralExpression => {
	const description = declaration.getProperty('description')?.getInitializerOrThrow();

	if (description && description.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return description;
	}

	const constructor = declaration.getConstructors()[0];
	if (!constructor) {
		throw new Error('Could not get description, no constructor found');
	}

	const body = constructor.getBody() as Block | undefined;
	if (!body) {
		throw new Error('Could not get description, no constructor body');
	}

	const statements = body.getStatements();
	for (const statement of statements) {
		if (statement.isKind(SyntaxKind.ExpressionStatement)) {
			const expression = statement.getExpression();
			if (expression.isKind(SyntaxKind.BinaryExpression)) {
				const value = expression.getRight();

				if (expression.getLeft().getText() === 'this.description') {
					if (value.isKind(SyntaxKind.ObjectLiteralExpression)) {
						return value;
					}

					throw new Error('Could not get description');
				}
			}
		}
	}

	throw new Error('Could not get description');
};

function convertObjectLiteralToJS(node: any): any {
	const returnData: any = {};

	node.getProperties().forEach((property: any) => {
		if (property.isKind(SyntaxKind.PropertyAssignment)) {
			const key = property.getName();
			const valueNode = property.getInitializer();
			const value = evaluateNode(valueNode);
			returnData[key] = value;
		}
	});

	return returnData;
}

function evaluateNode(node: any): any {
	if (node.isKind(SyntaxKind.StringLiteral)) {
		return node.getLiteralValue();
	} else if (node.isKind(SyntaxKind.NumericLiteral)) {
		return Number(node.getText());
	} else if (node.isKind(SyntaxKind.TrueKeyword)) {
		return true;
	} else if (node.isKind(SyntaxKind.FalseKeyword)) {
		return false;
	} else if (node.isKind(SyntaxKind.ObjectLiteralExpression)) {
		return convertObjectLiteralToJS(node);
	} else if (node.isKind(SyntaxKind.ArrayLiteralExpression)) {
		return node.getElements().map((element: any) => evaluateNode(element));
	}
	// Add more cases as needed for other types of literals
	return undefined;
}

const getProperties = (description: ObjectLiteralExpression): Record<string, any>[] => {
	const properties = description.getProperty('properties');

	if (properties && properties.isKind(SyntaxKind.PropertyAssignment)) {
		const propertiesValue = properties.getInitializer();

		if (propertiesValue && propertiesValue.isKind(SyntaxKind.ArrayLiteralExpression)) {
			return propertiesValue
				.getElements()
				.filter((element) => element.isKind(SyntaxKind.ObjectLiteralExpression))
				.map((node) => convertObjectLiteralToJS(node));
		}
	}

	return [];
};

// ----------------------------------------------------------------------------

const propInfo: string[] = [];
const classes = getClasses(nodesFiles);

classes.forEach((declaration) => {
	const description = getDescription(declaration);
	const propertyObjects = getProperties(description);

	propInfo.push(`const ${declaration.getName()}Type = ${JSON.stringify(propertyObjects)};`);
});

prettier
	.format(propInfo.join('\n'), {
		parser: 'typescript',
		useTabs: true,
		tabWidth: 2,
		singleQuote: true,
	})
	.then((formatedCode) => {
		const targetFile = project.createSourceFile(TARGET_FILE, formatedCode, { overwrite: true });
		targetFile.saveSync();
	});

// END ------------------------------------------------------------------------------
console.log('Nodes types generated');
