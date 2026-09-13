# SDK-01 迁移记录

源仓库固定提交：[8cdc9ae56381dcbde8b8d3c965a75a918897896c](https://github.com/valeeraZ/portal-multiapps/tree/8cdc9ae56381dcbde8b8d3c965a75a918897896c)。使用 `git archive <commit> <paths...>` 复制抽取；没有读取工作树源码作为迁移来源，没有变更源仓库。源 Git 历史继续保留于原私有仓库。

完整逐文件映射及基线 blob/SHA-256 见 [MIGRATION.json](MIGRATION.json)。通用命名迁移后，目标路径已更新；原始来源以 sourceGitBlob/sourceSha256 追溯，`modifiedDuringExtraction` 标识相对原始基线有变化的文件（包含后续命名迁移）。根 package.json 为 SDK 范围重建，package-lock.json 从基线锁文件裁剪并经 npm 重新解析；不包含 Portal、registry-cache 或其专属依赖。npm 补全了基线 lockfile 中缺失元数据的跨平台 SWC 可选包（仍为 16.2.10）；传递依赖 nanoid 由 3.3.16 重新解析为 3.3.18，其余已有带版本依赖保持基线版本。新增 scripts、构建配置及文档属于本仓库实现。

| 源路径 → 同名目标路径 | 用途 |
| --- | --- |
| packages/{auth,sdk,shell,ui,theme,next-config,manifest-schema,contract-cli,spike-app} | 九个 npm 共享包 |
| packages/fastapi-auth-sdk | Python ASGI/FastAPI 中间件 |
| tools/create-saas-app | 脚手架及完整模板 |
| apps/{example-app,local-alpha,local-beta,remote-gamma} | 四个示例 |
| tools/registry-fixture | 可选本地模拟 registry，未作真实服务联调验收 |
| tsconfig.json | 共享类型检查配置 |

排除 node_modules、.next、Python 缓存、环境变量文件和源仓库的 Portal 实现。构建输出、虚拟环境与 artifacts 被 Git 忽略。

## 内部依赖图

构建脚本从 package.json 推导拓扑顺序，缺失内部依赖或循环会立即失败。

| 包 | 内部直接依赖 |
| --- | --- |
| @saas-platform/auth | 无 |
| @saas-platform/contract-cli | @saas-platform/manifest-schema |
| @saas-platform/manifest-schema | 无 |
| @saas-platform/next-config | @saas-platform/manifest-schema |
| @saas-platform/sdk | @saas-platform/auth, @saas-platform/manifest-schema, @saas-platform/shell, @saas-platform/theme |
| @saas-platform/shell | @saas-platform/theme, @saas-platform/ui |
| @saas-platform/spike-app | @saas-platform/shell, @saas-platform/ui |
| @saas-platform/theme | 无 |
| @saas-platform/ui | @saas-platform/theme |

create-saas-app 无运行时依赖，模板声明 SDK 包依赖。四个示例在共享包编译后构建。Python 包独立构建，运行时依赖 httpx。

## 兼容适配

- 包名改为 @saas-platform/*，保留未发布的 0.1.0 版本；接口名称和路由已同步迁移，权限判断逻辑保持不变，npm 包继续 `private: true`。
- 九个共享包导出 dist 中 ESM JavaScript 和 .d.ts；UI 通配符 exports 与内部 #imports 指向编译产物。相对导入在 JS/声明中改为 .js。
- tsc 逐模块输出，保留 `use client`、`use server`；CSS、字体依赖和 shebang 随包交付。UI CSS 显式扫描已安装 UI/Shell/spike-app 的 dist，应用源码交由 Tailwind 默认项目扫描。
- 补齐 spike-app 类型检查与构建；构建剔除测试及 fixture 源码。
- 模板 tsconfig 自包含；修复 create-saas-app 通过 npm bin 符号链接启动时的入口判断。
- UI 的 react-dom 开发依赖固定为 19.2.0，避免宽范围选择与基线 React 不匹配的版本。
- Node 工具链要求 >=24.10.0（源码测试使用 Node 原生 TypeScript），npm 11.6.1；未声称更旧 Node 或 CommonJS 兼容。

独立包构建需先执行根目录 npm ci；构建后的 tarball 消费者无需本仓库 scripts、源码或 workspace 链接。未加入公共发布脚本。
