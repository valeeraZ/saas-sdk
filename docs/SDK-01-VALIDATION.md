# SDK-01 验收记录

> 此记录描述抽取阶段。随后已按用户要求进行通用命名迁移；当前名称、接口变化和重新验证见 NAMING.md。

日期：2026-09-07。Issue：https://github.com/valeeraZ/saas-sdk/issues/1 。
分支：`codex/sdk-01-extraction`；基线：`8cdc9ae56381dcbde8b8d3c965a75a918897896c`。

## 已执行

| 验证 | 结果 |
| --- | --- |
| npm ci --no-audit --no-fund | 成功，168 个安装包；日志 artifacts/clean-install.log |
| 删除目标 packages/*/dist、apps/*/.next、tsbuildinfo 后 npm run verify | 退出码 0；日志 artifacts/verification.log |
| Node 单元测试 | 38 passed，0 failed，0 skipped |
| Python 源码单元测试 | 4 passed |
| 九个共享包编译与类型检查、四个示例路由类型生成及类型检查 | 全通过，无遗留 .next 依赖 |
| example-app、local-alpha、local-beta、remote-gamma 生产构建 | 四个全部通过 |
| example-app 构建契约检查 | 通过，包含 public assets 与 basePath manifest 检查 |
| npm pack | 九个 @saas 包及 create-saas-app，共 10 个真实 tarball |
| 独立消费者 | 安装全部内部 tarball；37 个 JS 导出及声明检查通过；skipLibCheck=false、allowImportingTsExtensions=false |
| CLI/模板 | 安装后的 bin 符号链接启动；原始模板可独立安装/构建；增加 spike-app 路由及 Server Action 后构建、类型检查、契约检查通过 |
| CSS/资源 | 三个 CSS 导出可读取；主题变量、Manrope 字体、UI 与 spike-app utility CSS 存在于消费者构建；客户端/Server Action 指令保留 |
| Python wheel | saas_fastapi_auth-0.1.0-py3-none-any.whl 构建成功 |
| wheel 消费 | 独立 venv 安装（非 editable），验证模块位于 site-packages；复制测试到临时目录，4 passed |

Node v24.10.0、npm 11.6.1。最终源码测试及 wheel 消费使用 Python 3.9.6；wheel 构建环境使用 Python 3.11.3、build 1.3.0（PEP 517 隔离构建，构建后端按 pyproject.toml 解析）。验证机器为 macOS；未验证其他系统。

消费测试读取本仓库 artifacts 中的 tarball，在系统临时目录安装，不从 workspace 链接或源仓库 node_modules 解析。每个 @saas 包实路径均检查在消费者目录内。结果路径见 artifacts/packed-consumer.json；wheel 结果见 artifacts/wheel-consumer.json。脚本保留 JS 消费目录以便复查，Python 临时 venv 自动清理。

## 产物校验

通用命名迁移已重新生成产物；使用当前 artifacts/SHA256SUMS，不沿用抽取阶段的摘要。

## 范围与剩余限制

- 已按 SDK-01 完成独立抽取、构建、测试和打包。133 个迁移文件逐条记录源 blob 与 SHA-256，源仓库未修改；结束时源工作树 `git status --porcelain` 为空。
- 本次仅兼容抽取，不切换身份协议、事实所有权或租户模型。认证测试使用 fake authorizer/模拟响应，不代表真实认证、SSO、Portal 或 registry 联调通过。
- 未运行浏览器 QA、实际 HTTP 静态资源/basePath 验证、原 Portal 隔离消费构建、生产数据库、负载或集群验收。以上相关工作及 CI、私有发布策略、版本兼容规则、tenant-aware 差异继续由 SDK-02 处理。
- 未发布 npm/PyPI 公共包，未推送分支、关闭远程 Issue 或部署。npm 包仍 private=true；发布通道决定前使用本地 tarball。包为 ESM，React/Next peer 版本保持基线；不宣称 CommonJS、旧版 Node 或其他 peer 组合兼容。
- lockfile 记录独立仓库安装依赖；独立消费者及 Python 安装仍需可用的外部依赖源，并非离线环境验收。
