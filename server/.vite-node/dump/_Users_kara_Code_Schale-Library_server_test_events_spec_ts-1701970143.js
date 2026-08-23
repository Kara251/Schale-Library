// /Users/kara/Code/Schale-Library/server/test/events.spec.ts
const __vite_ssr_import_0__ = await __vite_ssr_import__("vitest", {"importedNames":["describe","it","expect","beforeEach","beforeAll"]});
const __vite_ssr_import_1__ = await __vite_ssr_import__("/@id/__x00__cloudflare:test-3572c4d3-537c-49a9-b747-19a38362b9c7", {"importedNames":["env"]});
const __vite_ssr_import_2__ = await __vite_ssr_import__("/src/index.ts", {"importedNames":["default"]});
const __vite_ssr_import_3__ = await __vite_ssr_import__("/test/helpers.ts", {"importedNames":["applyBaseline"]});




const NOW = Date.now();
const HOUR = 36e5;
async function seedEvent(overrides, location) {
  const row = {
    document_id: `evt-${Math.random().toString(36).slice(2, 10)}`,
    kind: "online",
    title_json: JSON.stringify({ "zh-Hans": "默认线上活动", en: "Default Online" }),
    nature: "official",
    organizer_verified: 0,
    created_at: NOW,
    updated_at: NOW,
    published_at: NOW - DAY,
    ...overrides
  };
  const res = await __vite_ssr_import_1__.env.DB.prepare(
    "INSERT INTO events (document_id, kind, title_json, description_json, nature, event_format, status_override, start_time, end_time, link, cover_image_url, organizer, organizer_verified, source_platform, source_url, tags_json, guests_json, ticket_price_text_json, price_min, price_max, currency, ticket_status, ticket_url, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id"
  ).bind(
    row.document_id,
    row.kind,
    row.title_json,
    row.description_json ?? null,
    row.nature,
    row.event_format ?? null,
    row.status_override ?? null,
    row.start_time ?? null,
    row.end_time ?? null,
    row.link ?? null,
    row.cover_image_url ?? null,
    row.organizer ?? null,
    row.organizer_verified ?? 0,
    row.source_platform ?? null,
    row.source_url ?? null,
    row.tags_json ?? null,
    row.guests_json ?? null,
    row.ticket_price_text_json ?? null,
    row.price_min ?? null,
    row.price_max ?? null,
    row.currency ?? null,
    row.ticket_status ?? null,
    row.ticket_url ?? null,
    row.created_at,
    row.updated_at,
    row.published_at
  ).first();
  const id = res.id;
  if (location) {
    await __vite_ssr_import_1__.env.DB.prepare("INSERT INTO event_locations (event_id, country, region, city, venue, address, location_note, map_url) VALUES (?,?,?,?,?,?,?,?)").bind(
      id,
      location.country ?? null,
      location.region ?? null,
      location.city ?? null,
      location.venue ?? null,
      location.address ?? null,
      location.location_note ?? null,
      location.map_url ?? null
    ).run();
  }
  return id;
}
const DAY = 864e5;
const CONTENT_TABLES = ["event_locations", "events"];
async function resetContentTables() {
  for (const t of CONTENT_TABLES) await __vite_ssr_import_1__.env.DB.prepare(`DELETE FROM ${t}`).run();
}
__vite_ssr_import_0__.describe("GET /online-events", () => {
  __vite_ssr_import_0__.beforeAll(() => __vite_ssr_import_3__.applyBaseline(__vite_ssr_import_1__.env.DB));
  __vite_ssr_import_0__.beforeEach(resetContentTables);
  __vite_ssr_import_0__.it("返回已发布列表并按 locale 回退（zh-Hans 缺失 → en）", async () => {
    await seedEvent({ title_json: JSON.stringify({ en: "EN Only Title" }), start_time: NOW + HOUR, end_time: NOW + 2 * HOUR });
    await seedEvent({ title_json: JSON.stringify({ "zh-Hans": "中文标题" }), start_time: NOW + 3 * HOUR, end_time: NOW + 4 * HOUR });
    const r = await __vite_ssr_import_2__.default.request("/online-events?locale=zh-Hans", {}, __vite_ssr_import_1__.env);
    __vite_ssr_import_0__.expect(r.status).toBe(200);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.data).toHaveLength(2);
    const titles = body.data.map((d) => d.title);
    __vite_ssr_import_0__.expect(titles).toContain("EN Only Title");
    __vite_ssr_import_0__.expect(titles).toContain("中文标题");
    __vite_ssr_import_0__.expect(body.meta.pagination.total).toBe(2);
    const first = body.data[0];
    for (const key of ["id", "documentId", "title", "nature", "startTime", "endTime", "organizer", "tags"]) {
      __vite_ssr_import_0__.expect(first).toHaveProperty(key);
    }
  });
  __vite_ssr_import_0__.it("草稿（published_at NULL）不可见", async () => {
    await seedEvent({ published_at: null, title_json: JSON.stringify({ "zh-Hans": "草稿活动" }) });
    await seedEvent({ title_json: JSON.stringify({ "zh-Hans": "已发布" }) });
    const r = await __vite_ssr_import_2__.default.request("/offline-events", {}, __vite_ssr_import_1__.env);
    __vite_ssr_import_0__.expect(r.status).toBe(200);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.data).toHaveLength(0);
    const r2 = await __vite_ssr_import_2__.default.request("/online-events", {}, __vite_ssr_import_1__.env);
    const body2 = await r2.json();
    __vite_ssr_import_0__.expect(body2.data.map((d) => d.title)).toEqual(["已发布"]);
  });
  __vite_ssr_import_0__.it("nature 筛选生效", async () => {
    await seedEvent({ nature: "fanmade", title_json: JSON.stringify({ "zh-Hans": "同人展" }) });
    await seedEvent({ nature: "official", title_json: JSON.stringify({ "zh-Hans": "官方直播" }) });
    const r = await __vite_ssr_import_2__.default.request("/online-events?filters[nature][$eq]=fanmade", {}, __vite_ssr_import_1__.env);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.data).toHaveLength(1);
    __vite_ssr_import_0__.expect(body.data[0].title).toBe("同人展");
    __vite_ssr_import_0__.expect(body.data[0].nature).toBe("fanmade");
  });
});
__vite_ssr_import_0__.describe("GET /offline-events", () => {
  __vite_ssr_import_0__.beforeAll(() => __vite_ssr_import_3__.applyBaseline(__vite_ssr_import_1__.env.DB));
  __vite_ssr_import_0__.beforeEach(resetContentTables);
  __vite_ssr_import_0__.it("输出 location/venue/city/mapUrl 消费字段并支持 city containsi 筛选", async () => {
    await seedEvent(
      { kind: "offline", title_json: JSON.stringify({ "zh-Hans": "东京展会" }) },
      { country: "日本", region: "关东", city: "东京", venue: "东京国际展示场", address: "江东区有明3-11-1", map_url: "https://maps.example.com/tokyo" }
    );
    await seedEvent(
      { kind: "offline", title_json: JSON.stringify({ "zh-Hans": "上海展会" }) },
      { country: "中国", region: "华东", city: "上海", venue: "新国际博览中心", address: null, map_url: null }
    );
    const r = await __vite_ssr_import_2__.default.request("/offline-events?filters[city][$containsi]=东京", {}, __vite_ssr_import_1__.env);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.data).toHaveLength(1);
    const ev = body.data[0];
    __vite_ssr_import_0__.expect(ev.location).toContain("东京国际展示场");
    __vite_ssr_import_0__.expect(ev.city).toBe("东京");
    __vite_ssr_import_0__.expect(ev.mapUrl).toBe("https://maps.example.com/tokyo");
  });
  __vite_ssr_import_0__.it("详情端点：数字 id 与 documentId 均可取，404 保护", async () => {
    const id = await seedEvent({
      kind: "offline",
      title_json: JSON.stringify({ "zh-Hans": "详情活动" })
    }, { city: "京都" });
    const byId = await __vite_ssr_import_2__.default.request(`/offline-events/${id}`, {}, __vite_ssr_import_1__.env);
    __vite_ssr_import_0__.expect(byId.status).toBe(200);
    const bodyById = await byId.json();
    __vite_ssr_import_0__.expect(bodyById.data.id).toBe(id);
    const docRes = await __vite_ssr_import_1__.env.DB.prepare("SELECT document_id FROM events WHERE id = ?").bind(id).first();
    const byDoc = await __vite_ssr_import_2__.default.request(`/offline-events/${docRes.document_id}`, {}, __vite_ssr_import_1__.env);
    const bodyByDoc = await byDoc.json();
    __vite_ssr_import_0__.expect(bodyByDoc.data.documentId).toBe(docRes.document_id);
    const missing = await __vite_ssr_import_2__.default.request("/offline-events/999999", {}, __vite_ssr_import_1__.env);
    __vite_ssr_import_0__.expect(missing.status).toBe(404);
  });
});
__vite_ssr_import_0__.describe("GET /events-bundle", () => {
  __vite_ssr_import_0__.beforeAll(() => __vite_ssr_import_3__.applyBaseline(__vite_ssr_import_1__.env.DB));
  __vite_ssr_import_0__.beforeEach(resetContentTables);
  __vite_ssr_import_0__.it("一次返回合并列表与去重 locationRecords", async () => {
    await seedEvent({ title_json: JSON.stringify({ "zh-Hans": "线上A" }) }, { country: "日本", region: "全国" });
    await seedEvent({ title_json: JSON.stringify({ "zh-Hans": "线上B" }) }, { country: "日本", region: "全国" });
    await seedEvent(
      { kind: "offline", title_json: JSON.stringify({ "zh-Hans": "线下C" }) },
      { country: "日本", region: "关东", city: "千叶" }
    );
    const r = await __vite_ssr_import_2__.default.request("/events-bundle", {}, __vite_ssr_import_1__.env);
    __vite_ssr_import_0__.expect(r.status).toBe(200);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.data).toHaveLength(3);
    __vite_ssr_import_0__.expect(body.meta.pagination.total).toBe(3);
    __vite_ssr_import_0__.expect(body.locationRecords).toEqual([
      { kind: "online", country: "日本", region: "全国", city: "" },
      { kind: "offline", country: "日本", region: "关东", city: "千叶" }
    ]);
  });
  __vite_ssr_import_0__.it("分页切片正确", async () => {
    for (let i = 0; i < 5; i++) {
      await seedEvent({ title_json: JSON.stringify({ "zh-Hans": `第${i}场` }), start_time: NOW - i * HOUR });
    }
    const r = await __vite_ssr_import_2__.default.request("/events-bundle?page=2&pageSize=2", {}, __vite_ssr_import_1__.env);
    const body = await r.json();
    __vite_ssr_import_0__.expect(body.meta.pagination.page).toBe(2);
    __vite_ssr_import_0__.expect(body.meta.pagination.total).toBe(5);
    __vite_ssr_import_0__.expect(body.meta.pagination.pageCount).toBe(3);
    __vite_ssr_import_0__.expect(body.data).toHaveLength(2);
  });
});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFZLEtBQUssVUFBVSxFQUFFLFdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLFlBQVksTUFBTSxJQUFJLEtBQUssQ0FBQztBQUFBLElBQ3JHO0FBQ0EsVUFBTSxJQUFJLE1BQU0sOEJBQUksUUFBUSxvQ0FBb0MsQ0FBQyxHQUFHLHlCQUFHO0FBQ3ZFLFVBQU0sT0FBUSxNQUFNLEVBQUUsS0FBSztBQUMzQixpQ0FBTyxLQUFLLEtBQUssV0FBVyxJQUFJLEVBQUUsS0FBSyxDQUFDO0FBQ3hDLGlDQUFPLEtBQUssS0FBSyxXQUFXLEtBQUssRUFBRSxLQUFLLENBQUM7QUFDekMsaUNBQU8sS0FBSyxLQUFLLFdBQVcsU0FBUyxFQUFFLEtBQUssQ0FBQztBQUM3QyxpQ0FBTyxLQUFLLElBQUksRUFBRSxhQUFhLENBQUM7QUFBQSxFQUNsQyxDQUFDO0FBQ0gsQ0FBQyIsIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiZXZlbnRzLnNwZWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBldmVudHMg5Z+f5YWs5byAIEFQSSDmtYvor5XjgIJcbiAqIOeUqOS+i++8mmxvY2FsZSDlm57pgIDvvIh6aC1IYW5zIOe8uuWkseaXtuWbnumAgCBlbu+8ieOAgeiNieeov+S4jeWPr+ingeOAgXJlbGV2YW50IOaOkuW6j+OAgVxuICog562b6YCJ77yIbmF0dXJlL2NpdHnvvInjgIHor6bmg4UgYnkgZG9jdW1lbnRJZCDkuI7mlbDlrZcgaWTjgIFidW5kbGUg55qEIGxvY2F0aW9uUmVjb3JkcyDljrvph43jgIJcbiAqL1xuaW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QsIGJlZm9yZUVhY2gsIGJlZm9yZUFsbCB9IGZyb20gJ3ZpdGVzdCdcbmltcG9ydCB7IGVudiB9IGZyb20gJ2Nsb3VkZmxhcmU6dGVzdCdcbmltcG9ydCBhcHAgZnJvbSAnLi4vc3JjL2luZGV4J1xuaW1wb3J0IHsgYXBwbHlCYXNlbGluZSB9IGZyb20gJy4vaGVscGVycydcblxuY29uc3QgTk9XID0gRGF0ZS5ub3coKVxuY29uc3QgSE9VUiA9IDM2MDBfMDAwXG5cbmFzeW5jIGZ1bmN0aW9uIHNlZWRFdmVudChvdmVycmlkZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+LCBsb2NhdGlvbj86IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bGw+KTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3Qgcm93OiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IHtcbiAgICBkb2N1bWVudF9pZDogYGV2dC0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDEwKX1gLFxuICAgIGtpbmQ6ICdvbmxpbmUnLFxuICAgIHRpdGxlX2pzb246IEpTT04uc3RyaW5naWZ5KHsgJ3poLUhhbnMnOiAn6buY6K6k57q/5LiK5rS75YqoJywgZW46ICdEZWZhdWx0IE9ubGluZScgfSksXG4gICAgbmF0dXJlOiAnb2ZmaWNpYWwnLFxuICAgIG9yZ2FuaXplcl92ZXJpZmllZDogMCxcbiAgICBjcmVhdGVkX2F0OiBOT1csXG4gICAgdXBkYXRlZF9hdDogTk9XLFxuICAgIHB1Ymxpc2hlZF9hdDogTk9XIC0gREFZLFxuICAgIC4uLm92ZXJyaWRlcyxcbiAgfVxuICBjb25zdCByZXMgPSBhd2FpdCBlbnYuREIucHJlcGFyZShcbiAgICAnSU5TRVJUIElOVE8gZXZlbnRzIChkb2N1bWVudF9pZCwga2luZCwgdGl0bGVfanNvbiwgZGVzY3JpcHRpb25fanNvbiwgbmF0dXJlLCBldmVudF9mb3JtYXQsIHN0YXR1c19vdmVycmlkZSwgc3RhcnRfdGltZSwgZW5kX3RpbWUsIGxpbmssIGNvdmVyX2ltYWdlX3VybCwgb3JnYW5pemVyLCBvcmdhbml6ZXJfdmVyaWZpZWQsIHNvdXJjZV9wbGF0Zm9ybSwgc291cmNlX3VybCwgdGFnc19qc29uLCBndWVzdHNfanNvbiwgdGlja2V0X3ByaWNlX3RleHRfanNvbiwgcHJpY2VfbWluLCBwcmljZV9tYXgsIGN1cnJlbmN5LCB0aWNrZXRfc3RhdHVzLCB0aWNrZXRfdXJsLCBjcmVhdGVkX2F0LCB1cGRhdGVkX2F0LCBwdWJsaXNoZWRfYXQpIFZBTFVFUyAoPyw/LD8sPyw/LD8sPyw/LD8sPyw/LD8sPyw/LD8sPyw/LD8sPyw/LD8sPyw/LD8sPyw/KSBSRVRVUk5JTkcgaWQnXG4gIClcbiAgICAuYmluZChcbiAgICAgIHJvdy5kb2N1bWVudF9pZCxcbiAgICAgIHJvdy5raW5kLFxuICAgICAgcm93LnRpdGxlX2pzb24sXG4gICAgICByb3cuZGVzY3JpcHRpb25fanNvbiA/PyBudWxsLFxuICAgICAgcm93Lm5hdHVyZSxcbiAgICAgIHJvdy5ldmVudF9mb3JtYXQgPz8gbnVsbCxcbiAgICAgIHJvdy5zdGF0dXNfb3ZlcnJpZGUgPz8gbnVsbCxcbiAgICAgIHJvdy5zdGFydF90aW1lID8/IG51bGwsXG4gICAgICByb3cuZW5kX3RpbWUgPz8gbnVsbCxcbiAgICAgIHJvdy5saW5rID8/IG51bGwsXG4gICAgICByb3cuY292ZXJfaW1hZ2VfdXJsID8/IG51bGwsXG4gICAgICByb3cub3JnYW5pemVyID8/IG51bGwsXG4gICAgICByb3cub3JnYW5pemVyX3ZlcmlmaWVkID8/IDAsXG4gICAgICByb3cuc291cmNlX3BsYXRmb3JtID8/IG51bGwsXG4gICAgICByb3cuc291cmNlX3VybCA/PyBudWxsLFxuICAgICAgcm93LnRhZ3NfanNvbiA/PyBudWxsLFxuICAgICAgcm93Lmd1ZXN0c19qc29uID8/IG51bGwsXG4gICAgICByb3cudGlja2V0X3ByaWNlX3RleHRfanNvbiA/PyBudWxsLFxuICAgICAgcm93LnByaWNlX21pbiA/PyBudWxsLFxuICAgICAgcm93LnByaWNlX21heCA/PyBudWxsLFxuICAgICAgcm93LmN1cnJlbmN5ID8/IG51bGwsXG4gICAgICByb3cudGlja2V0X3N0YXR1cyA/PyBudWxsLFxuICAgICAgcm93LnRpY2tldF91cmwgPz8gbnVsbCxcbiAgICAgIHJvdy5jcmVhdGVkX2F0LFxuICAgICAgcm93LnVwZGF0ZWRfYXQsXG4gICAgICByb3cucHVibGlzaGVkX2F0XG4gICAgKVxuICAgIC5maXJzdDx7IGlkOiBudW1iZXIgfT4oKVxuICBjb25zdCBpZCA9IHJlcyEuaWRcbiAgaWYgKGxvY2F0aW9uKSB7XG4gICAgYXdhaXQgZW52LkRCLnByZXBhcmUoJ0lOU0VSVCBJTlRPIGV2ZW50X2xvY2F0aW9ucyAoZXZlbnRfaWQsIGNvdW50cnksIHJlZ2lvbiwgY2l0eSwgdmVudWUsIGFkZHJlc3MsIGxvY2F0aW9uX25vdGUsIG1hcF91cmwpIFZBTFVFUyAoPyw/LD8sPyw/LD8sPyw/KScpLmJpbmQoXG4gICAgICBpZCxcbiAgICAgIGxvY2F0aW9uLmNvdW50cnkgPz8gbnVsbCxcbiAgICAgIGxvY2F0aW9uLnJlZ2lvbiA/PyBudWxsLFxuICAgICAgbG9jYXRpb24uY2l0eSA/PyBudWxsLFxuICAgICAgbG9jYXRpb24udmVudWUgPz8gbnVsbCxcbiAgICAgIGxvY2F0aW9uLmFkZHJlc3MgPz8gbnVsbCxcbiAgICAgIGxvY2F0aW9uLmxvY2F0aW9uX25vdGUgPz8gbnVsbCxcbiAgICAgIGxvY2F0aW9uLm1hcF91cmwgPz8gbnVsbFxuICAgICkucnVuKClcbiAgfVxuICByZXR1cm4gaWRcbn1cblxuY29uc3QgREFZID0gODZfNDAwXzAwMFxuXG5jb25zdCBDT05URU5UX1RBQkxFUyA9IFsnZXZlbnRfbG9jYXRpb25zJywgJ2V2ZW50cyddXG5cbmFzeW5jIGZ1bmN0aW9uIHJlc2V0Q29udGVudFRhYmxlcygpOiBQcm9taXNlPHZvaWQ+IHtcbiAgZm9yIChjb25zdCB0IG9mIENPTlRFTlRfVEFCTEVTKSBhd2FpdCBlbnYuREIucHJlcGFyZShgREVMRVRFIEZST00gJHt0fWApLnJ1bigpXG59XG5cbmRlc2NyaWJlKCdHRVQgL29ubGluZS1ldmVudHMnLCAoKSA9PiB7XG4gIGJlZm9yZUFsbCgoKSA9PiBhcHBseUJhc2VsaW5lKGVudi5EQikpXG4gIGJlZm9yZUVhY2gocmVzZXRDb250ZW50VGFibGVzKVxuXG4gIGl0KCfov5Tlm57lt7Llj5HluIPliJfooajlubbmjIkgbG9jYWxlIOWbnumAgO+8iHpoLUhhbnMg57y65aSxIOKGkiBlbu+8iScsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBzZWVkRXZlbnQoeyB0aXRsZV9qc29uOiBKU09OLnN0cmluZ2lmeSh7IGVuOiAnRU4gT25seSBUaXRsZScgfSksIHN0YXJ0X3RpbWU6IE5PVyArIEhPVVIsIGVuZF90aW1lOiBOT1cgKyAyICogSE9VUiB9KVxuICAgIGF3YWl0IHNlZWRFdmVudCh7IHRpdGxlX2pzb246IEpTT04uc3RyaW5naWZ5KHsgJ3poLUhhbnMnOiAn5Lit5paH5qCH6aKYJyB9KSwgc3RhcnRfdGltZTogTk9XICsgMyAqIEhPVVIsIGVuZF90aW1lOiBOT1cgKyA0ICogSE9VUiB9KVxuXG4gICAgY29uc3QgciA9IGF3YWl0IGFwcC5yZXF1ZXN0KCcvb25saW5lLWV2ZW50cz9sb2NhbGU9emgtSGFucycsIHt9LCBlbnYpXG4gICAgZXhwZWN0KHIuc3RhdHVzKS50b0JlKDIwMClcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IHIuanNvbigpKSBhcyB7IGRhdGE6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PjsgbWV0YTogeyBwYWdpbmF0aW9uOiB7IHRvdGFsOiBudW1iZXIgfSB9IH1cbiAgICBleHBlY3QoYm9keS5kYXRhKS50b0hhdmVMZW5ndGgoMilcbiAgICBjb25zdCB0aXRsZXMgPSBib2R5LmRhdGEubWFwKChkKSA9PiBkLnRpdGxlKVxuICAgIGV4cGVjdCh0aXRsZXMpLnRvQ29udGFpbignRU4gT25seSBUaXRsZScpXG4gICAgZXhwZWN0KHRpdGxlcykudG9Db250YWluKCfkuK3mlofmoIfpopgnKVxuICAgIGV4cGVjdChib2R5Lm1ldGEucGFnaW5hdGlvbi50b3RhbCkudG9CZSgyKVxuICAgIC8vIOa2iOi0ueWtl+auteWvueaLjVxuICAgIGNvbnN0IGZpcnN0ID0gYm9keS5kYXRhWzBdXG4gICAgZm9yIChjb25zdCBrZXkgb2YgWydpZCcsICdkb2N1bWVudElkJywgJ3RpdGxlJywgJ25hdHVyZScsICdzdGFydFRpbWUnLCAnZW5kVGltZScsICdvcmdhbml6ZXInLCAndGFncyddKSB7XG4gICAgICBleHBlY3QoZmlyc3QpLnRvSGF2ZVByb3BlcnR5KGtleSlcbiAgICB9XG4gIH0pXG5cbiAgaXQoJ+iNieeov++8iHB1Ymxpc2hlZF9hdCBOVUxM77yJ5LiN5Y+v6KeBJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHNlZWRFdmVudCh7IHB1Ymxpc2hlZF9hdDogbnVsbCwgdGl0bGVfanNvbjogSlNPTi5zdHJpbmdpZnkoeyAnemgtSGFucyc6ICfojYnnqL/mtLvliqgnIH0pIH0pXG4gICAgYXdhaXQgc2VlZEV2ZW50KHsgdGl0bGVfanNvbjogSlNPTi5zdHJpbmdpZnkoeyAnemgtSGFucyc6ICflt7Llj5HluIMnIH0pIH0pXG5cbiAgICBjb25zdCByID0gYXdhaXQgYXBwLnJlcXVlc3QoJy9vZmZsaW5lLWV2ZW50cycsIHt9LCBlbnYpXG4gICAgZXhwZWN0KHIuc3RhdHVzKS50b0JlKDIwMClcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IHIuanNvbigpKSBhcyB7IGRhdGE6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiB9XG4gICAgZXhwZWN0KGJvZHkuZGF0YSkudG9IYXZlTGVuZ3RoKDApXG5cbiAgICBjb25zdCByMiA9IGF3YWl0IGFwcC5yZXF1ZXN0KCcvb25saW5lLWV2ZW50cycsIHt9LCBlbnYpXG4gICAgY29uc3QgYm9keTIgPSAoYXdhaXQgcjIuanNvbigpKSBhcyB7IGRhdGE6IEFycmF5PHsgdGl0bGU6IHN0cmluZyB9PiB9XG4gICAgZXhwZWN0KGJvZHkyLmRhdGEubWFwKChkKSA9PiBkLnRpdGxlKSkudG9FcXVhbChbJ+W3suWPkeW4gyddKVxuICB9KVxuXG4gIGl0KCduYXR1cmUg562b6YCJ55Sf5pWIJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHNlZWRFdmVudCh7IG5hdHVyZTogJ2Zhbm1hZGUnLCB0aXRsZV9qc29uOiBKU09OLnN0cmluZ2lmeSh7ICd6aC1IYW5zJzogJ+WQjOS6uuWxlScgfSkgfSlcbiAgICBhd2FpdCBzZWVkRXZlbnQoeyBuYXR1cmU6ICdvZmZpY2lhbCcsIHRpdGxlX2pzb246IEpTT04uc3RyaW5naWZ5KHsgJ3poLUhhbnMnOiAn5a6Y5pa555u05pKtJyB9KSB9KVxuXG4gICAgY29uc3QgciA9IGF3YWl0IGFwcC5yZXF1ZXN0KCcvb25saW5lLWV2ZW50cz9maWx0ZXJzW25hdHVyZV1bJGVxXT1mYW5tYWRlJywge30sIGVudilcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IHIuanNvbigpKSBhcyB7IGRhdGE6IEFycmF5PHsgdGl0bGU6IHN0cmluZzsgbmF0dXJlOiBzdHJpbmcgfT4gfVxuICAgIGV4cGVjdChib2R5LmRhdGEpLnRvSGF2ZUxlbmd0aCgxKVxuICAgIGV4cGVjdChib2R5LmRhdGFbMF0udGl0bGUpLnRvQmUoJ+WQjOS6uuWxlScpXG4gICAgZXhwZWN0KGJvZHkuZGF0YVswXS5uYXR1cmUpLnRvQmUoJ2Zhbm1hZGUnKVxuICB9KVxufSlcblxuZGVzY3JpYmUoJ0dFVCAvb2ZmbGluZS1ldmVudHMnLCAoKSA9PiB7XG4gIGJlZm9yZUFsbCgoKSA9PiBhcHBseUJhc2VsaW5lKGVudi5EQikpXG4gIGJlZm9yZUVhY2gocmVzZXRDb250ZW50VGFibGVzKVxuXG4gIGl0KCfovpPlh7ogbG9jYXRpb24vdmVudWUvY2l0eS9tYXBVcmwg5raI6LS55a2X5q615bm25pSv5oyBIGNpdHkgY29udGFpbnNpIOetm+mAiScsIGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBzZWVkRXZlbnQoXG4gICAgICB7IGtpbmQ6ICdvZmZsaW5lJywgdGl0bGVfanNvbjogSlNPTi5zdHJpbmdpZnkoeyAnemgtSGFucyc6ICfkuJzkuqzlsZXkvJonIH0pIH0sXG4gICAgICB7IGNvdW50cnk6ICfml6XmnKwnLCByZWdpb246ICflhbPkuJwnLCBjaXR5OiAn5Lic5LqsJywgdmVudWU6ICfkuJzkuqzlm73pmYXlsZXnpLrlnLonLCBhZGRyZXNzOiAn5rGf5Lic5Yy65pyJ5piOMy0xMS0xJywgbWFwX3VybDogJ2h0dHBzOi8vbWFwcy5leGFtcGxlLmNvbS90b2t5bycgfVxuICAgIClcbiAgICBhd2FpdCBzZWVkRXZlbnQoXG4gICAgICB7IGtpbmQ6ICdvZmZsaW5lJywgdGl0bGVfanNvbjogSlNPTi5zdHJpbmdpZnkoeyAnemgtSGFucyc6ICfkuIrmtbflsZXkvJonIH0pIH0sXG4gICAgICB7IGNvdW50cnk6ICfkuK3lm70nLCByZWdpb246ICfljY7kuJwnLCBjaXR5OiAn5LiK5rW3JywgdmVudWU6ICfmlrDlm73pmYXljZrop4jkuK3lv4MnLCBhZGRyZXNzOiBudWxsLCBtYXBfdXJsOiBudWxsIH1cbiAgICApXG5cbiAgICBjb25zdCByID0gYXdhaXQgYXBwLnJlcXVlc3QoJy9vZmZsaW5lLWV2ZW50cz9maWx0ZXJzW2NpdHldWyRjb250YWluc2ldPeS4nOS6rCcsIHt9LCBlbnYpXG4gICAgY29uc3QgYm9keSA9IChhd2FpdCByLmpzb24oKSkgYXMgeyBkYXRhOiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gfVxuICAgIGV4cGVjdChib2R5LmRhdGEpLnRvSGF2ZUxlbmd0aCgxKVxuICAgIGNvbnN0IGV2ID0gYm9keS5kYXRhWzBdXG4gICAgZXhwZWN0KGV2LmxvY2F0aW9uKS50b0NvbnRhaW4oJ+S4nOS6rOWbvemZheWxleekuuWcuicpXG4gICAgZXhwZWN0KGV2LmNpdHkpLnRvQmUoJ+S4nOS6rCcpXG4gICAgZXhwZWN0KGV2Lm1hcFVybCkudG9CZSgnaHR0cHM6Ly9tYXBzLmV4YW1wbGUuY29tL3Rva3lvJylcbiAgfSlcblxuICBpdCgn6K+m5oOF56uv54K577ya5pWw5a2XIGlkIOS4jiBkb2N1bWVudElkIOWdh+WPr+WPlu+8jDQwNCDkv53miqQnLCBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgaWQgPSBhd2FpdCBzZWVkRXZlbnQoe1xuICAgICAga2luZDogJ29mZmxpbmUnLFxuICAgICAgdGl0bGVfanNvbjogSlNPTi5zdHJpbmdpZnkoeyAnemgtSGFucyc6ICfor6bmg4XmtLvliqgnIH0pLFxuICAgIH0sIHsgY2l0eTogJ+S6rOmDvScgfSlcblxuICAgIGNvbnN0IGJ5SWQgPSBhd2FpdCBhcHAucmVxdWVzdChgL29mZmxpbmUtZXZlbnRzLyR7aWR9YCwge30sIGVudilcbiAgICBleHBlY3QoYnlJZC5zdGF0dXMpLnRvQmUoMjAwKVxuICAgIGNvbnN0IGJvZHlCeUlkID0gKGF3YWl0IGJ5SWQuanNvbigpKSBhcyB7IGRhdGE6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH1cbiAgICBleHBlY3QoYm9keUJ5SWQuZGF0YS5pZCkudG9CZShpZClcblxuICAgIGNvbnN0IGRvY1JlcyA9IGF3YWl0IGVudi5EQi5wcmVwYXJlKCdTRUxFQ1QgZG9jdW1lbnRfaWQgRlJPTSBldmVudHMgV0hFUkUgaWQgPSA/JykuYmluZChpZCkuZmlyc3Q8eyBkb2N1bWVudF9pZDogc3RyaW5nIH0+KClcbiAgICBjb25zdCBieURvYyA9IGF3YWl0IGFwcC5yZXF1ZXN0KGAvb2ZmbGluZS1ldmVudHMvJHtkb2NSZXMhLmRvY3VtZW50X2lkfWAsIHt9LCBlbnYpXG4gICAgY29uc3QgYm9keUJ5RG9jID0gKGF3YWl0IGJ5RG9jLmpzb24oKSkgYXMgeyBkYXRhOiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB9XG4gICAgZXhwZWN0KGJvZHlCeURvYy5kYXRhLmRvY3VtZW50SWQpLnRvQmUoZG9jUmVzIS5kb2N1bWVudF9pZClcblxuICAgIGNvbnN0IG1pc3NpbmcgPSBhd2FpdCBhcHAucmVxdWVzdCgnL29mZmxpbmUtZXZlbnRzLzk5OTk5OScsIHt9LCBlbnYpXG4gICAgZXhwZWN0KG1pc3Npbmcuc3RhdHVzKS50b0JlKDQwNClcbiAgfSlcbn0pXG5cbmRlc2NyaWJlKCdHRVQgL2V2ZW50cy1idW5kbGUnLCAoKSA9PiB7XG4gIGJlZm9yZUFsbCgoKSA9PiBhcHBseUJhc2VsaW5lKGVudi5EQikpXG4gIGJlZm9yZUVhY2gocmVzZXRDb250ZW50VGFibGVzKVxuXG4gIGl0KCfkuIDmrKHov5Tlm57lkIjlubbliJfooajkuI7ljrvph40gbG9jYXRpb25SZWNvcmRzJywgYXN5bmMgKCkgPT4ge1xuICAgIGF3YWl0IHNlZWRFdmVudCh7IHRpdGxlX2pzb246IEpTT04uc3RyaW5naWZ5KHsgJ3poLUhhbnMnOiAn57q/5LiKQScgfSkgfSwgeyBjb3VudHJ5OiAn5pel5pysJywgcmVnaW9uOiAn5YWo5Zu9JyB9KVxuICAgIGF3YWl0IHNlZWRFdmVudCh7IHRpdGxlX2pzb246IEpTT04uc3RyaW5naWZ5KHsgJ3poLUhhbnMnOiAn57q/5LiKQicgfSkgfSwgeyBjb3VudHJ5OiAn5pel5pysJywgcmVnaW9uOiAn5YWo5Zu9JyB9KSAvLyDlkIzlnLDljLog4oaSIOWOu+mHjVxuICAgIGF3YWl0IHNlZWRFdmVudChcbiAgICAgIHsga2luZDogJ29mZmxpbmUnLCB0aXRsZV9qc29uOiBKU09OLnN0cmluZ2lmeSh7ICd6aC1IYW5zJzogJ+e6v+S4i0MnIH0pIH0sXG4gICAgICB7IGNvdW50cnk6ICfml6XmnKwnLCByZWdpb246ICflhbPkuJwnLCBjaXR5OiAn5Y2D5Y+2JyB9XG4gICAgKVxuXG4gICAgY29uc3QgciA9IGF3YWl0IGFwcC5yZXF1ZXN0KCcvZXZlbnRzLWJ1bmRsZScsIHt9LCBlbnYpXG4gICAgZXhwZWN0KHIuc3RhdHVzKS50b0JlKDIwMClcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IHIuanNvbigpKSBhcyB7XG4gICAgICBkYXRhOiBBcnJheTx7IHR5cGU6IHN0cmluZzsgZXZlbnQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IH0+XG4gICAgICBtZXRhOiB7IHBhZ2luYXRpb246IHsgdG90YWw6IG51bWJlciB9IH1cbiAgICAgIGxvY2F0aW9uUmVjb3JkczogQXJyYXk8eyBraW5kOiBzdHJpbmc7IGNvdW50cnk6IHN0cmluZzsgcmVnaW9uOiBzdHJpbmc7IGNpdHk6IHN0cmluZyB9PlxuICAgIH1cbiAgICBleHBlY3QoYm9keS5kYXRhKS50b0hhdmVMZW5ndGgoMylcbiAgICBleHBlY3QoYm9keS5tZXRhLnBhZ2luYXRpb24udG90YWwpLnRvQmUoMylcbiAgICBleHBlY3QoYm9keS5sb2NhdGlvblJlY29yZHMpLnRvRXF1YWwoW1xuICAgICAgeyBraW5kOiAnb25saW5lJywgY291bnRyeTogJ+aXpeacrCcsIHJlZ2lvbjogJ+WFqOWbvScsIGNpdHk6ICcnIH0sXG4gICAgICB7IGtpbmQ6ICdvZmZsaW5lJywgY291bnRyeTogJ+aXpeacrCcsIHJlZ2lvbjogJ+WFs+S4nCcsIGNpdHk6ICfljYPlj7YnIH0sXG4gICAgXSlcbiAgfSlcblxuICBpdCgn5YiG6aG15YiH54mH5q2j56GuJywgYXN5bmMgKCkgPT4ge1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgNTsgaSsrKSB7XG4gICAgICBhd2FpdCBzZWVkRXZlbnQoeyB0aXRsZV9qc29uOiBKU09OLnN0cmluZ2lmeSh7ICd6aC1IYW5zJzogYOesrCR7aX3lnLpgIH0pLCBzdGFydF90aW1lOiBOT1cgLSBpICogSE9VUiB9KVxuICAgIH1cbiAgICBjb25zdCByID0gYXdhaXQgYXBwLnJlcXVlc3QoJy9ldmVudHMtYnVuZGxlP3BhZ2U9MiZwYWdlU2l6ZT0yJywge30sIGVudilcbiAgICBjb25zdCBib2R5ID0gKGF3YWl0IHIuanNvbigpKSBhcyB7IGRhdGE6IEFycmF5PHsgZXZlbnQ6IHsgdGl0bGU6IHN0cmluZyB9IH0+OyBtZXRhOiB7IHBhZ2luYXRpb246IHsgcGFnZTogbnVtYmVyOyBwYWdlQ291bnQ6IG51bWJlcjsgdG90YWw6IG51bWJlciB9IH0gfVxuICAgIGV4cGVjdChib2R5Lm1ldGEucGFnaW5hdGlvbi5wYWdlKS50b0JlKDIpXG4gICAgZXhwZWN0KGJvZHkubWV0YS5wYWdpbmF0aW9uLnRvdGFsKS50b0JlKDUpXG4gICAgZXhwZWN0KGJvZHkubWV0YS5wYWdpbmF0aW9uLnBhZ2VDb3VudCkudG9CZSgzKVxuICAgIGV4cGVjdChib2R5LmRhdGEpLnRvSGF2ZUxlbmd0aCgyKVxuICB9KVxufSlcbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvdGVzdC9ldmVudHMuc3BlYy50cyJ9
