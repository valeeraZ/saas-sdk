# 新 session 交接

工作目录：`/Users/sylvain/Work/saas-sdk`。
源仓库：`/Users/sylvain/Work/portal-multiapps`；固定基线 `8cdc9ae56381dcbde8b8d3c965a75a918897896c`，分支 `codex/saas-split-baseline`。
从基线读取源码，不能修改、删除或清理源仓库中的既有实现。采用复制抽取并记录路径映射，源 Git 历史保留在原私有仓库，通过 commit 链接追溯。

已确认：多租户 SaaS、独立登录、企业 SSO、四个独立仓库。职责以 README 和总体计划为准。此描述为拆分启动时状态；本仓库已执行 SDK-01，详见 SDK-01-VALIDATION.md。其他仓库状态未在此次任务中验收，不能当作服务已交付。

先阅读 EXECUTION.md 和 GitHub Issues；从第一个未完成且依赖已满足的 Issue 开始。创建 codex/ 前缀工作分支，完成真实验证后提交。当前包名统一为 @saas-platform/*；不要发布公共包或部署生产。不要重新设计其他仓库的事实所有权。

基线验证：Node 73 passed / 1 PostgreSQL integration skipped（未配置数据库）；Python 4 passed；所有 workspace typecheck passed。生产构建结果见 BASELINE.md。

当前需明确的后续决策：身份组件、会话/租户路由、私有包发布通道、首批客户与计费规则。SDK-01 的兼容抽取可以先执行，无需等待这些产品决策。

## SDK-01 后续交接

本地工作分支 `codex/sdk-01-extraction`。SDK 已抽取；逐文件来源见 MIGRATION.json，构建/消费验证见 SDK-01-VALIDATION.md。可从根目录 `npm ci && npm run verify` 重现 JS 验证。Python wheel 构建与隔离消费命令见 README。

下一项是 Issue #2：CI、原 Portal 隔离副本消费构建、静态资源 HTTP/basePath 验证、私有发布策略及 tenant-aware 差异。SDK-01 的基础 tarball 消费测试可复用，但不得据此将 SDK-02 或真实服务联调标记完成。未发布公共包，未部署，未修改源仓库；此后用户已批准通用命名迁移，接口名和路径不再与原始基线兼容，见 NAMING.md。

## SDK-02 交接（2026-09-09）

分支 `codex/sdk-02-consumers-ci` 包含 SDK-01 和 SDK-02。本地完整验证通过，详见 SDK-02-VALIDATION.md；远程运行结果见该分支 GitHub Actions。新增冻结 Portal 兼容夹具、HTTP/basePath 验证、CI、私有交付/版本规则与 tenant-aware 差异清单。

后续实现需要 Auth/Admin 服务契约及 Portal 租户路由 ADR。保持当前兼容协议，未经后续发布任务不移除 private=true 或发布公共软件包。匿名缺失路径的身份错误及真实服务/浏览器验收限制见 SDK-02 验收记录。

## 通用项目命名

用户要求去除原专有名称，使用 generic SaaS Platform。已同步更新包名、API 标识符、CLI、环境变量、路由、manifest、Python 模块和测试夹具。不要恢复旧名称或兼容别名。源仓库仍只读。当前验收以 NAMING.md 和最新提交 CI 为准。

## 2026-09-16 — tenant Next.js SDK / native Portal Proxy

分支 `codex/sdk-tenant-next-proxy` 增加兼容导出 tenant、tenant-react、tenant-server、tenant-next，新增 withSaasTenantNextConfig 和 `--routing tenant` 脚手架。先阅读 TENANT-NEXT-SDK.md。Next 应用保留完整租户路径；公共 JS/CSS/font 构建资源使用应用/构建命名空间，其余资源仍需授权。Next 组件使用 async getSaasTenant；不能 externalize 整个 SDK 或用裸 next start 跳过验签适配器。当前为私有 0.1.0 开发 tarball，消费时固定此提交的产物/锁文件，不代表已发布版本。Portal 配套改动在 #6；真实浏览器联调脚本与配置见 Portal TENANT-NEXT-VALIDATION.md。WebSocket、应用 Cookie、自动 Registry 资源投影和生产部署未交付。
