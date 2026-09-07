# FRAME SaaS 平台转型计划

日期：2026-09-07。状态：规划草案，尚未开始实现。

## 1. 已确认的产品方向

用户已确认：面向外部客户的多租户 SaaS；平台提供独立登录，并支持企业 SSO；拆为 `saas-portal`、`saas-auth`、`saas-sdk`、`saas-admin` 四个独立仓库。仓库名称与拆分方向已确认，以下职责细分是实施建议。

产品目标：客户能够注册、创建组织、邀请成员、开通应用、分配权限、使用应用并管理订阅；平台能够独立部署和运营，不要求客户拥有 DSP 或未交付的 Registry/Auth Service。

“全套依赖”指平台所需业务能力有真实实现和可部署依赖。密码学、身份协议、数据库和支付通道采用成熟组件或供应商，不自行实现底层协议。身份组件及支付供应商尚未选型。

## 2. 当前开发状态与证据

本次检查包含当前工作区的未提交实现，不能等同于已合并或已部署版本。Git 最近提交是 `ac30daa`，Phase 5 和部分 Phase 6 文件仍未提交。

| 原阶段 | 当前结论 | 证据与限制 |
| --- | --- | --- |
| Phase 1–2：代理与 Registry 运行时 | 已有实现和交接文档 | `apps/portal/proxy.ts`、`packages/registry-cache`；轮询、ETag、最后有效路由和冷启动就绪机制；本次未重跑集群演练 |
| Phase 3：Shell、主题、偏好 | 已有实现 | `packages/shell`、`packages/theme`、Portal PostgreSQL 迁移；偏好模型仍以 user_id 为范围 |
| Phase 4：身份、权限导航 | 已有客户端集成 | `packages/auth`；真实身份服务不是本仓库交付物，默认连接 localhost:3200 fixture |
| Phase 5：Admin 应用接入 | 第一条闭环已实现，未完成生产化 | 创建 inactive App → 配置角色 → 检查 → READY → 手动激活；`apps/portal/lib/admin/service.ts` 使用进程内 Map |
| Phase 6：开发者工具 | 部分已实现 | SDK、FastAPI middleware、manifest、contract CLI、create-frame-app 和 example-app 已存在；不代表外部团队接入已验收 |
| Phase 7–8：接入验收与生产门槛 | 未确认完成 | 有测试和演练脚本，仍需真实依赖、两副本、故障恢复和容量验证 |

本次 `npm test`：Node 73 项通过、1 项 PostgreSQL 集成测试因未配置数据库跳过；Python 4 项通过；全部 workspace 的 `npm run typecheck` 通过。本次没有生产部署、浏览器验收或容量测试。

现有 `tools/registry-fixture/server.mjs` 同时模拟登录、当前用户、权限、Registry、角色管理和运行状态；不能作为生产服务。仓库未发现完整的组织、租户隔离、邀请、订阅和审计业务实现。外部是否已有服务部署尚未核实。

## 3. 必须调整的原决策

原 PRD 与 final-scope 明确排除多租户、外部 SaaS 和完整审计；它们应保留为旧版本历史。进入实施时发布 SaaS PRD v2，并通过新 ADR 明确替代相关约束，不能同时把两套范围视为有效。

- DSP 从必需依赖变为可选企业身份适配器；平台用户 ID 替代 employee_id 作为主身份。
- 重新设计会话、退出、撤销、过期和 SSO 组织绑定，不直接继承浏览器可读 DSP Cookie 和 30 分钟权限撤销延迟。
- 平台管理员、组织管理员与应用角色分离。
- App 定义、运行部署和租户开通分离，避免全局 active 被误用为客户开通状态。
- Registry 属于 saas-admin，身份与授权属于 saas-auth；通过版本化 API 协作，各自管理数据库迁移。
- 原 standalone 本地测试的角色假设严格限制在开发环境，生产应用始终验证租户与权限。
- 原偏好库边界需补充身份迁移及组织级偏好；新业务表不混入原用户偏好模块。

保留：Portal 入口、代理、独立应用发布、Shell、浏览器安全目录与服务端路由分离、应用契约工具、失败不激活原则。

## 4. 目标架构与交付边界

采用四个独立 Git 仓库，各自构建、测试和发布。一个仓库可以交付多个进程；saas-sdk 交付版本化软件包，不部署为在线服务。

