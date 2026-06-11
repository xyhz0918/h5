import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  Download,
  FileText,
  Filter,
  Home,
  LockKeyhole,
  Repeat2,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import "./admin.css";

type AdminValue = string | number | boolean | null | Record<string, unknown> | unknown[];
type AdminEventRow = Record<string, AdminValue | undefined>;

type AdminResponse = {
  ok: boolean;
  rows?: AdminEventRow[];
  hasMore?: boolean;
  nextOffset?: number;
  hasVisitorIdColumn?: boolean;
  message?: string;
};

type FlowStep = {
  key: string;
  label: string;
  hint: string;
  matches: (row: AdminEventRow) => boolean;
};

type VisitorIdentityType = "stable" | "fingerprint" | "session";

type VisitorProfile = {
  key: string;
  label: string;
  identityType: VisitorIdentityType;
  events: AdminEventRow[];
  sessions: string[];
  eventCount: number;
  firstTime: unknown;
  lastTime: unknown;
  sourceHost: string;
  deviceLabel: string;
  deviceGroup: string;
  primaryBug: string;
  lastAction: string;
  reportCount: number;
  hasGeneratedReport: boolean;
  hasSavedReport: boolean;
  hasSharedReport: boolean;
  reachedStepKey: string;
  reachedStepLabel: string;
  isRepeat: boolean;
};

const fetchLimit = 300;
const rawBatchSize = 80;
const activityLimit = 60;
const visitorPreviewLimit = 18;
const visitorTimelineLimit = 36;
const allFilterValue = "all";
const emptyFilterValue = "__empty__";

const visitorTypeOptions = [
  { value: allFilterValue, label: "全部访客" },
  { value: "repeat", label: "重复访客" },
  { value: "first", label: "首访访客" },
  { value: "stable", label: "稳定识别" },
  { value: "inferred", label: "疑似归并" }
];

const completionFilterOptions = [
  { value: allFilterValue, label: "全部报告状态" },
  { value: "generated", label: "已完成报告" },
  { value: "not_generated", label: "未完成报告" }
];

const reportActionFilterOptions = [
  { value: allFilterValue, label: "全部保存/分享" },
  { value: "saved", label: "已保存报告" },
  { value: "shared", label: "已分享报告" },
  { value: "saved_or_shared", label: "保存或分享" },
  { value: "no_action", label: "未保存分享" }
];

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

function getDateRangeLabel(startDate: string, endDate: string) {
  if (startDate && endDate) return `${formatDateOption(startDate)} 至 ${formatDateOption(endDate)}`;
  if (startDate) return `${formatDateOption(startDate)} 之后`;
  if (endDate) return `${formatDateOption(endDate)} 之前`;
  return "全部日期";
}

function isWithinDateRange(row: AdminEventRow, startDate: string, endDate: string) {
  const dateKey = getDateKey(getEventTime(row));
  if (!dateKey) return !startDate && !endDate;
  if (startDate && dateKey < startDate) return false;
  if (endDate && dateKey > endDate) return false;
  return true;
}

function filterValue(value: unknown) {
  const text = asText(value);
  return text || emptyFilterValue;
}

function filterLabel(value: string) {
  return value === emptyFilterValue ? "未选择/未知" : value;
}

function buildFilterOptions(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return filterLabel(left[0]).localeCompare(filterLabel(right[0]), "zh-CN");
    })
    .map(([value, count]) => ({
      value,
      label: `${filterLabel(value)} (${count})`
    }));
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

