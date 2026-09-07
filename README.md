# saas-sdk

共享 SDK、Shell/UI/theme、FastAPI 中间件、manifest、CLI、脚手架与示例。无生产数据库。

SDK-01 已从固定基线抽取，实现独立构建与本地打包；包名暂保留 @frame/*。npm 包保留 private=true，未发布 npm/PyPI 包。

## 安装与验证

Node >=24.10.0、npm 11.6.1；Python >=3.9。

```sh
npm ci
npm run verify
python3 -m venv .venv
.venv/bin/python -m pip install build==1.3.0
.venv/bin/python -m build --wheel --outdir artifacts packages/fastapi-auth-sdk
npm run test:wheel
```

`verify` 依次编译共享包、运行 Node/Python 测试、生成 Next 路由类型并 typecheck、构建四个示例、检查示例契约、npm pack，然后在临时目录安装全部 tarball，验证 CLI、所有导出/声明、模板构建及 CSS。隔离消费者保留在测试输出的临时目录便于复查。Python wheel 测试使用独立 venv，仅从安装产物导入模块。

`npm run build` 构建共享包及示例；`npm run typecheck` 可在没有 .next 的干净检出执行；`npm run pack` 将 10 个 tarball 及清单写入 artifacts。wheel 亦输出至 artifacts，产物不纳入 Git。未确定私有包通道前，消费者须一次安装所有所需内部 tarball，不能直接从公共 registry 安装 @frame/*。

- [迁移路径与依赖图](docs/MIGRATION.md)
- [验证结果及限制](docs/SDK-01-VALIDATION.md)
- [执行清单](docs/EXECUTION.md)
- [交接](docs/HANDOFF.md)
- [四仓库总体计划](docs/saas-platform-plan.md)

源代码基线：[8cdc9ae](https://github.com/valeeraZ/portal-multiapps/tree/8cdc9ae56381dcbde8b8d3c965a75a918897896c)。