| 仓库 | 职责 | 数据所有权 | 部署产物 |
| --- | --- | --- | --- |
| saas-portal | 客户入口、应用列表、组织切换、用户设置、导航聚合、应用代理、浏览器会话 BFF | 用户及组织范围偏好；BFF 会话引用按最终会话方案管理 | Portal Web/BFF 与代理 |
| saas-auth | 注册登录、验证找回、MFA、SSO、身份、组织、成员邀请、角色定义/分配及权限判断 | User、ExternalIdentity、Organization、Membership、Invitation、Session、RoleDefinition、RoleAssignment、SSO 配置 | Auth API、登录页面、身份相关异步任务 |
| saas-sdk | Shell/UI/theme、前后端 SDK、FastAPI 中间件、manifest、契约 CLI、脚手架及示例 | 无生产业务数据库 | npm/Python 软件包、CLI、示例应用 |
| saas-admin | 管理控制台及管理后台、Registry、应用部署元数据、租户开通、订阅权益、接入工作流、运行检查及运营审计查询 | AppDefinition、AppDeployment、TenantAppInstallation、Plan、Subscription、Entitlement、OnboardingWorkflow | Admin Web、Control API、worker |

### 管理体验与事实归属

saas-admin 包含平台运维和客户组织管理员两类管理视图，分别验证权限。组织成员管理 UI 可以在 Admin 中，但创建组织、邀请、成员关系及角色的事实只由 Auth API 写入。Portal 提供入口跳转，避免复制管理业务。

客户注册创建组织由 Auth 完成；Admin 消费幂等组织事件初始化套餐和开通状态。组织未完成初始化时显示 provisioning，不默认授予应用访问。停用/删除组织由可恢复工作流协调；Auth 先拒绝相关授权，Admin 再完成资源与订阅处理。

Auth 负责“用户在该组织具有什么角色”；Admin 负责“该组织是否开通且拥有应用权益”。Portal 与应用后端组合两者判断访问。SDK 提供统一调用封装，但服务端才是授权边界。关键操作读取有效状态或采用明确的短时效/撤销机制，不能只靠前端缓存。

### 跨仓库依赖与契约

- Portal → Auth API：身份、组织、成员权限；Portal → Admin API：导航目录、路由、开通与权益。
- Admin → Auth API：管理操作授权、角色管理；Auth 的登录与身份核心不反向依赖 Admin 可用性。
- 组织生命周期通过 Auth outbox 事件交给 Admin；接入流程由 Admin 编排 Registry 与 Auth 角色 API，负责持久幂等、失败重试和未完成不激活。
- Portal、Admin 和业务 App 消费 SDK 发布包，不跨仓库直接引用源码。Auth 可使用 SDK 中无 UI 依赖的契约工具，不能依赖 Portal/Admin 运行时代码。
- OpenAPI/事件 schema 由提供 API 的 Auth/Admin 仓库维护；SDK 根据已发布契约生成或实现客户端。只共享契约，不共享数据库实体和 repository。
- 服务调用验证服务身份、作用域及必要的最终用户/租户上下文；浏览器传入的用户 ID、organization_id 或管理员标记不能成为可信依据。
- 各服务拥有数据库及迁移，可初期共用 PostgreSQL 实例，但使用独立数据库和账号，禁止跨库直接读写。跨服务 ID 无数据库外键，通过 API、事件及对账保证一致性。
- 每个服务写自己的事务 outbox 和审计事实；Admin 汇聚审计用于查询，不把远程日志写入作为业务事务成功的前提。

### 依赖与运维归属

Auth 管理身份组件及验证/邀请邮件任务；Admin 管理应用检查、接入重试、订阅 webhook 和权益对账任务。首版各自使用 PostgreSQL 持久任务和租约。密码学、身份协议、邮件和支付通道使用成熟组件/适配器，具体供应商在 S0 选定。

每个仓库维护自己的 Dockerfile、迁移、CI 和部署文档。首版跨仓库联调入口放在 saas-admin 的 integration 目录，用固定镜像版本启动 Portal/Auth/Admin、数据库和测试邮件服务；SDK 示例应用用于端到端验收。生产密钥不进入 SDK、镜像或 Git。对象存储按实际上传/导出需求增加。

### 现有代码迁移映射

| 当前路径 | 目标仓库 | 迁移说明 |
| --- | --- | --- |
| apps/portal（除管理功能）、packages/registry-cache | saas-portal | 保留入口、代理、偏好及路由缓存；迁移多租户契约 |
| apps/portal/app/admin、app/api/admin、lib/admin | saas-admin | 移出管理 UI/API 和编排；用持久 workflow 替换 Map |
| packages/auth | saas-sdk | 现有代码是 Auth 客户端，不是 Auth 服务；改造成支持新身份协议的 SDK |
| packages/sdk、shell、ui、theme、next-config、manifest-schema、contract-cli、fastapi-auth-sdk | saas-sdk | 可采用仓库内多包结构，分别发布；保持包间无循环依赖 |
| tools/create-frame-app、apps/example-app、演示 App 与 packages/spike-app | saas-sdk | 脚手架、示例和协议测试夹具；Portal CI 消费固定版本的示例镜像 |
| tools/registry-fixture | saas-sdk 测试工具 | 仅保留契约模拟与故障注入，不迁为生产 Auth/Registry |
| 新身份/组织/权限服务 | saas-auth | 需要新实现，现有 auth 包不能直接替代 |
| 新 Registry/开通/订阅服务 | saas-admin | 按现有契约与新租户模型实现 |
| infra 与 tools/k8s-demo | 按所属服务拆分 | 服务配置归属服务仓库；全链路演练入口归 Admin integration |

