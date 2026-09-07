# 拆分基线验证

日期：2026-09-07；源提交：8cdc9ae56381dcbde8b8d3c965a75a918897896c。

- Node v24.10.0，npm 11.6.1。
- npm test：Node 73 passed / 1 skipped；Python 4 passed。
- 跳过项：PostgreSQL 集成测试，未配置 PORTAL_DATABASE_URL。
- npm run typecheck：所有 workspace 通过。
- npm run build：所有五个 Next.js 应用通过。首次因沙箱禁止端口绑定失败，在正常权限下重跑退出码 0。
- 本次未执行：真实服务联调、浏览器 QA、数据库恢复、负载与双副本集群验收。
- 原源码历史保存在源私有仓库；新仓库从文档初始化，后续复制抽取需记录源路径和提交。

注意：当前包直接导出 TypeScript 源码且大多 private=true，没有独立发布验证。SDK 首项任务必须验证打包后的真实消费者，不可将 monorepo 内构建通过视为包发布完成。干净环境应在 typecheck 前生成 Next 路由类型或先构建，不能依赖基线目录中遗留的 .next 文件。