function getTimeMs(value: unknown) {
  const raw = asText(value);
  if (!raw) return 0;

  const safeText = raw.replace(/\.(\d{3})\d+/, ".$1");
  const time = new Date(safeText).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getVisitorId(row: AdminEventRow) {
  const data = getData(row);
  return asText(row.visitorId) || asText(data.visitorId);
}

function getVisitorFingerprint(row: AdminEventRow) {
  const source = cleanSource(row.sourceHost);
  const userAgent = asText(row.userAgent).replace(/\s+/g, " ").trim();
  const viewport = asText(row.viewport);

  if (!userAgent && !viewport) return "";
  return `${source}|${viewport}|${userAgent}`;
}

function getDeviceGroup(row: AdminEventRow) {
  const userAgent = asText(row.userAgent).toLowerCase();

  if (/micromessenger/.test(userAgent)) return "微信";
  if (/iphone|ipad|android|mobile/.test(userAgent)) return "手机浏览器";
  if (/edg/.test(userAgent)) return "Edge 桌面";
  if (/chrome|crios/.test(userAgent)) return "Chrome 桌面";
  if (/safari/.test(userAgent)) return "Safari 桌面";
  if (userAgent) return "桌面浏览器";
  return "未知设备";
}

function getVisitorKey(row: AdminEventRow) {
  const visitorId = getVisitorId(row);
  if (visitorId) {
    return {
      key: `visitor:${visitorId}`,
      identityType: "stable" as VisitorIdentityType
    };
  }

  const fingerprint = getVisitorFingerprint(row);
  if (fingerprint) {
    return {
      key: `fingerprint:${fingerprint}`,
      identityType: "fingerprint" as VisitorIdentityType
    };
  }

  const sessionId = asText(row.sessionId);
  const fallbackKey = [
    getEventTime(row),
    getEventName(row),
    getPage(row) || getStage(row),
    cleanSource(row.sourceHost)
  ]
    .map(asText)
    .filter(Boolean)
    .join(":");

  return {
    key: `session:${sessionId || fallbackKey || "unknown"}`,
    identityType: "session" as VisitorIdentityType
  };
}

function getDeviceLabel(row: AdminEventRow) {
  const userAgent = asText(row.userAgent).toLowerCase();
  const viewport = asText(row.viewport);
  const parts: string[] = [];

  if (/micromessenger/.test(userAgent)) parts.push("微信");
  else if (/safari/.test(userAgent) && !/chrome|crios|edg/.test(userAgent)) parts.push("Safari");
  else if (/edg/.test(userAgent)) parts.push("Edge");
  else if (/chrome|crios/.test(userAgent)) parts.push("Chrome");

  if (/iphone|ipad|android|mobile/.test(userAgent)) parts.push("手机");
  else if (userAgent) parts.push("桌面");

  if (viewport) parts.push(viewport);
  return parts.join(" / ") || "未知设备";
}

function getReachedStep(rows: AdminEventRow[]) {
  let reachedStep = flowSteps[0];

  flowSteps.forEach((step) => {
    if (rows.some(step.matches)) {
      reachedStep = step;
    }
  });

  return reachedStep;
}

function getVisitCount(profile: VisitorProfile) {
  return Math.max(1, profile.sessions.length);
}

function firstNonEmpty(rows: AdminEventRow[], getter: (row: AdminEventRow) => unknown) {
  for (const row of rows) {
    const value = asText(getter(row));
    if (value) return value;
  }

  return "";
}

function buildVisitorProfiles(rows: AdminEventRow[]) {
  const grouped = new Map<string, { identityType: VisitorIdentityType; rows: AdminEventRow[] }>();

  rows.forEach((row) => {
    const identity = getVisitorKey(row);
    const group = grouped.get(identity.key);

    if (group) {
      group.rows.push(row);
      return;
    }

    grouped.set(identity.key, {
      identityType: identity.identityType,
      rows: [row]
    });
  });

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const profileRows = [...group.rows].sort(
        (left, right) => getTimeMs(getEventTime(right)) - getTimeMs(getEventTime(left))
      );
      const lastRow = profileRows[0];
      const firstRow = profileRows[profileRows.length - 1];
      const sessions = Array.from(new Set(profileRows.map((row) => asText(row.sessionId)).filter(Boolean)));
      const reportCount = profileRows.filter((row) => getEventName(row) === "report_generated").length;
      const reachedStep = getReachedStep(profileRows);
      const pageViewDates = new Set(
        profileRows
          .filter((row) => getEventName(row) === "page_view")
          .map((row) => getDateKey(getEventTime(row)))
          .filter(Boolean)
      );

      return {
        key,
        label: "",
        identityType: group.identityType,
        events: profileRows,
        sessions,
        eventCount: profileRows.length,
        firstTime: getEventTime(firstRow),
        lastTime: getEventTime(lastRow),
        sourceHost: cleanSource(lastRow?.sourceHost),
        deviceLabel: getDeviceLabel(lastRow),
        deviceGroup: getDeviceGroup(lastRow),
        primaryBug: firstNonEmpty(profileRows, (row) => row.bugType),
        lastAction: getHumanAction(lastRow),
        reportCount,
        hasGeneratedReport: reportCount > 0,
        hasSavedReport: profileRows.some((row) => getEventName(row) === "report_saved"),
        hasSharedReport: profileRows.some((row) => getEventName(row) === "report_shared"),
        reachedStepKey: reachedStep.key,
        reachedStepLabel: reachedStep.label,
        isRepeat: sessions.length > 1 || pageViewDates.size > 1
      } satisfies VisitorProfile;
    })
    .sort((left, right) => getTimeMs(right.lastTime) - getTimeMs(left.lastTime))
    .map((profile, index) => ({
      ...profile,
      label: `访客 ${String(index + 1).padStart(2, "0")}`
    }));
}

