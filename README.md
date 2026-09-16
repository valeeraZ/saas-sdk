# saas-sdk

共享 SDK、Shell/UI/theme、FastAPI 中间件、manifest、CLI、脚手架与示例。无生产数据库。

SDK-01/02 已完成固定基线抽取、独立消费者验证与 CI；包名统一为 @saas-platform/*。npm 包保留 private=true，未发布 npm/PyPI 包。

## 安装与验证

Node >=24.10.0、npm 11.6.1；Python >=3.9。

```sh
npm ci
python3 -m venv .venv
source .venv/bin/activate
python -m pip install ./packages/fastapi-auth-sdk build==1.3.0
npm run verify
.venv/bin/python -m build --wheel --outdir artifacts packages/fastapi-auth-sdk
npm run test:wheel
```

`verify` 依次编译共享包、运行 Node/Python 测试、生成 Next 路由类型并 typecheck、构建四个示例、检查示例契约、npm pack，然后在临时目录安装全部 tarball，验证 CLI、所有导出/声明、模板构建、真实 HTTP/basePath 资源检查及 CSS，最后从冻结夹具验证原 Portal 安装 tarball 后构建。隔离消费者保留在测试输出的临时目录便于复查。Python wheel 测试使用独立 venv，仅从安装产物导入模块。

`npm run build` 构建共享包及示例；`npm run typecheck` 可在没有 .next 的干净检出执行；`npm run pack` 将 10 个 tarball 及清单写入 artifacts。wheel 亦输出至 artifacts，产物不纳入 Git。未确定私有包通道前，消费者须一次安装所有所需内部 tarball，不能直接从公共 registry 安装 @saas-platform/*。

- [迁移路径与依赖图](docs/MIGRATION.md)
- [SDK-01 验证结果](docs/SDK-01-VALIDATION.md)
- [SDK-02 验证结果及限制](docs/SDK-02-VALIDATION.md)
- [私有交付与版本规则](docs/PACKAGE-STRATEGY.md)
- [tenant-aware SDK 差异清单](docs/TENANT-AWARE-SDK.md)
- [执行清单](docs/EXECUTION.md)
- [交接](docs/HANDOFF.md)
- [四仓库总体计划](docs/saas-platform-plan.md)

源代码基线：[8cdc9ae](https://github.com/valeeraZ/portal-multiapps/tree/8cdc9ae56381dcbde8b8d3c965a75a918897896c)。

CI 在 main、codex/** 推送与 PR 上执行同一 `npm run verify`，然后构建/测试 wheel，保存提交级产物 14 天。workflow 固定 Node 24.10.0、npm 11.6.1、Python 3.11；仅需本仓库读取权限，不依赖兄弟仓库源码或凭据。`npm run test:portal` 单独运行 Portal 消费验证，`npm run test:packed` 单独运行模板/HTTP 验证，均需先 `npm run pack`。

当前命名与不兼容变更见 [NAMING.md](docs/NAMING.md)。所有包仍未发布，不保留旧名称别名。

租户感知 Next.js 接入已扩展到现有 SDK：路径/Link/router/fetch、服务端请求验签、Next.js 上下文与配置、`create-saas-app --routing tenant` 模板。协议、打包消费、真实服务验收和限制见 [Tenant Next SDK](docs/TENANT-NEXT-SDK.md)。
