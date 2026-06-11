alter table public.h5_events
  add column if not exists visitor_id text;

create index if not exists h5_events_visitor_id_idx
  on public.h5_events (visitor_id);

-- 可选：如果后续需要把旧数据也回填到独立列，再单独运行下面这段。
-- 后台代码已经会从 data.visitorId 兜底读取，所以不回填也能识别旧数据。
--
-- update public.h5_events
-- set visitor_id = data->>'visitorId'
-- where visitor_id is null
--   and data ? 'visitorId';
