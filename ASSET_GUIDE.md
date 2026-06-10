# H5 图片素材整理说明

## 大白话用途

这批图已经从原目录 `E:\网站\豪士\images` 复制到项目内，并按 H5 开发时最常用的用途重新分类、重命名。之后做页面时可以直接从 `assets/images` 取图，不用再面对一堆 ChatGPT 默认文件名。

原素材没有被删除或改名；项目内保存的是副本。

## 成功标志

- `assets/images` 下能看到 7 个分类文件夹。
- `assets/manifest.json` 里能查到每张图的编号、用途、尺寸和原始文件名。
- `asset-review/contact-sheet.png` 能一眼预览全部 37 张素材。
- `assets/brand` 和 `assets/product/quinoa-toast` 下能看到新增的品牌与产品素材。
- `asset-review/brand-product-sheet.png` 能预览 Logo、包装图、产品图和二维码照片。

## 分类目录

| 分类 | 数量 | 用途 |
| --- | ---: | --- |
| `ui` | 2 | 按钮、标签、状态、底部导航、筛选控件等 UI 参考 |
| `screens` | 6 | 工单流程手机界面参考，可拆解为 H5 页面结构 |
| `badges` | 10 | 成就、身份、奖励、通关反馈 |
| `posters` | 2 | 分享海报、玩法流程总览 |
| `backgrounds` | 8 | 首页、转场、抽卡、检测、成功页背景 |
| `mascot` | 5 | 透明工厂引导角色，可用于引导、剧情、任务反馈 |
| `campaign-boards` | 4 | 手绘早餐小 BUG 灵感板，适合做活动主视觉或世界观参考 |

## 推荐 H5 使用路径

1. 首页/进入透明工厂：优先用 `backgrounds/bg-portal-platform.png` 或 `backgrounds/bg-terminal-corridor.png` 做背景，叠加 `mascot/mascot-repair-master.png`。
2. 工单任务流程：参考 `screens/mobile-order-intake.png`、`screens/mobile-order-detail.png`、`screens/mobile-flow-record.png`。
3. 互动选择/卡片页：用 `backgrounds/bg-card-slots.png` 或 `ui/ui-kit-game-controls.png` 统一按钮和状态样式。
4. 质检/透明工厂环节：用 `backgrounds/bg-factory-line.png`、`backgrounds/bg-toast-lab.png`、`mascot/mascot-toast-scan.png`。
5. 完成/奖励页：用 `badges/badge-repair-success.png`、`badges/badge-bug-terminator.png`、`badges/badge-breakfast-partner-gold.png`。
6. 分享页：直接参考或使用 `posters/share-repair-result.png`。

## 新增品牌/产品素材

### Logo

| 文件 | 内容 |
| --- | --- |
| `assets/brand/logo/horsh-logo-compact.png` | 横向 Logo，适合页头、分享海报、加载页 |
| `assets/brand/logo/horsh-logo-primary.png` | 竖向主 Logo，适合品牌露出或结尾页 |
| `assets/brand/logo/horsh-logo-color-reference.png` | 品牌取色参考，含 Pantone 873C 和 Pantone 288C |

### Logo 源文件

| 文件 | 内容 |
| --- | --- |
| `assets/brand/source/logo.psd` | Logo PSD 源文件 |
| `assets/brand/source/horsh-logo.ai` | Logo AI 源文件 |
| `assets/brand/source/horsh-logo-monochrome.ai` | Logo 单色 AI 源文件 |
| `assets/brand/source/horsh-new-standard.ai` | 豪士新标准 AI 源文件 |

### 藜麦吐司产品素材

| 文件 | 内容 |
| --- | --- |
| `assets/product/quinoa-toast/product-info.xlsx` | 产品信息表 |
| `assets/product/quinoa-toast/pack-film-layout.jpg` | 藜麦吐司包膜平面图 |
| `assets/product/quinoa-toast/box-420g-3d.png` | 420g 盒装产品图 |
| `assets/product/quinoa-toast/pouch-front.png` | 产品正面图 |
| `assets/product/quinoa-toast/pouch-back.jpg` | 产品反面图 |
| `assets/product/quinoa-toast/traceability-qr-photo.jpg` | 包装二维码实拍图 |
| `assets/product/quinoa-toast/source/quinoa-toast-material-pack.psd` | 藜麦吐司 PSD 素材包 |

### 产品文案

| 文件 | 内容 |
| --- | --- |
| `PRODUCT_BRIEF.md` | 从 Excel 和包装信息整理出的产品卖点、配料表和 H5 文案建议 |

## 文件清单

### UI 参考

