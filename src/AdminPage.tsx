import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Home,
  ListChecks,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Users
} from "lucide-react";
import "./admin.css";

type AdminValue = string | number | boolean | null | Record<string, unknown> | unknown[];
type AdminEventRow = Record<string, AdminValue | undefined>;

type AdminResponse = {
  ok: boolean;
  rows?: AdminEventRow[];
  message?: string;
};

type FlowStep = {
  key: string;
  label: string;
  hint: string;
  matches: (row: AdminEventRow) => boolean;
};

const fetchLimit = 300;
const rawBatchSize = 80;
const activityLimit = 60;

const eventLabels: Record<string, string> = {
  page_view: "访问页面",
  bug_selected: "选择问题",
  order_created: "生成工单",
  stage_entered: "进入环节",
  stage_completed: "完成环节",
  ingredient_progress: "原料进度",
  liked_changed: "报告点赞",
  report_generated: "生成报告",
  report_saved: "保存报告",
  report_save_failed: "保存失败",
  report_shared: "分享报告",
  report_share_cancelled: "取消分享",
  report_share_failed: "分享失败",
  purchase_clicked: "点击购买"
};

const stageLabels: Record<string, string> = {
  admin: "后台",
  home: "首页",
  select: "选问题",
  bug_select: "选问题",
  workOrder: "工单",
  work_order: "工单",
  ingredientScan: "原料",
  ingredient: "原料",
  softRepair: "压面",
  pressing: "压面",
  proofingLive: "醒发",
  proofing: "醒发",
  bakingLive: "烘焙",
  baking: "烘焙",
  packingLive: "验证",
  packing: "验证",
  report: "报告"
};

const flowSteps: FlowStep[] = [
  {
    key: "home",
    label: "首页",
    hint: "打开 H5",
    matches: (row) => getEventName(row) === "page_view" && getPage(row) === "home"
  },
  {
    key: "bug",
    label: "选问题",
    hint: "选择早餐困扰",
    matches: (row) => getEventName(row) === "bug_selected"
  },
  {
    key: "order",
    label: "工单",
    hint: "生成透明工单",
    matches: (row) => getEventName(row) === "order_created"
  },
  {
    key: "ingredient",
    label: "原料",
    hint: "完成原料接入",
    matches: (row) => isCompletedStage(row, "ingredient")
  },
  {
    key: "pressing",
    label: "压面",
    hint: "完成松软唤醒",
    matches: (row) => isCompletedStage(row, "pressing")
  },
  {
    key: "proofing",
    label: "醒发",
    hint: "完成恒温醒发",
    matches: (row) => isCompletedStage(row, "proofing")
  },
  {
    key: "baking",
    label: "烘焙",
    hint: "锁定黄金焙香",
    matches: (row) => isCompletedStage(row, "baking")
  },
  {
    key: "packing",
    label: "验证",
    hint: "完成透明验证",
    matches: (row) => isCompletedStage(row, "packing")
  },
  {
    key: "report",
    label: "报告",
    hint: "生成早餐报告",
    matches: (row) => getEventName(row) === "report_generated"
  }
];

