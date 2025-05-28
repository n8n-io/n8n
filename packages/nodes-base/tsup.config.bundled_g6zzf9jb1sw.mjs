// tsup.config.ts
import { defineConfig } from "tsup";
import glob from "fast-glob";
import { resolve } from "path";
import { readFile } from "fs/promises";
var __injected_dirname__ = "C:\\Users\\dober\\Documents\\n8n-gigachat-master\\packages\\nodes-base";
var packagesDir = resolve(__injected_dirname__, "..");
var aiNodesDir = resolve(packagesDir, "@n8n", "nodes-langchain");
var cliDir = resolve(packagesDir, "cli");
var externalFiles = [
  ...await glob("nodes/**/*.ts", { cwd: aiNodesDir, absolute: true }),
  ...await glob("test/integration/**/*.ts", { cwd: cliDir, absolute: true })
];
var externalFilesContents = externalFiles.map((filePath) => readFile(filePath, "utf-8"));
var externalPackageImports = (await Promise.all(externalFilesContents)).reduce(
  (acc, fileContents) => {
    const regex = /from\s+['"](n8n-nodes-base[^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(fileContents)) !== null) {
      acc.add(match[1]);
    }
    return acc;
  },
  /* @__PURE__ */ new Set()
);
var externalPackageDependencies = Array.from(externalPackageImports).map(
  (i) => i.replace(/^n8n-nodes-base\/(dist\/)?/, "") + ".ts"
);
var commonIgnoredFiles = ["!**/*.d.ts", "!**/*.test.ts"];
var tsup_config_default = defineConfig([
  {
    entry: [
      "{credentials,nodes,test,types,utils}/**/*.ts",
      ...commonIgnoredFiles,
      ...externalPackageDependencies.map((path) => `!${path}`)
    ],
    format: ["cjs"],
    dts: false,
    bundle: false,
    sourcemap: true,
    silent: true
  },
  {
    entry: [...externalPackageDependencies, ...commonIgnoredFiles],
    format: ["cjs"],
    dts: {
      compilerOptions: {
        composite: false
      }
    },
    bundle: false,
    sourcemap: true,
    silent: true
  }
]);
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiQzpcXFxcVXNlcnNcXFxcZG9iZXJcXFxcRG9jdW1lbnRzXFxcXG44bi1naWdhY2hhdC1tYXN0ZXJcXFxccGFja2FnZXNcXFxcbm9kZXMtYmFzZVxcXFx0c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJDOlxcXFxVc2Vyc1xcXFxkb2JlclxcXFxEb2N1bWVudHNcXFxcbjhuLWdpZ2FjaGF0LW1hc3RlclxcXFxwYWNrYWdlc1xcXFxub2Rlcy1iYXNlXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9DOi9Vc2Vycy9kb2Jlci9Eb2N1bWVudHMvbjhuLWdpZ2FjaGF0LW1hc3Rlci9wYWNrYWdlcy9ub2Rlcy1iYXNlL3RzdXAuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndHN1cCc7XHJcbmltcG9ydCBnbG9iIGZyb20gJ2Zhc3QtZ2xvYic7XHJcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tICdmcy9wcm9taXNlcyc7XHJcblxyXG5jb25zdCBwYWNrYWdlc0RpciA9IHJlc29sdmUoX19kaXJuYW1lLCAnLi4nKTtcclxuY29uc3QgYWlOb2Rlc0RpciA9IHJlc29sdmUocGFja2FnZXNEaXIsICdAbjhuJywgJ25vZGVzLWxhbmdjaGFpbicpO1xyXG5jb25zdCBjbGlEaXIgPSByZXNvbHZlKHBhY2thZ2VzRGlyLCAnY2xpJyk7XHJcblxyXG5jb25zdCBleHRlcm5hbEZpbGVzID0gW1xyXG5cdC4uLihhd2FpdCBnbG9iKCdub2Rlcy8qKi8qLnRzJywgeyBjd2Q6IGFpTm9kZXNEaXIsIGFic29sdXRlOiB0cnVlIH0pKSxcclxuXHQuLi4oYXdhaXQgZ2xvYigndGVzdC9pbnRlZ3JhdGlvbi8qKi8qLnRzJywgeyBjd2Q6IGNsaURpciwgYWJzb2x1dGU6IHRydWUgfSkpLFxyXG5dO1xyXG5cclxuY29uc3QgZXh0ZXJuYWxGaWxlc0NvbnRlbnRzID0gZXh0ZXJuYWxGaWxlcy5tYXAoKGZpbGVQYXRoKSA9PiByZWFkRmlsZShmaWxlUGF0aCwgJ3V0Zi04JykpO1xyXG5cclxuLy8gRmlsZXMgdXNlZCBpbiBvdGhlciBwYWNrYWdlc1xyXG5jb25zdCBleHRlcm5hbFBhY2thZ2VJbXBvcnRzID0gKGF3YWl0IFByb21pc2UuYWxsKGV4dGVybmFsRmlsZXNDb250ZW50cykpLnJlZHVjZShcclxuXHQoYWNjLCBmaWxlQ29udGVudHMpID0+IHtcclxuXHRcdGNvbnN0IHJlZ2V4ID0gL2Zyb21cXHMrWydcIl0objhuLW5vZGVzLWJhc2VbXidcIl0rKVsnXCJdL2c7XHJcblx0XHRsZXQgbWF0Y2g7XHJcblx0XHR3aGlsZSAoKG1hdGNoID0gcmVnZXguZXhlYyhmaWxlQ29udGVudHMpKSAhPT0gbnVsbCkge1xyXG5cdFx0XHRhY2MuYWRkKG1hdGNoWzFdKTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gYWNjO1xyXG5cdH0sXHJcblx0bmV3IFNldDxzdHJpbmc+KCksXHJcbik7XHJcblxyXG5jb25zdCBleHRlcm5hbFBhY2thZ2VEZXBlbmRlbmNpZXMgPSBBcnJheS5mcm9tKGV4dGVybmFsUGFja2FnZUltcG9ydHMpLm1hcChcclxuXHQoaSkgPT4gaS5yZXBsYWNlKC9ebjhuLW5vZGVzLWJhc2VcXC8oZGlzdFxcLyk/LywgJycpICsgJy50cycsXHJcbik7XHJcblxyXG5jb25zdCBjb21tb25JZ25vcmVkRmlsZXMgPSBbJyEqKi8qLmQudHMnLCAnISoqLyoudGVzdC50cyddO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKFtcclxuXHR7XHJcblx0XHRlbnRyeTogW1xyXG5cdFx0XHQne2NyZWRlbnRpYWxzLG5vZGVzLHRlc3QsdHlwZXMsdXRpbHN9LyoqLyoudHMnLFxyXG5cdFx0XHQuLi5jb21tb25JZ25vcmVkRmlsZXMsXHJcblx0XHRcdC4uLmV4dGVybmFsUGFja2FnZURlcGVuZGVuY2llcy5tYXAoKHBhdGgpID0+IGAhJHtwYXRofWApLFxyXG5cdFx0XSxcclxuXHRcdGZvcm1hdDogWydjanMnXSxcclxuXHRcdGR0czogZmFsc2UsXHJcblx0XHRidW5kbGU6IGZhbHNlLFxyXG5cdFx0c291cmNlbWFwOiB0cnVlLFxyXG5cdFx0c2lsZW50OiB0cnVlLFxyXG5cdH0sXHJcblx0e1xyXG5cdFx0ZW50cnk6IFsuLi5leHRlcm5hbFBhY2thZ2VEZXBlbmRlbmNpZXMsIC4uLmNvbW1vbklnbm9yZWRGaWxlc10sXHJcblx0XHRmb3JtYXQ6IFsnY2pzJ10sXHJcblx0XHRkdHM6IHtcclxuXHRcdFx0Y29tcGlsZXJPcHRpb25zOiB7XHJcblx0XHRcdFx0Y29tcG9zaXRlOiBmYWxzZSxcclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHRidW5kbGU6IGZhbHNlLFxyXG5cdFx0c291cmNlbWFwOiB0cnVlLFxyXG5cdFx0c2lsZW50OiB0cnVlLFxyXG5cdH0sXHJcbl0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQTRWLFNBQVMsb0JBQW9CO0FBQ3pYLE9BQU8sVUFBVTtBQUNqQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxnQkFBZ0I7QUFIOEYsSUFBTSx1QkFBdUI7QUFLcEosSUFBTSxjQUFjLFFBQVEsc0JBQVcsSUFBSTtBQUMzQyxJQUFNLGFBQWEsUUFBUSxhQUFhLFFBQVEsaUJBQWlCO0FBQ2pFLElBQU0sU0FBUyxRQUFRLGFBQWEsS0FBSztBQUV6QyxJQUFNLGdCQUFnQjtBQUFBLEVBQ3JCLEdBQUksTUFBTSxLQUFLLGlCQUFpQixFQUFFLEtBQUssWUFBWSxVQUFVLEtBQUssQ0FBQztBQUFBLEVBQ25FLEdBQUksTUFBTSxLQUFLLDRCQUE0QixFQUFFLEtBQUssUUFBUSxVQUFVLEtBQUssQ0FBQztBQUMzRTtBQUVBLElBQU0sd0JBQXdCLGNBQWMsSUFBSSxDQUFDLGFBQWEsU0FBUyxVQUFVLE9BQU8sQ0FBQztBQUd6RixJQUFNLDBCQUEwQixNQUFNLFFBQVEsSUFBSSxxQkFBcUIsR0FBRztBQUFBLEVBQ3pFLENBQUMsS0FBSyxpQkFBaUI7QUFDdEIsVUFBTSxRQUFRO0FBQ2QsUUFBSTtBQUNKLFlBQVEsUUFBUSxNQUFNLEtBQUssWUFBWSxPQUFPLE1BQU07QUFDbkQsVUFBSSxJQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQUEsSUFDakI7QUFFQSxXQUFPO0FBQUEsRUFDUjtBQUFBLEVBQ0Esb0JBQUksSUFBWTtBQUNqQjtBQUVBLElBQU0sOEJBQThCLE1BQU0sS0FBSyxzQkFBc0IsRUFBRTtBQUFBLEVBQ3RFLENBQUMsTUFBTSxFQUFFLFFBQVEsOEJBQThCLEVBQUUsSUFBSTtBQUN0RDtBQUVBLElBQU0scUJBQXFCLENBQUMsY0FBYyxlQUFlO0FBRXpELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCO0FBQUEsSUFDQyxPQUFPO0FBQUEsTUFDTjtBQUFBLE1BQ0EsR0FBRztBQUFBLE1BQ0gsR0FBRyw0QkFBNEIsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLEVBQUU7QUFBQSxJQUN4RDtBQUFBLElBQ0EsUUFBUSxDQUFDLEtBQUs7QUFBQSxJQUNkLEtBQUs7QUFBQSxJQUNMLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLFFBQVE7QUFBQSxFQUNUO0FBQUEsRUFDQTtBQUFBLElBQ0MsT0FBTyxDQUFDLEdBQUcsNkJBQTZCLEdBQUcsa0JBQWtCO0FBQUEsSUFDN0QsUUFBUSxDQUFDLEtBQUs7QUFBQSxJQUNkLEtBQUs7QUFBQSxNQUNKLGlCQUFpQjtBQUFBLFFBQ2hCLFdBQVc7QUFBQSxNQUNaO0FBQUEsSUFDRDtBQUFBLElBQ0EsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsUUFBUTtBQUFBLEVBQ1Q7QUFDRCxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