现有包名暂时保留 @frame/*，避免把仓库拆分与包改名混成一次破坏性迁移；对外品牌和包 scope 在 S0 决定。

## 5. 数据模型与隔离规则

核心实体：User、ExternalIdentity、Organization、Membership、Invitation、Session、AppDefinition、AppDeployment、TenantAppInstallation、RoleDefinition、RoleAssignment、Plan、Subscription、Entitlement、OnboardingWorkflow、Job、OutboxEvent、AuditEvent。

- 一个 User 可加入多个 Organization；外部身份以 issuer + subject 唯一映射，不能仅凭相同邮箱自动合并 SSO 身份。
- AppDefinition 是平台应用目录；Deployment 对应版本、环境及服务端 target；Installation 表示组织开通及其配置。
- 导航由部署可用状态、组织开通、套餐权益、当前成员角色共同决定，再应用个人隐藏偏好。
- 租户业务数据带 organization_id，唯一键、外键、查询、缓存键、任务和审计都包含适当租户范围。
- 请求中的组织 ID 只是选择条件，必须由服务端验证会话、成员关系与资源归属；后台任务使用受限服务身份。
- 数据库行级隔离作为第二道边界；连接池和后台任务均需测试上下文重置，不使用绕过隔离的日常运行账号。
- App 后端同样执行租户隔离。Portal 隐藏导航不能保护业务数据；非多租户 App 只能经过验证后按租户独立部署接入。
- 路由优先保留现有 basePath，组织选择须形成服务端验证的上下文；多标签页切换不能用一个可变全局 Cookie 导致串租户。URL/子域名及每请求上下文方案在 S0 固定。
- 全局主题可以继续用户级；hidden Apps 等依赖组织开通的偏好改为组织 + 用户范围。

## 6. 分阶段交付

阶段存在依赖，不按旧 Phase 5–8 顺序机械推进。

| 阶段 | 主要交付 | 验收门槛 |
| --- | --- | --- |
| S0 范围与架构冻结 | 四仓库边界与迁移清单、PRD v2、决策 ADR、身份/租户/路由契约、供应商评估 | 注册→组织→应用→授权→订阅的用户流程和服务所有权明确；当前工作区基线可追溯 |
| S1 可独立运行的服务底座 | 四仓库 CI/构建、Auth 最小服务身份与角色 API、Admin 真实 Registry/持久 workflow/worker、Portal 对接、SDK 发布及联调配置 | 停掉 fixture 仍能读写 Registry；进程重启及双副本下重复请求只产生一次逻辑接入，失败不激活 |
| S2 身份与组织闭环 | 独立注册/登录/验证/找回/退出、组织、成员、邀请、角色、会话撤销 | 两个组织分别邀请成员；撤销立即影响关键管理动作；伪造组织和跨组织访问被拒绝 |
| S3 租户应用平台 | 开通/停用、App 角色分配、租户导航、后端 SDK、真实健康/Shell/资源检查 | 同一示例业务 App 在两个组织的数据、角色、缓存及后台任务均隔离；所有生产链路不用 fixture |
| S4 企业 SSO | 优先标准 OIDC；企业 IdP 配置、域名/组织归属验证、身份关联、管理员恢复入口 | 一个真实测试 IdP 完成登录、退出与错误租户拒绝；是否首发 SAML 按客户需要决定 |
| S5 商业化闭环 | 套餐、试用、订阅、权益、席位、账单页面、取消/欠费策略及 webhook 对账 | 重复及乱序事件可恢复；席位并发不能超卖；取消与支付失败后的权益符合明确规则 |
| S6 发布与运营 | 审计查询、限流、可观测性、备份恢复、数据导出/删除流程、密钥轮换、CI/CD、HA 与容量测试 | 故障演练和恢复报告、跨租户测试矩阵、真实团队接入、试点租户验收通过 |

关键路径：S0 → S1 → S2 → S3 → S6 试点；企业 SSO 与订阅分别依赖稳定身份/组织模型及开通/权益模型。完整 SaaS 发布要求 S4、S5 也通过。安全隔离和审计基础从 S1/S2 开始实现，S6 集中验收。

### S0 首批可执行任务

1. 整理当前未提交改动，记录基线测试与尚未验收项，不覆盖已有实现。
2. 输出 PRD v2：客户、组织、角色、开通、订阅与管理范围。
3. 输出 ADR：四仓库职责与数据所有权、独立发布、身份与会话、租户隔离、路由上下文、Registry/Installation 分层、跨服务工作流持久化。
4. 身份组件评估：独立登录、OIDC/SAML、账号恢复、导出迁移、自托管/托管、许可与部署地区；再固定选型。
5. 定义 API v2 和 tenant-aware SDK 契约；保持旧 DSP 接口为有期限的适配层。
6. 画出数据库迁移与回滚方案，制定跨租户反例测试及 S1 工单。

### S1 第一条技术闭环

真实 Registry 持久化 → 创建 inactive 应用 → 持久角色定义 → worker 检查 → READY → 激活 → Portal 拉取新路由。开始就建立组织及作用域字段，避免 S2 再重建所有业务键。以受控 bootstrap 管理员接通服务认证，S2 换成完整用户/组织授权。自动重试不能持久保存浏览器用户 token；执行服务身份及发起者权限复核规则需明确。

## 7. 迁移与验收策略

### 仓库拆分顺序

1. 记录当前工作区基线，包括未提交文件；实际迁移时保留源仓库与迁移清单，避免遗漏未跟踪实现。
2. 先抽取 saas-sdk：建立包构建/发布、版本约束与示例测试，验证消费者使用打包产物而非源码路径。
3. 建立 saas-auth：先提供契约兼容的真实服务身份/角色能力，再交付完整登录、组织和 SSO。
4. 建立 saas-admin：迁入管理功能，实现 Registry、持久工作流和 Auth 集成。
5. 提取 saas-portal：替换 workspace 依赖为版本化 SDK、切换真实服务地址，移除旧管理业务实现。
6. 用固定 SDK 与服务镜像版本执行四仓库联调，覆盖两个租户及跨服务中断恢复；通过后再切换开发默认入口。

SDK 使用语义化版本；服务 API 和事件显式版本化。各仓库先独立 CI，再在 integration 配置记录经过验证的版本组合。契约变更先以兼容方式扩展服务，再升级 SDK/消费者，最后移除旧协议。数据库采用可回滚部署的扩展/迁移/收缩步骤，破坏性删列不与首轮切换同时进行。

本轮仅规划仓库拆分，没有创建远程仓库、移动源码或发布软件包。实际迁移时再确定 Git 托管位置、可见性和历史保留方式。

### 数据与功能迁移

- 保留 fixture 作为测试故障注入工具，开发默认入口最终切换至真实本地服务。
- 用已知受信 issuer 的旧 employee_id 映射 User；旧数据迁入默认组织并验证归属，不直接按字符串碰撞合并。
- Registry/Auth 客户端通过适配接口逐个替换；控制接口版本，不让旧客户端静默忽略组织字段。
- 偏好与接入工作流迁移需要备份、校验与回滚；内存中的旧工作流不能视为可完整恢复数据，应与 Registry 对账。
- 每个阶段跑相应单元、契约、真实 PostgreSQL 集成及关键浏览器流程；发布时再运行完整代理协议、HA、负载和恢复矩阵。
- 跨租户覆盖：API、直接 App URL、业务资源 ID、邀请、角色提升、缓存、任务、导出、webhook 和组织切换。
- Registry 最后有效路由只保障路由可用，不能被当作授权缓存的失效策略。停租、撤权及订阅变化需要独立撤销与时效设计。

## 8. 待确认项与范围控制

已确认：外部多租户、独立登录与企业 SSO。

待 S0 确认：首批客户类型及部署地区；平台仅托管自有/审核过的 App 还是开放第三方开发者；应用是否都由平台运营；价格按组织/席位/应用中的何种维度；身份与支付提供方；首发是否需要 SAML；团队人数及时间预算。

暂定首版仅接入平台自有或审核过的可信应用。当前同域多 App 架构存在共享浏览器安全边界，不适合作为任意第三方代码沙箱。若目标是开放市场，需独立增加 origin 隔离、凭证边界、审核及应用供应链设计后再接入。

首版不包含：自建支付网络、通用应用部署 PaaS、任意第三方市场、复杂用量计费、多地区主动双活、完整品牌定制。后续根据客户需求立项。

目前不承诺日历工期。先完成 S0 与 S1 的工单拆解，再按团队配置、身份选型和实际吞吐估算。最近的可验收里程碑是“停止 fixture 后，真实服务仍能完成应用接入”；产品里程碑是“两个组织独立注册、邀请并使用同一应用，数据不互通”。
