# 下一阶段 tenant-aware SDK 差异清单

当前 0.1.0 仍兼容旧 DSP 协议，没有实现多租户隔离。下面是待服务契约确认后的工作清单，字段名称为设计候选，不是已发布 API。事实所有权沿用四仓库总体计划；SDK 不拥有业务数据库。

| 范围 | 当前行为 | 待实施差异 | 事实来源 / 必须验证 |
| --- | --- | --- | --- |
| auth 客户端 | DSP Cookie/Bearer、current-user、应用角色 | 独立登录会话、组织成员状态、组织范围角色；旧 DSP 显式兼容适配层 | Auth 发布的身份/成员/授权契约；过期、撤销、移出组织 fail closed |
| SDK server / FastAPI | 用户与应用角色上下文 | 经服务端验证的用户、组织和应用上下文；请求组织与会话/成员资格一致 | Auth 验证身份角色，Admin 验证开通/权益；组织伪造、停用、无权益拒绝 |
| SDK browser / React | 全局 App session/context | 明确组织切换状态、请求取消、清除旧组织缓存，服务端返回的新上下文再渲染 | 浏览器 organization_id/header 仅是请求参数，不能作为授权事实；并发切换不得显示旧组织数据 |
| Shell / 导航 | 当前用户应用列表与偏好 | 组织选择入口、组织范围导航/偏好键、provisioning/disabled 状态 | Portal 聚合 Auth + Admin；隐藏入口不替代后端校验 |
| Next config / 路由 | manifest 静态 basePath | 等待会话/租户路由 ADR，明确子域或路径语义与可信代理头 | Portal 路由契约；跨组织深链、重定向、静态资源及 Cookie 范围 |
| manifest / contract-cli | schemaVersion=1、应用角色、资源、Shell 范围 | 声明支持的 tenant 契约能力与版本，旧应用适配策略；不把租户实例塞入全局 AppDefinition | Admin 提供 AppDefinition/Deployment/Installation 契约；未知版本拒绝 |
| 缓存与重试 | 全局用户/应用上下文 | 缓存键至少包含身份、组织、应用、授权版本；限制权限数据 TTL；切换/撤销失效 | 401 与 403 明确区分；不对改变状态请求盲目重试，支持幂等键 |
| SSO / 会话 | 旧 DSP 续期 URL | 根据 Auth 契约处理续期、登出、SSO 重定向结果；SDK 不实现 IdP 或角色数据库 | Auth 拥有会话、SSO；验证重定向 allowlist、state、会话固定与跨组织复用 |
| 观测 | 基础异常 | 结构化错误码、trace/request ID 与必要租户标识；禁止 token/PII 出现在浏览器日志 | 提供方定义错误契约；日志泄漏和跨组织关联测试 |
| 模板 / 示例 / Python | 单组织假设 | 两组织示例及共享契约 fixture，TS/Python 行为对齐 | 相同用户不同组织、不同用户相同组织、撤销、服务不可用和并发组织切换矩阵 |

开始实现前需取得 Auth 身份/组织/会话 API、Admin Installation/Entitlement API、Portal 路由与偏好作用域 ADR。若这些契约未定，可先编写拒绝路径/缓存隔离测试和接口草案，不固化未批准的身份供应商或租户路由方案。

禁止让 SDK、Portal 或 Admin 复制 Auth 的组织成员和角色事实；禁止 SDK 把前端租户选择当作已验证授权。0.2 候选不得仅凭此清单宣称 tenant-aware，需要真实服务契约和跨租户集成测试。