| 文件 | 内容 |
| --- | --- |
| `assets/images/ui/ui-kit-green-controls.png` | 绿色工单风 UI 控件总表 |
| `assets/images/ui/ui-kit-game-controls.png` | 玩法控件总表 |

### 手机界面参考

| 文件 | 内容 |
| --- | --- |
| `assets/images/screens/mobile-order-intake.png` | 早餐问题工单首页 |
| `assets/images/screens/mobile-order-detail.png` | 工单详情页 |
| `assets/images/screens/mobile-status-cards.png` | 工单状态卡片页 |
| `assets/images/screens/mobile-flow-record.png` | 工单流转记录页 |
| `assets/images/screens/mobile-order-attachment.png` | 工单附件页 |
| `assets/images/screens/mobile-operations-center.png` | 工单操作中心 |

### 徽章/奖励

| 文件 | 内容 |
| --- | --- |
| `assets/images/badges/badge-quality-inspector.png` | 透明质检官 |
| `assets/images/badges/badge-factory-explorer.png` | 工厂探索家 |
| `assets/images/badges/badge-breakfast-repairer.png` | 早餐透明验证官 |
| `assets/images/badges/badge-call-expert.png` | 打 call 达人 |
| `assets/images/badges/badge-problem-solver-gold.png` | 问题解决王，金色高级奖励 |
| `assets/images/badges/badge-repair-success.png` | 验证完成 |
| `assets/images/badges/badge-transparent-guardian.png` | 透明守护者 |
| `assets/images/badges/badge-bug-terminator.png` | BUG 终结者 |
| `assets/images/badges/badge-breakfast-partner-gold.png` | 早餐搭子奖，金色奖励 |
| `assets/images/badges/badge-order-specialist.png` | 工单专家 |

### 分享/总览

| 文件 | 内容 |
| --- | --- |
| `assets/images/posters/share-repair-result.png` | 分享透明报告海报 |
| `assets/images/posters/mobile-flow-overview.png` | 移动端玩法流程总览 |

### 背景

| 文件 | 内容 |
| --- | --- |
| `assets/images/backgrounds/bg-terminal-corridor.png` | 终端走廊背景 |
| `assets/images/backgrounds/bg-shield-platform.png` | 护盾平台背景 |
| `assets/images/backgrounds/bg-factory-line.png` | 透明工厂生产线背景 |
| `assets/images/backgrounds/bg-hacker-city.png` | 暗色城市数据背景 |
| `assets/images/backgrounds/bg-portal-platform.png` | 传送平台背景 |
| `assets/images/backgrounds/bg-card-slots.png` | 三卡槽暗色背景 |
| `assets/images/backgrounds/bg-toast-lab.png` | 吐司实验舱背景 |
| `assets/images/backgrounds/bg-shadow-city.png` | 暗影城市背景 |

### 角色

| 文件 | 内容 |
| --- | --- |
| `assets/images/mascot/mascot-operator-console.png` | 控制台透明工厂引导员 |
| `assets/images/mascot/mascot-repair-master.png` | 工具型透明工厂引导员 |
| `assets/images/mascot/mascot-guardian-shield.png` | 守护型透明工厂引导员 |
| `assets/images/mascot/mascot-field-agent.png` | 行动型透明工厂引导员 |
| `assets/images/mascot/mascot-toast-scan.png` | 扫描吐司透明工厂引导员 |

### 活动主视觉参考

| 文件 | 内容 |
| --- | --- |
| `assets/images/campaign-boards/bug-repair-plan-board-01.png` | 手绘早餐小 BUG 灵感板 01 |
| `assets/images/campaign-boards/bug-repair-plan-board-02.png` | 手绘早餐小 BUG 灵感板 02 |
| `assets/images/campaign-boards/bug-repair-plan-board-03.png` | 手绘早餐小 BUG 灵感板 03 |
| `assets/images/campaign-boards/bug-repair-plan-board-04.png` | 手绘早餐小 BUG 灵感板 04 |

## 开发提醒

- 移动端长图大多是 `941x1672` 或 `1086x1448`，适合做 H5 竖屏参考。
- 徽章图是 `1254x1254`，做成成就弹窗时建议先压缩导出 WebP，避免加载过重。
- 活动板图是横版 `1448x1086`，更适合做物料参考或横屏视觉，不建议直接塞进竖屏首屏。
- 当前 PNG 单张约 1.5MB 到 3.7MB，正式上线前建议统一压缩。
- 产品图和 Logo 已经可以直接用于页面，但二维码照片是实拍图，正式上线前建议做一次透视校正或替换为高清原始二维码。
- AI/PSD 文件适合作为设计源文件留档，不建议直接放进 H5 加载资源。