function asText(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function getEventName(row: AdminEventRow) {
  return asText(row.eventName);
}

function getPage(row: AdminEventRow) {
  return asText(row.page);
}

function getStage(row: AdminEventRow) {
  return asText(row.stage);
}

function getStageLabel(value: unknown) {
  const stage = asText(value);
  return stageLabels[stage] ?? (stage || "-");
}

function getEventLabel(value: unknown) {
  const eventName = asText(value);
  return eventLabels[eventName] ?? (eventName || "-");
}

function getData(row: AdminEventRow) {
  return row.data && typeof row.data === "object" && !Array.isArray(row.data)
    ? (row.data as Record<string, unknown>)
    : {};
}

function isAdminRow(row: AdminEventRow) {
  return getPage(row) === "admin" || getStage(row) === "admin" || getData(row).admin === true;
}

function isCompletedStage(row: AdminEventRow, stage: string) {
  return getEventName(row) === "stage_completed" && getStage(row) === stage;
}

function getEventTime(row?: AdminEventRow) {
  return row?.serverTime ?? row?.clientTime;
}

function formatDate(value: unknown) {
  const raw = asText(value);
  if (!raw) return "-";

  const safeText = raw.replace(/\.(\d{3})\d+/, ".$1");
  const date = new Date(safeText);
  if (Number.isNaN(date.getTime())) {
    return raw.replace("T", " ").slice(5, 19);
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  })
    .format(date)
    .replace(/\//g, "-");
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getDateKey(value: unknown) {
  const raw = asText(value);
  if (!raw) return "";

  const safeText = raw.replace(/\.(\d{3})\d+/, ".$1");
  const date = new Date(safeText);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
  }

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function formatDateOption(value: string) {
  if (!value) return "未知日期";
  const [, month, day] = value.split("-");
  return month && day ? `${month}月${day}日` : value;
}

function shortId(value: unknown) {
  const text = asText(value);
  if (!text) return "-";
  if (text.length <= 14) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function cleanSource(value: unknown) {
  const text = asText(value).replace(/^https?:\/\//, "").replace(/\/$/, "");
  return text || "-";
}

function countEvents(rows: AdminEventRow[], eventName: string) {
  return rows.filter((row) => getEventName(row) === eventName).length;
}

function countUniqueSessions(rows: AdminEventRow[], matches?: (row: AdminEventRow) => boolean) {
  const sessions = new Set<string>();
  let fallbackCount = 0;

  rows.forEach((row) => {
    if (matches && !matches(row)) return;

    const sessionId = asText(row.sessionId);
    if (sessionId) {
      sessions.add(sessionId);
    } else {
      fallbackCount += 1;
    }
  });

  return sessions.size + fallbackCount;
}

function getStageAction(row: AdminEventRow) {
  const stage = getStage(row);
  if (stage === "ingredient") return "完成原料接入";
  if (stage === "pressing") return "完成松软压面";
  if (stage === "proofing") return "完成恒温醒发";
  if (stage === "baking") return "完成黄金焙香";
  if (stage === "packing") return "完成透明验证";
  if (stage === "work_order") return "进入透明工厂";
  return `${getStageLabel(stage)}已完成`;
}

function getHumanAction(row: AdminEventRow) {
  const eventName = getEventName(row);
  const bugType = asText(row.bugType);
  const progress = asText(row.progress);

  if (eventName === "page_view") {
    return getPage(row) === "home" ? "用户进入首页" : `用户进入${getStageLabel(row.page)}页`;
  }
  if (eventName === "bug_selected") return `选择早餐困扰：${bugType || "未填写"}`;
  if (eventName === "order_created") return "透明工单已生成";
  if (eventName === "stage_entered") return `进入${getStageLabel(row.stage)}环节`;
  if (eventName === "stage_completed") return getStageAction(row);
  if (eventName === "ingredient_progress") return `原料接入进度：${progress || "-"}`;
  if (eventName === "report_generated") return "早餐透明报告已生成";
  if (eventName === "report_saved") return "用户保存了报告";
  if (eventName === "report_shared") return "用户分享了报告";
  if (eventName === "purchase_clicked") return "用户点击了购买入口";

  return getEventLabel(eventName);
}

function getActivityRows(rows: AdminEventRow[]) {
  const keyRows = rows.filter((row) => getEventName(row) !== "page_view");
  if (keyRows.length > 0) return keyRows.slice(0, activityLimit);
  return rows.filter((row) => getPage(row) === "home").slice(0, Math.min(activityLimit, 20));
}

async function readAdminResponse(response: Response): Promise<AdminResponse> {
  const text = await response.text();
  if (!text.trim()) {
    return {
      ok: false,
      message: "后台接口没有返回数据。本地 preview 只预览页面，不会启动后台接口。"
    };
  }

  try {
    return JSON.parse(text) as AdminResponse;
  } catch {
    return {
      ok: false,
      message:
        response.status === 404
          ? "本地 preview 没有启动后台接口。请用线上 Vercel/Netlify 地址查看真实数据。"
          : "后台接口返回格式不正确，请检查函数部署和环境变量。"
    };
  }
}

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<AdminEventRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);
  const [visibleRawCount, setVisibleRawCount] = useState(rawBatchSize);
  const [selectedDate, setSelectedDate] = useState("all");

  const dashboard = useMemo(() => {
    const cleanRows = rows.filter((row) => !isAdminRow(row));
    const availableDates = Array.from(
      new Set(cleanRows.map((row) => getDateKey(getEventTime(row))).filter(Boolean))
    ).sort((left, right) => right.localeCompare(left));
    const effectiveSelectedDate =
      selectedDate === "all" || availableDates.includes(selectedDate) ? selectedDate : "all";
    const visibleRows =
      effectiveSelectedDate === "all"
        ? cleanRows
        : cleanRows.filter((row) => getDateKey(getEventTime(row)) === effectiveSelectedDate);
    const latestEventTime = formatDate(getEventTime(visibleRows[0]));
    const visitors = countUniqueSessions(visibleRows);
    const problemSelections = countEvents(visibleRows, "bug_selected");
    const orders = countEvents(visibleRows, "order_created");
    const reports = countEvents(visibleRows, "report_generated");
    const flow = flowSteps.map((step) => ({
      ...step,
      count: countUniqueSessions(visibleRows, step.matches)
    }));
    const maxFlowCount = Math.max(1, ...flow.map((step) => step.count));
    const activityRows = getActivityRows(visibleRows);

    return {
      cleanRows: visibleRows,
      totalRows: cleanRows,
      availableDates,
      selectedDate: effectiveSelectedDate,
      dateLabel: effectiveSelectedDate === "all" ? "全部日期" : formatDateOption(effectiveSelectedDate),
      latestEventTime,
      maxFlowCount,
      flow,
      activityRows,
      metricCards: [
        {
          label: "访客数",
          value: visitors,
          note: "所选日期内打开过 H5 的独立用户",
          icon: Users
        },
        {
          label: "问题选择",
          value: problemSelections,
          note: "所选日期内选择早餐困扰的人次",
          icon: ListChecks
        },
        {
          label: "工单生成",
          value: orders,
          note: "所选日期内进入透明工厂的工单",
          icon: ClipboardList
        },
        {
          label: "报告生成",
          value: reports,
          note: "所选日期内拿到透明报告的人次",
          icon: FileText
        }
      ]
    };
  }, [rows, selectedDate]);

  const rawRows = dashboard.cleanRows.slice(0, Math.min(visibleRawCount, fetchLimit));
  const canShowMoreRaw = visibleRawCount < Math.min(dashboard.cleanRows.length, fetchLimit);

  const loadRows = async (nextPassword = password) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: nextPassword, limit: fetchLimit })
      });
      const data = await readAdminResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "后台数据读取失败。");
      }

      setRows(data.rows ?? []);
      setIsAuthed(true);
      setLastLoadedAt(new Date().toISOString());
      setShowRaw(false);
      setVisibleRawCount(rawBatchSize);
    } catch (error) {
      setError(error instanceof Error ? error.message : "后台数据读取失败。");
      if (!isAuthed) {
        setRows([]);
        setIsAuthed(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadRows(password);
  };

  useEffect(() => {
    document.body.classList.add("admin-mode");

    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">HORSH DATA</span>
            <h1>早餐透明工厂后台</h1>
            <p>手机上快速看懂 H5 数据，不展示复杂字段。</p>
          </div>
          <ShieldCheck aria-hidden="true" size={28} />
        </header>

        {!isAuthed ? (
          <form className="admin-login" onSubmit={submitPassword}>
            <div className="admin-login-title">
              <span>
                <LockKeyhole size={20} />
              </span>
              <div>
                <h2>管理员验证</h2>
                <p>输入后台密码后读取最近 {fetchLimit} 条记录。</p>
              </div>
            </div>
            <label htmlFor="admin-password">后台密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="输入 ADMIN_PASSWORD"
              onChange={(event) => setPassword(event.target.value)}
            />
            <button className="admin-primary-button" disabled={loading || !password.trim()} type="submit">
              {loading ? "读取中..." : "进入后台"}
            </button>
            {error && <p className="admin-error">{error}</p>}
          </form>
        ) : (
          <>
            <section className="admin-refresh-card">
              <div>
                <span>最近更新时间</span>
                <strong>{lastLoadedAt ? formatDate(lastLoadedAt) : "-"}</strong>
                <small>
                  按实际记录日期统计 / 当前查看：{dashboard.dateLabel} / 最近用户动作：{dashboard.latestEventTime}
                </small>
              </div>
              <label className="admin-date-filter" htmlFor="admin-date-filter">
                <span>查看日期</span>
                <select
                  id="admin-date-filter"
                  value={dashboard.selectedDate}
                  onChange={(event) => {
                    setSelectedDate(event.target.value);
                    setShowRaw(false);
                    setVisibleRawCount(rawBatchSize);
                  }}
                  disabled={dashboard.totalRows.length === 0}
                >
                  <option value="all">全部日期</option>
                  {dashboard.availableDates.map((date) => (
                    <option key={date} value={date}>
                      {formatDateOption(date)}
                    </option>
                  ))}
                </select>
              </label>
              <button disabled={loading} onClick={() => void loadRows(password)} type="button">
                <RefreshCw size={17} />
                {loading ? "刷新中" : "刷新"}
              </button>
            </section>

            <section className="admin-metrics" aria-label="核心数据">
              {dashboard.metricCards.map(({ label, value, note, icon: Icon }) => (
                <article className="admin-metric" key={label}>
                  <span className="admin-metric-icon">
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{value}</strong>
                    <b>{label}</b>
                    <small>{note}</small>
                  </div>
                </article>
              ))}
            </section>

            <section className="admin-card">
              <div className="admin-section-head">
                <div>
                  <h2>用户走到哪了</h2>
                  <p>数字按独立用户估算，方便看掉点。</p>
                </div>
              </div>
              <div className="admin-flow">
                {dashboard.flow.map((step, index) => {
                  const width =
                    step.count > 0 ? Math.max(8, Math.round((step.count / dashboard.maxFlowCount) * 100)) : 0;

                  return (
                    <article className="admin-flow-row" key={step.key}>
                      <div className="admin-flow-index">{index + 1}</div>
                      <div className="admin-flow-main">
                        <div className="admin-flow-label">
                          <strong>{step.label}</strong>
                          <span>{step.hint}</span>
                          <b>{step.count}</b>
                        </div>
                        <div className="admin-flow-bar">
                          <span style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="admin-card">
              <div className="admin-section-head">
                <div>
                  <h2>最近动态</h2>
                  <p>优先显示选择、工单、完成和报告，不让访问记录刷屏。</p>
                </div>
              </div>
              <div className="admin-activity-list">
                {dashboard.activityRows.length > 0 ? (
                  dashboard.activityRows.map((row, index) => (
                    <article className="admin-activity" key={`${getEventTime(row) ?? "event"}-${index}`}>
                      <span>
                        {getEventName(row) === "page_view" ? (
                          <Home size={16} />
                        ) : getEventName(row) === "report_generated" ? (
                          <FileText size={16} />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                      </span>
                      <div>
                        <strong>{getHumanAction(row)}</strong>
                        <small>
                          {formatDate(getEventTime(row))} / {cleanSource(row.sourceHost)}
                        </small>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="admin-empty">还没有用户数据，先玩一遍 H5 再回来刷新。</p>
                )}
              </div>
            </section>

            <section className="admin-card admin-raw-card">
              <button className="admin-raw-toggle" onClick={() => setShowRaw((value) => !value)} type="button">
                <span>
                  原始记录
                  <small>默认收起，统计仍使用最近 {fetchLimit} 条。</small>
                </span>
                {showRaw ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showRaw && (
                <div className="admin-raw-list">
                  {rawRows.length > 0 ? (
                    rawRows.map((row, index) => (
                      <article className="admin-raw-item" key={`${getEventTime(row) ?? "raw"}-${index}`}>
                        <div>
                          <strong>{getHumanAction(row)}</strong>
                          <span>{formatDate(getEventTime(row))}</span>
                        </div>
                        <dl>
                          <div>
                            <dt>事件</dt>
                            <dd>{getEventLabel(row.eventName)}</dd>
                          </div>
                          <div>
                            <dt>阶段</dt>
                            <dd>{getStageLabel(row.stage || row.page)}</dd>
                          </div>
                          <div>
                            <dt>工单</dt>
                            <dd>{shortId(row.orderId)}</dd>
                          </div>
                          <div>
                            <dt>会话</dt>
                            <dd>{shortId(row.sessionId)}</dd>
                          </div>
                        </dl>
                      </article>
                    ))
                  ) : (
                    <p className="admin-empty">暂无原始记录。</p>
                  )}

                  {canShowMoreRaw && (
                    <button
                      className="admin-secondary-button"
                      onClick={() =>
                        setVisibleRawCount((count) => Math.min(count + rawBatchSize, dashboard.cleanRows.length, fetchLimit))
                      }
                      type="button"
                    >
                      再显示 {Math.min(rawBatchSize, Math.min(dashboard.cleanRows.length, fetchLimit) - visibleRawCount)} 条
                    </button>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </main>
  );
}
