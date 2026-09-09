# 私有包交付与版本规则（SDK-02）

## 当前可执行方案

本阶段不运行 npm publish、twine upload，不移除 private=true。GitHub Actions 在私有 saas-sdk 仓库保存每个提交的 10 个 npm tarball、Python wheel、SHA256SUMS、运行时与验证记录，保留 14 天。以完整 commit SHA 和校验和识别候选产物；下载后先校验，再一次安装全部内部依赖，提交消费者 lockfile。CI artifact 是短期验证交付，不能充当永久生产包源。

长期交付建议：待通道确定后，由受保护的手动发布流程将“已验证的同一批字节”提升到组织控制的私有 npm registry 与私有 Python index/对象存储；不在发布步骤重新构建。发布身份只可写目标 namespace，消费者身份只读，通过 CI secret 注入，不提交令牌。registry 地址与身份供应商仍待决策，本任务不创建凭据、不启用发布。

保留 @saas-platform/* 时不能直接假定 GitHub Packages 的 `@valeeraZ` namespace 可用；其 npm namespace 对应拥有者，且只支持 scoped npm 包，当前无 scope 的 create-saas-app 也需要处理。若选择 GitHub Packages，须先确认 namespace 所有权或批准包名迁移；Python 通道单独确定。依据：[GitHub npm registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)。

发布流程约束：候选 commit → 干净安装/测试 → SDK/示例/消费者/原 Portal 构建 → wheel 安装测试 → 内容校验和 → 人工批准私有通道提升。失败候选不得提升；不可覆盖已有版本。回滚通过消费者 lockfile 回退已验证版本，不删除仍被使用的产物。

## 版本与兼容规则

- 当前验证集合：九个 @saas npm 包 0.1.0、create-saas-app 0.1.0、saas-fastapi-auth 0.1.0。内部 npm 依赖使用精确版本；消费者安装完整兼容集合并锁定完整依赖树。
- 初期 npm 共享包与脚手架采用统一版本发布集合，避免模板、Shell、SDK 漂移。Python 可独立版本，但发布记录必须标明支持的服务契约版本及已验证 JS 集合。
- 0.x 阶段：实现修复且不改变契约可升 patch；新增兼容 API 升 minor；破坏性变更也必须升 minor，并明确标注 breaking、迁移步骤及截止时间。不能把破坏性变更塞进 patch。达到 1.0 后，破坏性变更升 major。
- 当前支持 ESM、Node >=24.10.0 的构建/测试工具链、React/react-dom 19.2.0、Next 16.2.10；基线 Python 声明 >=3.9，CI 验证 3.11，SDK-01 另验证了 3.9.6 消费。未测试的新组合不能宣称兼容；升级 peer 需要完整消费者门禁。
- `schemaVersion`、服务 API 版本、Shell 版本独立于 npm 版本，不根据包版本自动推断协议。manifest 中的 shellVersion 范围只表达允许范围，不替代 lockfile 与实际兼容验证。
- 每次变更 exports、声明、CSS、CLI 模板、身份/会话协议或路由语义，都必须运行独立消费者和固定 Portal 基线门禁；下一服务契约增加后保留旧基线回归直至明确结束支持。

## CI 边界

验证 workflow 仅 contents:read，不使用发布令牌或额外私有仓库 token；固定 actions commit，checkout 不持久化凭据。推送 codex/**、main 或 PR 触发，产物只上传至本私有仓库 Actions。安全配置参考：[GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)。CI 通过不代表生产身份服务、SSO、数据库或多租户隔离已验收。
