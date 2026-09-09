# SDK-02 验收记录

本地验证：2026-09-07；提交整理：2026-09-09。Issue：https://github.com/valeeraZ/saas-sdk/issues/2 。
工作分支：`codex/sdk-02-consumers-ci`，包含 SDK-01 提交 `774905e`。
固定基线：`8cdc9ae56381dcbde8b8d3c965a75a918897896c`。

## 本地验证

完整入口为 `npm ci`，清除本仓库 dist/.next/tsbuildinfo 后 `npm run verify`，再构建 wheel 并 `npm run test:wheel`。本机 Node 24.10.0、npm 11.6.1；源码/wheel 消费 Python 3.9.6，wheel 构建 Python 3.11.3。原始日志在 artifacts/sdk02-*.log，JSON 证据随 CI artifact 交付。

| 检查 | 结果 |
| --- | --- |
| Node / Python 单元测试 | 38 / 4 通过 |
| 共享包类型检查、四个示例路由类型生成、类型检查及生产构建 | 全通过 |
| npm pack / wheel | 10 个 tarball、1 个 wheel，独立安装通过 |
| 原始脚手架 | 安装后的 CLI 生成应用，独立模板安装、构建通过 |
| 全部 SDK 消费 | 37 个导出，严格声明检查，CSS/字体、指令、CLI 检查通过；无 SDK workspace 链接 |
| HTTP 运行 | Next production server 绑定 127.0.0.1 随机端口，模拟 Auth 提供测试身份；页面、probe 路由、健康端点通过 |
| basePath 资源 | /packed-demo/sdk-probe.svg 返回正确 SVG；HTML 中 9 个 /packed-demo/_next/static 资源返回 200 且 MIME 正确；错误前缀、缺失 SVG 返回 404（已认证请求） |
| 固定 Portal 消费 | SHA-256 校验冻结输入，旧 registry-cache 在临时目录打包，全部内部依赖从 tarball 安装；构建及 typecheck 通过 |
| Portal 实现一致性 | 仅隔离副本安装 manifest、tsconfig 基路径和 Next 自动声明适配；其余 Portal 文件构建后逐个哈希检查通过 |
| Python wheel 消费 | 全新 venv 中 site-packages 导入、四项测试通过 |
| 源仓库 | 工作树仍干净，HEAD 62ceff30b395376fb57bc1b2b14b4b6c702e006a 未变；抽取来源始终为固定 8cdc9ae 提交 |

## CI

`.github/workflows/validate.yml` 覆盖干净安装、Node/Python 测试、类型检查、四个示例、npm 打包、独立模板/HTTP 消费、原 Portal 消费、wheel 构建/安装。运行在 Ubuntu 24.04，固定 Node 24.10.0、npm 11.6.1、Python 3.11，固定官方 action commit。shell 显式 bash，日志 tee 管道失败会使步骤失败。

只允许 contents:read，无发布权限、无兄弟仓库 token。每次 main/codex 分支 push 或 PR 触发；20 分钟超时，失败也保存已有证据。10 个 tarball、wheel、校验和及日志保留 14 天。推送后以该提交的 [GitHub Actions 状态](https://github.com/valeeraZ/saas-sdk/actions/workflows/validate.yml) 为远程验收结果，本文件不预先声明远程通过。

私有通道与版本规则见 PACKAGE-STRATEGY.md，下一阶段差异见 TENANT-AWARE-SDK.md。仍保留 private=true，本次没有 npm/PyPI 公共发布、生产部署或身份协议切换。

## 已知边界

- HTTP 验证是真实 Next production server + 本地模拟 Auth，不是生产 Auth/SSO/Portal 联调。验证当前 standalone 模式；不宣称集成登录、组织切换或跨租户隔离通过。
- 基线根布局直接读取身份；匿名请求缺失资源时观察到 500。404/basePath 断言使用测试身份以单独验证路由。匿名登录/错误页体验属于后续身份集成，不在此次兼容抽取中修改。
- Portal 验收仅安装/构建/类型检查与源码一致性，不启动真实 Registry、PostgreSQL 或外部认证服务。
- 未进行浏览器交互/视觉 QA、生产数据库迁移、负载、集群或真实租户隔离验收。HTTP HTML/资源断言不等同于浏览器 hydration 验证。
- 不将冻结 Portal fixture 作为新的产品实现维护；新的上游基线需独立兼容评审。私有包 registry 的最终地址与凭据仍待后续决策，当前 CI artifact 是短期候选交付。
