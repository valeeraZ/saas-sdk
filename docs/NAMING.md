# Generic SaaS Platform 命名

用户已明确要求项目使用通用 SaaS Platform 命名，本次要求替代最初保留基线名称的约定。项目尚未发布，npm/Python 暂保留 0.1.0；不发布公共包，不提供旧名称兼容别名。

| 范围 | 当前名称 |
| --- | --- |
| npm 包 | @saas-platform/auth、sdk、shell、ui、theme、next-config、manifest-schema、contract-cli、spike-app |
| 脚手架 / 契约 CLI | create-saas-app / saas-contract |
| TypeScript 导出与类型 | Saas*；函数使用 saas* / withSaas* / parseSaas* 等名称 |
| 环境变量 / Cookie / HTTP header | SAAS_* / saas-*；保留既有 DSP 身份适配器语义 |
| API | /api/saas/health、/api/saas/session、/api/saas/me/preferences |
| 应用契约文件 | saas.manifest.json |
| Python distribution / module | saas-fastapi-auth / saas_fastapi_auth |

这是源接口与配置层面的不兼容重命名。消费者需同步升级包引用、函数/类型、环境变量、路径、manifest 和 Python import；不能混用两套命名。认证流程与权限判断逻辑未重新设计，不因此宣称真实身份服务或多租户联调通过。

固定 Portal 兼容夹具已应用相同的纯命名迁移，继续保留原始源 commit 作为来源证明，当前逐文件哈希针对迁移后的夹具。原始源仓库及其历史未修改。本仓库旧提交的历史保持完整，当前代码、文档、模板与产物使用通用名称。

验证命令：干净 npm ci 后 npm run verify；构建 Python wheel、npm run test:wheel、node scripts/artifact-report.mjs。覆盖 38 个 Node 测试、4 个 Python 测试、共享包/四个示例类型检查和构建、37 个打包导出、CLI、HTTP/basePath、规范化 Portal 夹具构建及独立 wheel 消费。结果见 artifacts/rename-*.log 和最新提交的 GitHub Actions；产物摘要见 artifacts/SHA256SUMS。

本地完整验证已通过：38 个 Node、4 个 Python 源码测试，全部类型检查与构建、37 个导出、9 个 HTTP 静态资源、规范化 Portal 兼容构建及 4 个独立 wheel 消费测试。
