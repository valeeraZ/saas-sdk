# 执行清单

## SDK-01 抽取现有共享包并建立独立构建

从固定基线复制 packages/auth、sdk、shell、ui、theme、next-config、manifest-schema、contract-cli、fastapi-auth-sdk、spike-app；tools/create-frame-app；apps/example-app、local-alpha、local-beta、remote-gamma；按测试需要带入 registry-fixture。保留 @frame/* 包名。

基线： https://github.com/valeeraZ/portal-multiapps/tree/8cdc9ae56381dcbde8b8d3c965a75a918897896c

## 验收标准

- [ ] 建立独立 package.json、lockfile、TypeScript 配置和包依赖图，不引用源仓库绝对路径或兄弟仓库源码
- [ ] 排除 node_modules、.next、Python 缓存、环境变量文件；记录迁移路径清单
- [ ] 干净安装后相关单元测试、类型检查和示例构建通过；Python 测试通过
- [ ] 提供实际 npm pack 产物及 Python wheel 构建；导出路径、CSS、类型声明、CLI shebang 和模板资源均可消费
- [ ] 本任务不切换生产身份协议，不发布公共 npm/PyPI 包

完成时提交实现、执行过的验证及剩余限制；不得把模拟服务验收写成真实服务验收。

## SDK-02 验证脱离 workspace 的消费者并建立 CI

依赖 SDK-01。使用打包产物验证独立消费者，而不是依赖 workspace 链接。

基线： https://github.com/valeeraZ/portal-multiapps/tree/8cdc9ae56381dcbde8b8d3c965a75a918897896c

## 验收标准

- [ ] 隔离临时目录安装打包后的全部内部依赖，确保不从源仓库 node_modules 解析
- [ ] 脚手架生成应用可安装、类型检查和构建，basePath 静态资源正确
- [ ] 在隔离副本中验证原 Portal 使用打包后的 SDK 构建通过，不修改基线 checkout
- [ ] CI 覆盖测试、类型检查、打包、示例与消费者构建；记录 Node/Python 版本
- [ ] 给出私有包发布策略、版本兼容规则和下一阶段 tenant-aware SDK 差异清单

完成时提交实现、执行过的验证及剩余限制；不得把模拟服务验收写成真实服务验收。

## GitHub Issues

- [SDK-01 抽取现有共享包并建立独立构建](https://github.com/valeeraZ/saas-sdk/issues/1)
- [SDK-02 验证脱离 workspace 的消费者并建立 CI](https://github.com/valeeraZ/saas-sdk/issues/2)