function countUniqueVisitors(rows: AdminEventRow[], matches?: (row: AdminEventRow) => boolean) {
  return buildVisitorProfiles(matches ? rows.filter(matches) : rows).length;
}

function countProfilesAtStep(profiles: VisitorProfile[], matches: (row: AdminEventRow) => boolean) {
  return profiles.filter((profile) => profile.events.some(matches)).length;
}

function getIdentityLabel(identityType: VisitorIdentityType) {
  if (identityType === "stable") return "稳定识别";
  if (identityType === "fingerprint") return "疑似同一人";
  return "仅本次会话";
}

function profileMatchesFilters(
  profile: VisitorProfile,
  {
    bugFilter,
    deviceFilter,
    sourceFilter,
    visitorTypeFilter,
    completionFilter,
    reportActionFilter
  }: {
    bugFilter: string;
    deviceFilter: string;
    sourceFilter: string;
    visitorTypeFilter: string;
    completionFilter: string;
    reportActionFilter: string;
  }
) {
  if (bugFilter !== allFilterValue && filterValue(profile.primaryBug) !== bugFilter) return false;
  if (deviceFilter !== allFilterValue && filterValue(profile.deviceGroup) !== deviceFilter) return false;
  if (sourceFilter !== allFilterValue && filterValue(profile.sourceHost) !== sourceFilter) return false;

  if (visitorTypeFilter === "repeat" && !profile.isRepeat) return false;
  if (visitorTypeFilter === "first" && profile.isRepeat) return false;
  if (visitorTypeFilter === "stable" && profile.identityType !== "stable") return false;
  if (visitorTypeFilter === "inferred" && profile.identityType === "stable") return false;

  if (completionFilter === "generated" && !profile.hasGeneratedReport) return false;
  if (completionFilter === "not_generated" && profile.hasGeneratedReport) return false;

  if (reportActionFilter === "saved" && !profile.hasSavedReport) return false;
  if (reportActionFilter === "shared" && !profile.hasSharedReport) return false;
  if (reportActionFilter === "saved_or_shared" && !profile.hasSavedReport && !profile.hasSharedReport) {
    return false;
  }
  if (reportActionFilter === "no_action" && (profile.hasSavedReport || profile.hasSharedReport)) return false;

  return true;
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bugFilter, setBugFilter] = useState(allFilterValue);
  const [deviceFilter, setDeviceFilter] = useState(allFilterValue);
  const [sourceFilter, setSourceFilter] = useState(allFilterValue);
  const [visitorTypeFilter, setVisitorTypeFilter] = useState(allFilterValue);
  const [completionFilter, setCompletionFilter] = useState(allFilterValue);
  const [reportActionFilter, setReportActionFilter] = useState(allFilterValue);
  const [selectedVisitorKey, setSelectedVisitorKey] = useState("");
  const [hasMoreRows, setHasMoreRows] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [backendVisitorIdReady, setBackendVisitorIdReady] = useState<boolean | null>(null);

  const dashboard = useMemo(() => {
    const cleanRows = rows.filter((row) => !isAdminRow(row));
    const availableDates = Array.from(
      new Set(cleanRows.map((row) => getDateKey(getEventTime(row))).filter(Boolean))
    ).sort((left, right) => right.localeCompare(left));
    const dateRows = cleanRows.filter((row) => isWithinDateRange(row, startDate, endDate));
    const baseVisitorProfiles = buildVisitorProfiles(dateRows);
    const filteredProfiles = baseVisitorProfiles.filter((profile) =>
      profileMatchesFilters(profile, {
        bugFilter,
        deviceFilter,
        sourceFilter,
        visitorTypeFilter,
        completionFilter,
        reportActionFilter
      })
    );
    const filteredProfileKeys = new Set(filteredProfiles.map((profile) => profile.key));
    const visibleRows = dateRows.filter((row) => filteredProfileKeys.has(getVisitorKey(row).key));
    const latestEventTime = formatDate(getEventTime(visibleRows[0]));
    const visitors = filteredProfiles.length;
    const visits = filteredProfiles.reduce((sum, profile) => sum + getVisitCount(profile), 0);
    const repeatVisitors = filteredProfiles.filter((profile) => profile.isRepeat).length;
    const inferredVisitors = filteredProfiles.filter((profile) => profile.identityType !== "stable").length;
    const completedReports = filteredProfiles.filter((profile) => profile.hasGeneratedReport).length;
    const savedReports = filteredProfiles.filter((profile) => profile.hasSavedReport).length;
    const sharedReports = filteredProfiles.filter((profile) => profile.hasSharedReport).length;
    let previousStepCount = 0;
    const flow = flowSteps.map((step, index) => {
      const count = countProfilesAtStep(filteredProfiles, step.matches);
      const previousCount = index === 0 ? count : previousStepCount;
      const conversionRate = index === 0 ? 100 : previousCount > 0 ? Math.round((count / previousCount) * 100) : 0;
      const dropOff = index === 0 ? 0 : Math.max(0, previousCount - count);

      previousStepCount = count;

      return {
        ...step,
        count,
        previousCount,
        conversionRate,
        dropOff
      };
    });
    const maxFlowCount = Math.max(1, ...flow.map((step) => step.count));
    const activityRows = getActivityRows(visibleRows);
    const selectedProfile =
      filteredProfiles.find((profile) => profile.key === selectedVisitorKey) ?? filteredProfiles[0];

    return {
      cleanRows: visibleRows,
      totalRows: cleanRows,
      dateRows,
      availableDates,
      dateLabel: getDateRangeLabel(startDate, endDate),
      filterOptions: {
        bug: buildFilterOptions(baseVisitorProfiles.map((profile) => filterValue(profile.primaryBug))),
        device: buildFilterOptions(baseVisitorProfiles.map((profile) => filterValue(profile.deviceGroup))),
        source: buildFilterOptions(baseVisitorProfiles.map((profile) => filterValue(profile.sourceHost)))
      },
      latestEventTime,
      maxFlowCount,
      flow,
      activityRows,
      visitorProfiles: filteredProfiles,
      selectedProfile,
      repeatVisitors,
      inferredVisitors,
      metricCards: [
        {
          label: "独立访客",
          value: visitors,
          note: "按 visitorId 优先归并，旧数据按设备疑似归并",
          icon: Users
        },
        {
          label: "访问次数",
          value: visits,
          note: "不同 session 数，同一人多次打开会累计",
          icon: Clock3
        },
        {
          label: "重复访客",
          value: repeatVisitors,
          note: "同一访客出现多个 session 或跨日期访问",
          icon: Repeat2
        },
        {
          label: "报告生成",
          value: completedReports,
          note: "完成最后报告的独立访客数",
          icon: FileText
        },
        {
          label: "保存报告",
          value: savedReports,
          note: "点击保存报告的独立访客数",
          icon: Download
        },
        {
          label: "分享报告",
          value: sharedReports,
          note: "触发分享报告的独立访客数",
          icon: Share2
        }
      ]
    };
  }, [
    rows,
    startDate,
    endDate,
    bugFilter,
    deviceFilter,
    sourceFilter,
    visitorTypeFilter,
    completionFilter,
    reportActionFilter,
    selectedVisitorKey
  ]);

  const rawRows = dashboard.cleanRows.slice(0, visibleRawCount);
  const canShowMoreRaw = visibleRawCount < dashboard.cleanRows.length;
  const filtersActive =
    Boolean(startDate || endDate) ||
    bugFilter !== allFilterValue ||
    deviceFilter !== allFilterValue ||
    sourceFilter !== allFilterValue ||
    visitorTypeFilter !== allFilterValue ||
    completionFilter !== allFilterValue ||
    reportActionFilter !== allFilterValue;

  const resetFilterDependentViews = () => {
    setShowRaw(false);
    setVisibleRawCount(rawBatchSize);
  };

  const resetFilters = () => {
    setStartDate("");
    setEndDate("");
    setBugFilter(allFilterValue);
    setDeviceFilter(allFilterValue);
    setSourceFilter(allFilterValue);
    setVisitorTypeFilter(allFilterValue);
    setCompletionFilter(allFilterValue);
    setReportActionFilter(allFilterValue);
    setSelectedVisitorKey("");
    resetFilterDependentViews();
  };

  const loadRows = async (nextPassword = password, mode: "replace" | "append" = "replace") => {
    setLoading(true);
    setError("");

    try {
      const offset = mode === "append" ? nextOffset : 0;
      const response = await fetch("/api/admin-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: nextPassword, limit: fetchLimit, offset })
      });
      const data = await readAdminResponse(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "后台数据读取失败。");
      }

      setRows((currentRows) => (mode === "append" ? [...currentRows, ...(data.rows ?? [])] : data.rows ?? []));
      setIsAuthed(true);
      setLastLoadedAt(new Date().toISOString());
      setHasMoreRows(Boolean(data.hasMore));
      setNextOffset(data.nextOffset ?? offset + (data.rows?.length ?? 0));
      setBackendVisitorIdReady(data.hasVisitorIdColumn ?? null);
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

  useEffect(() => {
    const selectedProfileKey = dashboard.selectedProfile?.key ?? "";
    if (selectedProfileKey !== selectedVisitorKey) {
      setSelectedVisitorKey(selectedProfileKey);
    }
  }, [dashboard.selectedProfile?.key, selectedVisitorKey]);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-topbar">
          <div>
            <span className="admin-kicker">HORSH DATA</span>
            <h1>早餐透明工厂后台</h1>
            <p>按访客归并、标出重复访问，再看每一步掉在哪里。</p>
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
                <p>输入后台密码后先读取最近 {fetchLimit} 条记录，可继续加载更早数据。</p>
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
                  已加载 {dashboard.totalRows.length} 条记录 / 当前筛选：{dashboard.dateLabel} / 最近用户动作：
                  {dashboard.latestEventTime}
                </small>
                {backendVisitorIdReady === false && (
                  <small className="admin-schema-warning">数据库还没加 visitor_id 列，当前用兼容模式识别访客。</small>
                )}
              </div>
              <div className="admin-refresh-actions">
                <button disabled={loading} onClick={() => void loadRows(password)} type="button">
                  <RefreshCw size={17} />
                  {loading ? "刷新中" : "刷新"}
                </button>
                <button
                  className="admin-secondary-inline"
                  disabled={loading || !hasMoreRows}
                  onClick={() => void loadRows(password, "append")}
                  type="button"
                >
                  <Database size={16} />
                  {hasMoreRows ? "加载更早" : "已到最早"}
                </button>
              </div>
            </section>

            <section className="admin-card admin-filter-card">
              <div className="admin-section-head admin-section-head-row">
                <div>
                  <h2>
                    <Filter size={16} />
                    筛选访客
                  </h2>
                  <p>筛选按访客画像生效，不按单条事件重复计算。</p>
                </div>
                <button className="admin-ghost-button" disabled={!filtersActive} onClick={resetFilters} type="button">
                  重置筛选
                </button>
              </div>
              <div className="admin-filter-grid">
                <label className="admin-filter-control">
                  <span>开始日期</span>
                  <input
                    max={endDate || undefined}
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setStartDate(event.target.value);
                      resetFilterDependentViews();
                    }}
                  />
                </label>
                <label className="admin-filter-control">
                  <span>结束日期</span>
                  <input
                    min={startDate || undefined}
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setEndDate(event.target.value);
                      resetFilterDependentViews();
                    }}
                  />
                </label>
                <label className="admin-filter-control">
                  <span>早餐 BUG</span>
                  <select
                    value={bugFilter}
                    onChange={(event) => {
                      setBugFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    <option value={allFilterValue}>全部 BUG</option>
                    {dashboard.filterOptions.bug.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-filter-control">
                  <span>设备</span>
                  <select
                    value={deviceFilter}
                    onChange={(event) => {
                      setDeviceFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    <option value={allFilterValue}>全部设备</option>
                    {dashboard.filterOptions.device.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-filter-control">
                  <span>来源</span>
                  <select
                    value={sourceFilter}
                    onChange={(event) => {
                      setSourceFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    <option value={allFilterValue}>全部来源</option>
                    {dashboard.filterOptions.source.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-filter-control">
                  <span>访客类型</span>
                  <select
                    value={visitorTypeFilter}
                    onChange={(event) => {
                      setVisitorTypeFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    {visitorTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-filter-control">
                  <span>报告状态</span>
                  <select
                    value={completionFilter}
                    onChange={(event) => {
                      setCompletionFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    {completionFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-filter-control">
                  <span>保存/分享</span>
                  <select
                    value={reportActionFilter}
                    onChange={(event) => {
                      setReportActionFilter(event.target.value);
                      resetFilterDependentViews();
                    }}
                  >
                    {reportActionFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
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

            <section className="admin-card admin-definition-card">
              <div className="admin-section-head">
                <h2>数据口径</h2>
              </div>
              <dl className="admin-definition-grid">
                <div>
                  <dt>独立访客</dt>
                  <dd>优先按稳定 visitorId 归并；没有新字段的旧数据按设备、来源和尺寸做疑似归并。</dd>
                </div>
                <div>
                  <dt>访问次数</dt>
                  <dd>同一访客下不同 session 的数量，同一人多次打开会累计。</dd>
                </div>
                <div>
                  <dt>重复访客</dt>
                  <dd>同一访客出现多个 session，或跨自然日再次访问。</dd>
                </div>
                <div>
                  <dt>漏斗转化率</dt>
                  <dd>当前步骤人数除以上一步人数；掉失为上一步人数减当前步骤人数。</dd>
                </div>
              </dl>
            </section>

            <section className="admin-card admin-visitor-card">
              <div className="admin-section-head admin-section-head-row">
                <div>
                  <h2>访客识别</h2>
                  <p>先按稳定 ID 归并；没有 ID 的旧数据，用设备和来源做疑似归并。</p>
                </div>
                <span className="admin-id-note">
                  {dashboard.inferredVisitors} 个疑似归并 / 显示 {Math.min(dashboard.visitorProfiles.length, visitorPreviewLimit)} 人
                </span>
              </div>
              <div className="admin-visitor-workspace">
                <div className="admin-visitor-list">
                  {dashboard.visitorProfiles.length > 0 ? (
                    dashboard.visitorProfiles.slice(0, visitorPreviewLimit).map((profile) => (
                      <button
                        aria-pressed={dashboard.selectedProfile?.key === profile.key}
                        className={`admin-visitor ${profile.isRepeat ? "is-repeat" : ""} ${
                          dashboard.selectedProfile?.key === profile.key ? "is-selected" : ""
                        }`}
                        key={profile.key}
                        onClick={() => setSelectedVisitorKey(profile.key)}
                        type="button"
                      >
                        <header>
                          <span className="admin-visitor-icon">
                            {profile.isRepeat ? <Repeat2 size={17} /> : <UserRound size={17} />}
                          </span>
                          <div>
                            <strong>{profile.label}</strong>
                            <small>{getIdentityLabel(profile.identityType)}</small>
                          </div>
                          <b>{profile.isRepeat ? "重复访客" : "首访"}</b>
                        </header>
                        <dl>
                          <div>
                            <dt>访问次数</dt>
                            <dd>{getVisitCount(profile)}</dd>
                          </div>
                          <div>
                            <dt>走到</dt>
                            <dd>{profile.reachedStepLabel}</dd>
                          </div>
                          <div>
                            <dt>报告</dt>
                            <dd>{profile.reportCount}</dd>
                          </div>
                          <div>
                            <dt>最近</dt>
                            <dd>{formatDate(profile.lastTime)}</dd>
                          </div>
                        </dl>
                        <p>{profile.lastAction}</p>
                        <footer>
                          <span>{profile.primaryBug || "未选择早餐困扰"}</span>
                          <span>{profile.deviceLabel}</span>
                          <span>{profile.sourceHost}</span>
                        </footer>
                      </button>
                    ))
                  ) : (
                    <p className="admin-empty">还没有可识别访客。</p>
                  )}
                </div>

                {dashboard.selectedProfile ? (
                  <aside className="admin-visitor-detail">
                    <div className="admin-visitor-detail-head">
                      <div>
                        <span>访客轨迹</span>
                        <h3>{dashboard.selectedProfile.label}</h3>
                      </div>
                      <b>{dashboard.selectedProfile.isRepeat ? "重复访客" : "首访"}</b>
                    </div>
                    <dl className="admin-detail-grid">
                      <div>
                        <dt>首次</dt>
                        <dd>{formatDate(dashboard.selectedProfile.firstTime)}</dd>
                      </div>
                      <div>
                        <dt>最近</dt>
                        <dd>{formatDate(dashboard.selectedProfile.lastTime)}</dd>
                      </div>
                      <div>
                        <dt>访问</dt>
                        <dd>{getVisitCount(dashboard.selectedProfile)} 次</dd>
                      </div>
                      <div>
                        <dt>走到</dt>
                        <dd>{dashboard.selectedProfile.reachedStepLabel}</dd>
                      </div>
                    </dl>
                    <div className="admin-detail-tags">
                      <span>{dashboard.selectedProfile.primaryBug || "未选择早餐困扰"}</span>
                      <span>{dashboard.selectedProfile.deviceLabel}</span>
                      <span>{dashboard.selectedProfile.sourceHost}</span>
                      {dashboard.selectedProfile.hasSavedReport && <span>已保存报告</span>}
                      {dashboard.selectedProfile.hasSharedReport && <span>已分享报告</span>}
                    </div>
                    <ol className="admin-timeline">
                      {[...dashboard.selectedProfile.events]
                        .reverse()
                        .slice(0, visitorTimelineLimit)
                        .map((row, index) => (
                          <li key={`${getEventTime(row) ?? "timeline"}-${index}`}>
                            <i />
                            <div>
                              <strong>{getHumanAction(row)}</strong>
                              <small>
                                {formatDate(getEventTime(row))} / {getEventLabel(row.eventName)} /{" "}
                                {getStageLabel(row.stage || row.page)}
                              </small>
                            </div>
                          </li>
                        ))}
                    </ol>
                  </aside>
                ) : (
                  <aside className="admin-visitor-detail">
                    <p className="admin-empty">筛选后没有访客轨迹。</p>
                  </aside>
                )}
              </div>
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
                        <div className="admin-flow-meta">
                          <span>{index === 0 ? "入口步骤" : `上步转化 ${step.conversionRate}%`}</span>
                          <span>{index === 0 ? "掉失 0" : `掉失 ${step.dropOff}`}</span>
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
                  dashboard.activityRows.map((row, index) => {
                    const visitorProfile = dashboard.visitorProfiles.find(
                      (profile) => profile.key === getVisitorKey(row).key
                    );

                    return (
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
                            {visitorProfile?.label ?? "未知访客"} / {formatDate(getEventTime(row))} /{" "}
                            {cleanSource(row.sourceHost)}
                          </small>
                        </div>
                        {visitorProfile?.isRepeat && <b className="admin-repeat-pill">重复</b>}
                      </article>
                    );
                  })
                ) : (
                  <p className="admin-empty">还没有用户数据，先玩一遍 H5 再回来刷新。</p>
                )}
              </div>
            </section>

            <section className="admin-card admin-raw-card">
              <button className="admin-raw-toggle" onClick={() => setShowRaw((value) => !value)} type="button">
                <span>
                  原始记录
                  <small>默认收起，统计使用当前已加载且筛选后的记录。</small>
                </span>
                {showRaw ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {showRaw && (
                <div className="admin-raw-list">
                  {rawRows.length > 0 ? (
                    rawRows.map((row, index) => {
                      const visitorProfile = dashboard.visitorProfiles.find(
                        (profile) => profile.key === getVisitorKey(row).key
                      );

                      return (
                        <article className="admin-raw-item" key={`${getEventTime(row) ?? "raw"}-${index}`}>
                          <div>
                            <strong>{getHumanAction(row)}</strong>
                            <span>{formatDate(getEventTime(row))}</span>
                          </div>
                          <dl>
                            <div>
                              <dt>访客</dt>
                              <dd>{visitorProfile?.label ?? "未知访客"}</dd>
                            </div>
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
                      );
                    })
                  ) : (
                    <p className="admin-empty">暂无原始记录。</p>
                  )}

                  {canShowMoreRaw && (
                    <button
                      className="admin-secondary-button"
                      onClick={() =>
                        setVisibleRawCount((count) => Math.min(count + rawBatchSize, dashboard.cleanRows.length))
                      }
                      type="button"
                    >
                      再显示 {Math.min(rawBatchSize, dashboard.cleanRows.length - visibleRawCount)} 条
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
