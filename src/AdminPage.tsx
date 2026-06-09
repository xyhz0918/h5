import { FormEvent, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Table2 } from "lucide-react";
import { trackFunnelEvent } from "./lib/tracking";

type AdminEventRow = Record<string, string | number | boolean | null>;

type AdminResponse = {
  ok: boolean;
  rows?: AdminEventRow[];
  message?: string;
};

const visibleColumns = [
  "serverTime",
  "eventName",
  "sessionId",
  "orderId",
  "page",
  "bugType",
  "description",
  "stage",
  "progress",
  "sourceHost"
];

function formatCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function AdminPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<AdminEventRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const stats = useMemo(() => {
    const sessions = new Set(rows.map((row) => String(row.sessionId ?? "")).filter(Boolean));
    const reports = rows.filter((row) => row.eventName === "report_generated").length;
    const orders = rows.filter((row) => row.eventName === "order_created").length;

    return [
      ["事件数", rows.length],
      ["会话数", sessions.size],
      ["工单数", orders],
      ["报告数", reports]
    ] as const;
  }, [rows]);

  const loadRows = async (nextPassword = password) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: nextPassword, limit: 300 })
      });
      const data = (await response.json()) as AdminResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "后台数据读取失败");
      }

      setRows(data.rows ?? []);
      setIsAuthed(true);
    } catch (error) {
      setRows([]);
      setIsAuthed(false);
      setError(error instanceof Error ? error.message : "后台数据读取失败");
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
    trackFunnelEvent({
      eventName: "page_view",
      page: "admin",
      data: {
        admin: true
      }
    });

    return () => {
      document.body.classList.remove("admin-mode");
    };
  }, []);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-hero">
          <div>
            <span>HORSH DATA CONSOLE</span>
            <h1>早餐透明工厂后台</h1>
            <p>查看 H5 互动漏斗、工单和报告生成数据。</p>
          </div>
          <ShieldCheck size={34} />
        </header>

        {!isAuthed ? (
          <form className="admin-login" onSubmit={submitPassword}>
            <label htmlFor="admin-password">后台密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="输入 ADMIN_PASSWORD"
              onChange={(event) => setPassword(event.target.value)}
            />
            <button disabled={loading || !password.trim()} type="submit">
              {loading ? "读取中..." : "进入后台"}
            </button>
            {error && <p>{error}</p>}
          </form>
        ) : (
          <>
            <section className="admin-toolbar">
              <div>
                <Table2 size={20} />
                <span>最近 300 条互动事件</span>
              </div>
              <button disabled={loading} onClick={() => void loadRows(password)} type="button">
                <RefreshCw size={17} />
                {loading ? "刷新中" : "刷新"}
              </button>
            </section>

            <section className="admin-stats">
              {stats.map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </article>
              ))}
            </section>

            <section className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {visibleColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length > 0 ? (
                    rows.map((row, index) => (
                      <tr key={`${row.serverTime ?? "event"}-${index}`}>
                        {visibleColumns.map((column) => (
                          <td key={column}>{formatCell(row[column])}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={visibleColumns.length}>暂无数据。完成一次 H5 流程后再刷新。</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
