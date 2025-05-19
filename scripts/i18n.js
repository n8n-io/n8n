const fs = require('fs');
const path = require('path');
// const { Translate } = require('@google-cloud/translate').v2;

// 配置路径
const EN_FILE_PATH = path.resolve(
	__dirname,
	'../packages/frontend/editor-ui/src/plugins/i18n/locales/en.json',
);
const ZH_CN_FILE_PATH = path.resolve(
	__dirname,
	'../packages/frontend/editor-ui/src/plugins/i18n/locales/zh-CN.json',
);

// 配置谷歌翻译API
// 请在运行前设置环境变量: GOOGLE_APPLICATION_CREDENTIALS 指向您的谷歌云服务账号JSON文件
// const translate = new Translate();

// 帮助函数：读取JSON文件
function readJsonFile(filePath) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(content);
	} catch (error) {
		console.error(`读取文件失败: ${filePath}`, error);
		process.exit(1);
	}
}

// 帮助函数：保存JSON文件
function saveJsonFile(filePath, data) {
	try {
		const content = JSON.stringify(data, null, '\t');
		fs.writeFileSync(filePath, content, 'utf8');
		console.log(`文件已保存: ${filePath}`);
	} catch (error) {
		console.error(`保存文件失败: ${filePath}`, error);
		process.exit(1);
	}
}

// 帮助函数：递归查找缺失的键
async function findMissingTranslations(enObj, zhObj, prefix = '', result = [], fullEnObj = null) {
	if (!fullEnObj) fullEnObj = enObj;

	for (const key in enObj) {
		const newPrefix = prefix ? `${prefix}.${key}` : key;

		if (typeof enObj[key] === 'object' && enObj[key] !== null) {
			// 如果中文对象中不存在该键，则创建一个空对象
			if (!zhObj[key]) {
				zhObj[key] = {};
			}

			// 递归检查嵌套对象
			await findMissingTranslations(enObj[key], zhObj[key], newPrefix, result, fullEnObj);
		} else {
			// 检查叶子节点是否缺失翻译
			if (zhObj[key] === undefined) {
				result.push({
					path: newPrefix,
					key,
					parentObj: zhObj,
					enValue: enObj[key],
				});
			}
		}
	}

	return result;
}

// 翻译文本
async function translateText(text, targetLanguage = 'zh-CN') {
	// try {
	// 	// 跳过包含占位符的文本的直接翻译
	// 	const containsPlaceholder = text.includes('{') && text.includes('}');

	// 	if (containsPlaceholder) {
	// 		// 对于包含占位符的文本，我们需要特殊处理
	// 		// 例如："Workflow | {count} Workflow | {count} Workflows"
	// 		// 先按 | 分割
	// 		const parts = text.split('|').map((part) => part.trim());

	// 		// 分别翻译每一部分，保留占位符
	// 		const translatedParts = await Promise.all(
	// 			parts.map(async (part) => {
	// 				// 提取占位符
	// 				const placeholders = [];
	// 				const cleanPart = part.replace(/\{[^}]+\}/g, (match) => {
	// 					placeholders.push(match);
	// 					return `PLACEHOLDER_${placeholders.length - 1}`;
	// 				});

	// 				// 翻译清理后的文本
	// 				const [translation] = await translate.translate(cleanPart, targetLanguage);

	// 				// 恢复占位符
	// 				let result = translation;
	// 				for (let i = 0; i < placeholders.length; i++) {
	// 					result = result.replace(`PLACEHOLDER_${i}`, placeholders[i]);
	// 				}

	// 				return result;
	// 			}),
	// 		);

	// 		// 重新组合翻译后的部分
	// 		return translatedParts.join(' | ');
	// 	} else {
	// 		// 直接翻译
	// 		const [translation] = await translate.translate(text, targetLanguage);
	// 		return translation;
	// 	}
	// } catch (error) {
	// 	console.error(`翻译失败: "${text}"`, error);
	// 	return text; // 如果翻译失败，返回原文
	// }
	return text;
}

// 主函数
async function main() {
	console.log('开始检查缺失的翻译...');

	// 读取英文和中文JSON文件
	const enData = readJsonFile(EN_FILE_PATH);
	const zhData = readJsonFile(ZH_CN_FILE_PATH);

	// 查找缺失的翻译
	const missingTranslations = await findMissingTranslations(enData, zhData);

	console.log(`发现 ${missingTranslations.length} 个缺失的翻译`);

	if (missingTranslations.length > 0) {
		console.log('开始翻译...');

		// 翻译并填充缺失的翻译
		let translatedCount = 0;

		for (const item of missingTranslations) {
			const { key, parentObj, enValue } = item;

			// 跳过非字符串值
			if (typeof enValue !== 'string') {
				console.log(`跳过非字符串值: ${item.path}`);
				continue;
			}

			// 翻译英文值
			try {
				const translatedValue = await translateText(enValue);
				parentObj[key] = translatedValue;
				translatedCount++;

				// 打印进度
				console.log(`[${translatedCount}/${missingTranslations.length}] 翻译: ${item.path}`);
				console.log(`  英文: ${enValue}`);
				console.log(`  中文: ${translatedValue}`);
				console.log('---');

				// 避免触发谷歌翻译API限制
				// await new Promise((resolve) => setTimeout(resolve, 200));
			} catch (error) {
				console.error(`翻译错误 (${item.path}): ${error.message}`);
			}
		}

		// 保存更新后的中文JSON文件
		saveJsonFile(ZH_CN_FILE_PATH, zhData);
		console.log(`完成! 已翻译并填充 ${translatedCount} 个缺失的翻译。`);
	} else {
		console.log('所有翻译都已完成，没有缺失的翻译。');
	}
}

// // 检查谷歌翻译API凭证
// if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
// 	console.warn('警告: 环境变量 GOOGLE_APPLICATION_CREDENTIALS 未设置。');
// 	console.warn('请设置此环境变量指向您的谷歌云服务账号凭证文件，例如:');
// 	console.warn('export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-project-credentials.json"');
// }

// 运行主函数
main().catch((error) => {
	console.error('程序执行出错:', error);
	process.exit(1);
});
