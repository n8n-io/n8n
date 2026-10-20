export const copiedNativeModulesConfig = {
	target: {
		os: 'linux',
		cpu: ['x64', 'arm64'],
		libc: 'musl',
	},
	modules: [
		{
			packageName: '@napi-rs/canvas',
			bindings: ['@napi-rs/canvas-linux-x64-musl', '@napi-rs/canvas-linux-arm64-musl'],
		},
		{
			packageName: '@napi-rs/image',
			bindings: ['@napi-rs/image-linux-x64-musl', '@napi-rs/image-linux-arm64-musl'],
		},
	],
};

export const copiedNativePackageNames = new Set(
	copiedNativeModulesConfig.modules.map(({ packageName }) => packageName),
);

export const copiedNativeBindingNames = new Set(
	copiedNativeModulesConfig.modules.flatMap(({ bindings }) => bindings),
);
