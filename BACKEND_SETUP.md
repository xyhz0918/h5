# H5 Supabase 后台数据配置说明

这个项目现在走“前端小请求 + 后端 API 转发到 Supabase”的方案。

用户玩 H5 时，页面会静默请求 `/api/track`；Vercel / Netlify 的后端函数再把数据写入 Supabase。这样数据库密钥不会进前端包，也不会因为后台慢而卡住 H5 流程。

## 1. 创建 Supabase 项目

1. 打开 Supabase，创建一个新项目。
2. 项目创建完成后，进入左侧 `SQL Editor`。
3. 打开本项目里的 `supabase/schema.sql`，复制全部 SQL。
4. 粘贴到 Supabase SQL Editor，点击运行。

成功标志：Supabase 的 `Table Editor` 里能看到 `h5_events` 表。

## 2. 找到 Supabase 环境变量

在 Supabase 项目里找到：

- `SUPABASE_URL`：项目 URL，例如 `https://xxxx.supabase.co`
- `SUPABASE_SECRET_KEY`：后端用的 Secret key。不要发到聊天里，也不要写进前端代码。

说明：Supabase 官方文档建议 Secret key 只放在后端组件里使用；这个项目就是放在 Vercel / Netlify Functions 里。

## 3. 配置 Vercel 环境变量

在 Vercel 项目 `zhyx45-h5` 里添加：

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_EVENTS_TABLE`：填 `h5_events`
- `ADMIN_PASSWORD`：你自己设置的后台登录密码

成功标志：Vercel 的 Environment Variables 里能看到这 4 个变量名。

## 4. 配置 Netlify 环境变量

在 Netlify 项目 `zhyx45` 里添加同样 4 个变量：

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_EVENTS_TABLE`
- `ADMIN_PASSWORD`

成功标志：Netlify 的 Environment variables 里能看到这 4 个变量名。

## 5. 重新部署并测试

配置环境变量后，重新部署 Vercel 和 Netlify。

成功标志：

- `https://www.zhyx45.xyz` 正常打开 H5。
- `https://www.zhyx45.xyz/admin` 能打开后台登录页。
- 输入 `ADMIN_PASSWORD` 后能进入后台。
- 玩一遍 H5 后，Supabase `h5_events` 表里出现事件数据。

## 6. 已有表升级访客识别字段

如果 `h5_events` 表已经建好，后面再升级后台访客识别，可以在 Supabase SQL Editor 里运行：

`supabase/add-visitor-id.sql`

这份 SQL 只做三件事：

- 给 `h5_events` 增加 `visitor_id` 字段。
- 给 `visitor_id` 增加查询索引。
- 预留一段可选回填 SQL；默认不回填旧数据，后台仍会从 `data.visitorId` 兜底读取。

成功标志：Supabase `Table Editor` 里能看到 `visitor_id` 列，后台不再提示“兼容模式识别访客”。

## 注意

- 不要把 `SUPABASE_SECRET_KEY` 和 `ADMIN_PASSWORD` 发到聊天里。
- 如果 Supabase 没配好，H5 仍然能玩，只是后台暂时收不到数据。
- 用户填写的早餐描述会进入数据库，不要引导用户填写手机号、姓名、地址等隐私信息。
