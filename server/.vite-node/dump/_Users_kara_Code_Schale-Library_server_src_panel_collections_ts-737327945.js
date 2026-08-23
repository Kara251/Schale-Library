// /Users/kara/Code/Schale-Library/server/src/panel/collections.ts
const f = (column, kind, localized = false) => ({ column, kind, localized });
const COLLECTIONS = {
  creator: {
    table: "creators",
    localized: true,
    supportsDraft: true,
    searchColumns: ["name", "slug"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "name",
    fields: {
      name: f("name", "text"),
      slug: f("slug", "text"),
      bio: f("bio_json", "text", true),
      platform: f("platform", "text"),
      platformUid: f("platform_uid", "text"),
      homepageUrl: f("homepage_url", "text"),
      avatar: f("avatar_url", "media"),
      isFeatured: f("is_featured", "boolean"),
      featuredPriority: f("featured_priority", "number"),
      needsReview: f("needs_review", "boolean"),
      publishedAt: f("published_at", "published-at")
    }
  },
  students: {
    table: "students",
    localized: true,
    supportsDraft: true,
    searchColumns: ["name", "organization"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "name",
    fields: {
      name: f("name", "text"),
      organization: f("organization", "text"),
      wikiUrl: f("wiki_url", "text"),
      avatar: f("avatar_url", "media"),
      school: f("school_id", "relation-one"),
      publishedAt: f("published_at", "published-at")
    }
  },
  schools: {
    table: "schools",
    localized: true,
    supportsDraft: false,
    searchColumns: ["slug"],
    defaultSort: [
      ["sort_order", "asc"],
      ["updated_at", "desc"]
    ],
    labelColumn: "slug",
    fields: {
      name: f("name_json", "text", true),
      slug: f("slug", "text"),
      description: f("description_json", "text", true),
      shortName: f("short_name_json", "text", true),
      color: f("color", "text"),
      logo: f("logo_url", "media"),
      order: f("sort_order", "number"),
      publishedAt: f("published_at", "published-at")
    }
  },
  events: {
    table: "events",
    localized: true,
    supportsDraft: true,
    searchColumns: ["organizer", "source_platform", "source_url"],
    defaultSort: [["start_time", "desc"]],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      description: f("description_json", "text", true),
      kind: f("kind", "text"),
      nature: f("nature", "text"),
      eventFormat: f("event_format", "text"),
      statusOverride: f("status_override", "text"),
      startTime: f("start_time", "datetime"),
      endTime: f("end_time", "datetime"),
      link: f("link", "text"),
      coverImage: f("cover_image_url", "media"),
      organizer: f("organizer", "text"),
      organizerVerified: f("organizer_verified", "boolean"),
      sourcePlatform: f("source_platform", "text"),
      sourceUrl: f("source_url", "text"),
      lastVerifiedAt: f("last_verified_at", "datetime"),
      tags: f("tags_json", "text"),
      guests: f("guests_json", "text", true),
      ticketPriceText: f("ticket_price_text_json", "text", true),
      priceMin: f("price_min", "number"),
      priceMax: f("price_max", "number"),
      currency: f("currency", "text"),
      ticketStatus: f("ticket_status", "text"),
      ticketUrl: f("ticket_url", "text"),
      publishedAt: f("published_at", "published-at")
    }
  },
  announcements: {
    table: "announcements",
    localized: true,
    supportsDraft: true,
    searchColumns: ["title_json", "content_json"],
    defaultSort: [
      ["is_pinned", "desc"],
      ["priority", "desc"],
      ["updated_at", "desc"]
    ],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      content: f("content_json", "text", true),
      link: f("link", "text"),
      coverImage: f("cover_image_url", "media"),
      priority: f("priority", "number"),
      isPinned: f("is_pinned", "boolean"),
      isActive: f("is_active", "boolean"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "friend-links": {
    table: "friend_links",
    localized: true,
    supportsDraft: true,
    searchColumns: ["url"],
    defaultSort: [
      ["priority", "desc"],
      ["updated_at", "desc"]
    ],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      description: f("description_json", "text", true),
      url: f("url", "text"),
      icon: f("icon_url", "media"),
      priority: f("priority", "number"),
      isActive: f("is_active", "boolean"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "spoiler-tiers": {
    table: "spoiler_tiers",
    localized: true,
    supportsDraft: true,
    searchColumns: ["key"],
    defaultSort: [
      ["sort_order", "asc"],
      ["updated_at", "desc"]
    ],
    labelColumn: "key",
    fields: {
      key: f("key", "text"),
      name: f("title_json", "text", true),
      order: f("sort_order", "number"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "research-entries": {
    table: "research_entries",
    localized: true,
    supportsDraft: true,
    searchColumns: ["slug"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      slug: f("slug", "text"),
      summary: f("summary_json", "text", true),
      body: f("body_json", "text", true),
      stance: f("stance", "text"),
      mediaType: f("media_type", "text"),
      spoilerTier: f("spoiler_tier_id", "relation-one"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "research-themes": {
    table: "research_themes",
    localized: true,
    supportsDraft: true,
    searchColumns: ["slug"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      slug: f("slug", "text"),
      curatedIntro: f("curated_intro_json", "text", true),
      publishedAt: f("published_at", "published-at")
    }
  },
  "research-subjects": {
    table: "research_subjects",
    localized: true,
    supportsDraft: true,
    searchColumns: ["slug"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      slug: f("slug", "text"),
      description: f("description_json", "text", true),
      subjectType: f("subject_type", "text"),
      cover: f("cover_url", "media"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "research-paths": {
    table: "research_paths",
    localized: true,
    supportsDraft: true,
    searchColumns: ["slug"],
    defaultSort: [
      ["sort_order", "asc"],
      ["updated_at", "desc"]
    ],
    labelColumn: "title_json",
    fields: {
      title: f("title_json", "text", true),
      slug: f("slug", "text"),
      description: f("description_json", "text", true),
      difficulty: f("difficulty", "text"),
      order: f("sort_order", "number"),
      publishedAt: f("published_at", "published-at")
    }
  },
  "research-citations": {
    table: "research_citations",
    localized: true,
    supportsDraft: true,
    searchColumns: ["source_ref"],
    defaultSort: [["updated_at", "desc"]],
    labelColumn: "claim_short_json",
    fields: {
      claimShort: f("claim_short_json", "text", true),
      sourceType: f("source_type", "text"),
      sourceRef: f("source_ref", "text"),
      sourceQuote: f("source_quote_json", "text", true),
      confidence: f("confidence", "text"),
      publishedAt: f("published_at", "published-at")
    }
  }
};
Object.defineProperty(__vite_ssr_exports__, "COLLECTIONS", { enumerable: true, configurable: true, get(){ return COLLECTIONS }});
const QUALITY_SCAN_COLLECTIONS = [
  "events",
  "students",
  "announcements",
  "friend-links"
];
Object.defineProperty(__vite_ssr_exports__, "QUALITY_SCAN_COLLECTIONS", { enumerable: true, configurable: true, get(){ return QUALITY_SCAN_COLLECTIONS }});
function isPanelCollection(key) {
  return Object.hasOwn(COLLECTIONS, key);
}
Object.defineProperty(__vite_ssr_exports__, "isPanelCollection", { enumerable: true, configurable: true, get(){ return isPanelCollection }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QSxJQUNYLGVBQWU7QUFBQSxJQUNmLGVBQWUsQ0FBQyxZQUFZO0FBQUEsSUFDNUIsYUFBYSxDQUFDLENBQUMsY0FBYyxNQUFNLENBQUM7QUFBQSxJQUNwQyxhQUFhO0FBQUEsSUFDYixRQUFRO0FBQUEsTUFDTixZQUFZLEVBQUUsb0JBQW9CLFFBQVEsSUFBSTtBQUFBLE1BQzlDLFlBQVksRUFBRSxlQUFlLE1BQU07QUFBQSxNQUNuQyxXQUFXLEVBQUUsY0FBYyxNQUFNO0FBQUEsTUFDakMsYUFBYSxFQUFFLHFCQUFxQixRQUFRLElBQUk7QUFBQSxNQUNoRCxZQUFZLEVBQUUsY0FBYyxNQUFNO0FBQUEsTUFDbEMsYUFBYSxFQUFFLGdCQUFnQixjQUFjO0FBQUEsSUFDL0M7QUFBQSxFQUNGO0FBQ0Y7aUlBQUE7QUFHTyxNQUFNLDJCQUEyQjtBQUFBLEVBQ3RDO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7MkpBQUE7QUFFTyxTQUFTLGtCQUFrQixLQUF1RDtBQUN2RixTQUFPLE9BQU8sT0FBTyxhQUFhLEdBQUc7QUFDdkM7NklBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImNvbGxlY3Rpb25zLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogL3BhbmVsIOmbhuWQiOazqOWGjOihqO+8mueZveWQjeWNlembhuWQiCDihpIgRDEg6KGoICsg5a2X5q6155m95ZCN5Y2V44CCXG4gKiDmnKrnmbvorrDpm4blkIggNDA077yM5pyq55m76K6w5a2X5q615ouS57ud77yINDAwIHVua25vd25fZmllbGTvvInjgIJcbiAqIGNhbWVsQ2FzZSDmmK/pnaLmnb/lpZHnuqbnmoTlr7nlpJblrZfmrrXlkI3vvIxjb2x1bW4g5pivIEQxIOWIl+WQje+8m1xuICogbG9jYWxpemVkIOWtl+auteS7pSBKU09OIOWIl+WtmOWCqCB7XCJ6aC1IYW5zXCI6Li4uLFwiZW5cIjouLi4sXCJqYVwiOi4uLn3jgIJcbiAqL1xuZXhwb3J0IHR5cGUgRmllbGRLaW5kID1cbiAgfCAndGV4dCdcbiAgfCAnbnVtYmVyJ1xuICB8ICdib29sZWFuJ1xuICB8ICdtZWRpYSdcbiAgfCAncmVsYXRpb24tb25lJ1xuICB8ICdyZWxhdGlvbi1saXN0J1xuICB8ICdkYXRldGltZSdcbiAgfCAncHVibGlzaGVkLWF0J1xuXG5leHBvcnQgaW50ZXJmYWNlIEZpZWxkRGVmIHtcbiAgY29sdW1uOiBzdHJpbmdcbiAga2luZDogRmllbGRLaW5kXG4gIC8qKiBsb2NhbGl6ZWQ6IHRydWUg4oaSIOWAvOWMheijheS4uiBpMThuIEpTT04g5a2Y5YKo77yM6K+75Y+W5pe25oyJIGxvY2FsZSDop6PljIUgKi9cbiAgbG9jYWxpemVkPzogYm9vbGVhblxufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbGxlY3Rpb25EZWYge1xuICB0YWJsZTogc3RyaW5nXG4gIGxvY2FsaXplZDogYm9vbGVhblxuICBzdXBwb3J0c0RyYWZ0OiBib29sZWFuXG4gIHJlYWRPbmx5PzogYm9vbGVhblxuICBzZWFyY2hDb2x1bW5zOiBzdHJpbmdbXVxuICBkZWZhdWx0U29ydDogQXJyYXk8W3N0cmluZywgJ2FzYycgfCAnZGVzYyddPlxuICBsYWJlbENvbHVtbjogc3RyaW5nXG4gIGZpZWxkczogUmVjb3JkPHN0cmluZywgRmllbGREZWY+XG59XG5cbmNvbnN0IGYgPSAoY29sdW1uOiBzdHJpbmcsIGtpbmQ6IEZpZWxkS2luZCwgbG9jYWxpemVkID0gZmFsc2UpOiBGaWVsZERlZiA9PiAoeyBjb2x1bW4sIGtpbmQsIGxvY2FsaXplZCB9KVxuXG5leHBvcnQgY29uc3QgQ09MTEVDVElPTlM6IFJlY29yZDxzdHJpbmcsIENvbGxlY3Rpb25EZWY+ID0ge1xuICBjcmVhdG9yOiB7XG4gICAgdGFibGU6ICdjcmVhdG9ycycsXG4gICAgbG9jYWxpemVkOiB0cnVlLFxuICAgIHN1cHBvcnRzRHJhZnQ6IHRydWUsXG4gICAgc2VhcmNoQ29sdW1uczogWyduYW1lJywgJ3NsdWcnXSxcbiAgICBkZWZhdWx0U29ydDogW1sndXBkYXRlZF9hdCcsICdkZXNjJ11dLFxuICAgIGxhYmVsQ29sdW1uOiAnbmFtZScsXG4gICAgZmllbGRzOiB7XG4gICAgICBuYW1lOiBmKCduYW1lJywgJ3RleHQnKSxcbiAgICAgIHNsdWc6IGYoJ3NsdWcnLCAndGV4dCcpLFxuICAgICAgYmlvOiBmKCdiaW9fanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBwbGF0Zm9ybTogZigncGxhdGZvcm0nLCAndGV4dCcpLFxuICAgICAgcGxhdGZvcm1VaWQ6IGYoJ3BsYXRmb3JtX3VpZCcsICd0ZXh0JyksXG4gICAgICBob21lcGFnZVVybDogZignaG9tZXBhZ2VfdXJsJywgJ3RleHQnKSxcbiAgICAgIGF2YXRhcjogZignYXZhdGFyX3VybCcsICdtZWRpYScpLFxuICAgICAgaXNGZWF0dXJlZDogZignaXNfZmVhdHVyZWQnLCAnYm9vbGVhbicpLFxuICAgICAgZmVhdHVyZWRQcmlvcml0eTogZignZmVhdHVyZWRfcHJpb3JpdHknLCAnbnVtYmVyJyksXG4gICAgICBuZWVkc1JldmlldzogZignbmVlZHNfcmV2aWV3JywgJ2Jvb2xlYW4nKSxcbiAgICAgIHB1Ymxpc2hlZEF0OiBmKCdwdWJsaXNoZWRfYXQnLCAncHVibGlzaGVkLWF0JyksXG4gICAgfSxcbiAgfSxcbiAgc3R1ZGVudHM6IHtcbiAgICB0YWJsZTogJ3N0dWRlbnRzJyxcbiAgICBsb2NhbGl6ZWQ6IHRydWUsXG4gICAgc3VwcG9ydHNEcmFmdDogdHJ1ZSxcbiAgICBzZWFyY2hDb2x1bW5zOiBbJ25hbWUnLCAnb3JnYW5pemF0aW9uJ10sXG4gICAgZGVmYXVsdFNvcnQ6IFtbJ3VwZGF0ZWRfYXQnLCAnZGVzYyddXSxcbiAgICBsYWJlbENvbHVtbjogJ25hbWUnLFxuICAgIGZpZWxkczoge1xuICAgICAgbmFtZTogZignbmFtZScsICd0ZXh0JyksXG4gICAgICBvcmdhbml6YXRpb246IGYoJ29yZ2FuaXphdGlvbicsICd0ZXh0JyksXG4gICAgICB3aWtpVXJsOiBmKCd3aWtpX3VybCcsICd0ZXh0JyksXG4gICAgICBhdmF0YXI6IGYoJ2F2YXRhcl91cmwnLCAnbWVkaWEnKSxcbiAgICAgIHNjaG9vbDogZignc2Nob29sX2lkJywgJ3JlbGF0aW9uLW9uZScpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICBzY2hvb2xzOiB7XG4gICAgdGFibGU6ICdzY2hvb2xzJyxcbiAgICBsb2NhbGl6ZWQ6IHRydWUsXG4gICAgc3VwcG9ydHNEcmFmdDogZmFsc2UsXG4gICAgc2VhcmNoQ29sdW1uczogWydzbHVnJ10sXG4gICAgZGVmYXVsdFNvcnQ6IFtcbiAgICAgIFsnc29ydF9vcmRlcicsICdhc2MnXSxcbiAgICAgIFsndXBkYXRlZF9hdCcsICdkZXNjJ10sXG4gICAgXSxcbiAgICBsYWJlbENvbHVtbjogJ3NsdWcnLFxuICAgIGZpZWxkczoge1xuICAgICAgbmFtZTogZignbmFtZV9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIHNsdWc6IGYoJ3NsdWcnLCAndGV4dCcpLFxuICAgICAgZGVzY3JpcHRpb246IGYoJ2Rlc2NyaXB0aW9uX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgc2hvcnROYW1lOiBmKCdzaG9ydF9uYW1lX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgY29sb3I6IGYoJ2NvbG9yJywgJ3RleHQnKSxcbiAgICAgIGxvZ286IGYoJ2xvZ29fdXJsJywgJ21lZGlhJyksXG4gICAgICBvcmRlcjogZignc29ydF9vcmRlcicsICdudW1iZXInKSxcbiAgICAgIHB1Ymxpc2hlZEF0OiBmKCdwdWJsaXNoZWRfYXQnLCAncHVibGlzaGVkLWF0JyksXG4gICAgfSxcbiAgfSxcbiAgZXZlbnRzOiB7XG4gICAgdGFibGU6ICdldmVudHMnLFxuICAgIGxvY2FsaXplZDogdHJ1ZSxcbiAgICBzdXBwb3J0c0RyYWZ0OiB0cnVlLFxuICAgIHNlYXJjaENvbHVtbnM6IFsnb3JnYW5pemVyJywgJ3NvdXJjZV9wbGF0Zm9ybScsICdzb3VyY2VfdXJsJ10sXG4gICAgZGVmYXVsdFNvcnQ6IFtbJ3N0YXJ0X3RpbWUnLCAnZGVzYyddXSxcbiAgICBsYWJlbENvbHVtbjogJ3RpdGxlX2pzb24nLFxuICAgIGZpZWxkczoge1xuICAgICAgdGl0bGU6IGYoJ3RpdGxlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgZGVzY3JpcHRpb246IGYoJ2Rlc2NyaXB0aW9uX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAga2luZDogZigna2luZCcsICd0ZXh0JyksXG4gICAgICBuYXR1cmU6IGYoJ25hdHVyZScsICd0ZXh0JyksXG4gICAgICBldmVudEZvcm1hdDogZignZXZlbnRfZm9ybWF0JywgJ3RleHQnKSxcbiAgICAgIHN0YXR1c092ZXJyaWRlOiBmKCdzdGF0dXNfb3ZlcnJpZGUnLCAndGV4dCcpLFxuICAgICAgc3RhcnRUaW1lOiBmKCdzdGFydF90aW1lJywgJ2RhdGV0aW1lJyksXG4gICAgICBlbmRUaW1lOiBmKCdlbmRfdGltZScsICdkYXRldGltZScpLFxuICAgICAgbGluazogZignbGluaycsICd0ZXh0JyksXG4gICAgICBjb3ZlckltYWdlOiBmKCdjb3Zlcl9pbWFnZV91cmwnLCAnbWVkaWEnKSxcbiAgICAgIG9yZ2FuaXplcjogZignb3JnYW5pemVyJywgJ3RleHQnKSxcbiAgICAgIG9yZ2FuaXplclZlcmlmaWVkOiBmKCdvcmdhbml6ZXJfdmVyaWZpZWQnLCAnYm9vbGVhbicpLFxuICAgICAgc291cmNlUGxhdGZvcm06IGYoJ3NvdXJjZV9wbGF0Zm9ybScsICd0ZXh0JyksXG4gICAgICBzb3VyY2VVcmw6IGYoJ3NvdXJjZV91cmwnLCAndGV4dCcpLFxuICAgICAgbGFzdFZlcmlmaWVkQXQ6IGYoJ2xhc3RfdmVyaWZpZWRfYXQnLCAnZGF0ZXRpbWUnKSxcbiAgICAgIHRhZ3M6IGYoJ3RhZ3NfanNvbicsICd0ZXh0JyksXG4gICAgICBndWVzdHM6IGYoJ2d1ZXN0c19qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIHRpY2tldFByaWNlVGV4dDogZigndGlja2V0X3ByaWNlX3RleHRfanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBwcmljZU1pbjogZigncHJpY2VfbWluJywgJ251bWJlcicpLFxuICAgICAgcHJpY2VNYXg6IGYoJ3ByaWNlX21heCcsICdudW1iZXInKSxcbiAgICAgIGN1cnJlbmN5OiBmKCdjdXJyZW5jeScsICd0ZXh0JyksXG4gICAgICB0aWNrZXRTdGF0dXM6IGYoJ3RpY2tldF9zdGF0dXMnLCAndGV4dCcpLFxuICAgICAgdGlja2V0VXJsOiBmKCd0aWNrZXRfdXJsJywgJ3RleHQnKSxcbiAgICAgIHB1Ymxpc2hlZEF0OiBmKCdwdWJsaXNoZWRfYXQnLCAncHVibGlzaGVkLWF0JyksXG4gICAgfSxcbiAgfSxcbiAgYW5ub3VuY2VtZW50czoge1xuICAgIHRhYmxlOiAnYW5ub3VuY2VtZW50cycsXG4gICAgbG9jYWxpemVkOiB0cnVlLFxuICAgIHN1cHBvcnRzRHJhZnQ6IHRydWUsXG4gICAgc2VhcmNoQ29sdW1uczogWyd0aXRsZV9qc29uJywgJ2NvbnRlbnRfanNvbiddLFxuICAgIGRlZmF1bHRTb3J0OiBbXG4gICAgICBbJ2lzX3Bpbm5lZCcsICdkZXNjJ10sXG4gICAgICBbJ3ByaW9yaXR5JywgJ2Rlc2MnXSxcbiAgICAgIFsndXBkYXRlZF9hdCcsICdkZXNjJ10sXG4gICAgXSxcbiAgICBsYWJlbENvbHVtbjogJ3RpdGxlX2pzb24nLFxuICAgIGZpZWxkczoge1xuICAgICAgdGl0bGU6IGYoJ3RpdGxlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgY29udGVudDogZignY29udGVudF9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIGxpbms6IGYoJ2xpbmsnLCAndGV4dCcpLFxuICAgICAgY292ZXJJbWFnZTogZignY292ZXJfaW1hZ2VfdXJsJywgJ21lZGlhJyksXG4gICAgICBwcmlvcml0eTogZigncHJpb3JpdHknLCAnbnVtYmVyJyksXG4gICAgICBpc1Bpbm5lZDogZignaXNfcGlubmVkJywgJ2Jvb2xlYW4nKSxcbiAgICAgIGlzQWN0aXZlOiBmKCdpc19hY3RpdmUnLCAnYm9vbGVhbicpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICAnZnJpZW5kLWxpbmtzJzoge1xuICAgIHRhYmxlOiAnZnJpZW5kX2xpbmtzJyxcbiAgICBsb2NhbGl6ZWQ6IHRydWUsXG4gICAgc3VwcG9ydHNEcmFmdDogdHJ1ZSxcbiAgICBzZWFyY2hDb2x1bW5zOiBbJ3VybCddLFxuICAgIGRlZmF1bHRTb3J0OiBbXG4gICAgICBbJ3ByaW9yaXR5JywgJ2Rlc2MnXSxcbiAgICAgIFsndXBkYXRlZF9hdCcsICdkZXNjJ10sXG4gICAgXSxcbiAgICBsYWJlbENvbHVtbjogJ3RpdGxlX2pzb24nLFxuICAgIGZpZWxkczoge1xuICAgICAgdGl0bGU6IGYoJ3RpdGxlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgZGVzY3JpcHRpb246IGYoJ2Rlc2NyaXB0aW9uX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgdXJsOiBmKCd1cmwnLCAndGV4dCcpLFxuICAgICAgaWNvbjogZignaWNvbl91cmwnLCAnbWVkaWEnKSxcbiAgICAgIHByaW9yaXR5OiBmKCdwcmlvcml0eScsICdudW1iZXInKSxcbiAgICAgIGlzQWN0aXZlOiBmKCdpc19hY3RpdmUnLCAnYm9vbGVhbicpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICAnc3BvaWxlci10aWVycyc6IHtcbiAgICB0YWJsZTogJ3Nwb2lsZXJfdGllcnMnLFxuICAgIGxvY2FsaXplZDogdHJ1ZSxcbiAgICBzdXBwb3J0c0RyYWZ0OiB0cnVlLFxuICAgIHNlYXJjaENvbHVtbnM6IFsna2V5J10sXG4gICAgZGVmYXVsdFNvcnQ6IFtcbiAgICAgIFsnc29ydF9vcmRlcicsICdhc2MnXSxcbiAgICAgIFsndXBkYXRlZF9hdCcsICdkZXNjJ10sXG4gICAgXSxcbiAgICBsYWJlbENvbHVtbjogJ2tleScsXG4gICAgZmllbGRzOiB7XG4gICAgICBrZXk6IGYoJ2tleScsICd0ZXh0JyksXG4gICAgICBuYW1lOiBmKCd0aXRsZV9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIG9yZGVyOiBmKCdzb3J0X29yZGVyJywgJ251bWJlcicpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICAncmVzZWFyY2gtZW50cmllcyc6IHtcbiAgICB0YWJsZTogJ3Jlc2VhcmNoX2VudHJpZXMnLFxuICAgIGxvY2FsaXplZDogdHJ1ZSxcbiAgICBzdXBwb3J0c0RyYWZ0OiB0cnVlLFxuICAgIHNlYXJjaENvbHVtbnM6IFsnc2x1ZyddLFxuICAgIGRlZmF1bHRTb3J0OiBbWyd1cGRhdGVkX2F0JywgJ2Rlc2MnXV0sXG4gICAgbGFiZWxDb2x1bW46ICd0aXRsZV9qc29uJyxcbiAgICBmaWVsZHM6IHtcbiAgICAgIHRpdGxlOiBmKCd0aXRsZV9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIHNsdWc6IGYoJ3NsdWcnLCAndGV4dCcpLFxuICAgICAgc3VtbWFyeTogZignc3VtbWFyeV9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIGJvZHk6IGYoJ2JvZHlfanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBzdGFuY2U6IGYoJ3N0YW5jZScsICd0ZXh0JyksXG4gICAgICBtZWRpYVR5cGU6IGYoJ21lZGlhX3R5cGUnLCAndGV4dCcpLFxuICAgICAgc3BvaWxlclRpZXI6IGYoJ3Nwb2lsZXJfdGllcl9pZCcsICdyZWxhdGlvbi1vbmUnKSxcbiAgICAgIHB1Ymxpc2hlZEF0OiBmKCdwdWJsaXNoZWRfYXQnLCAncHVibGlzaGVkLWF0JyksXG4gICAgfSxcbiAgfSxcbiAgJ3Jlc2VhcmNoLXRoZW1lcyc6IHtcbiAgICB0YWJsZTogJ3Jlc2VhcmNoX3RoZW1lcycsXG4gICAgbG9jYWxpemVkOiB0cnVlLFxuICAgIHN1cHBvcnRzRHJhZnQ6IHRydWUsXG4gICAgc2VhcmNoQ29sdW1uczogWydzbHVnJ10sXG4gICAgZGVmYXVsdFNvcnQ6IFtbJ3VwZGF0ZWRfYXQnLCAnZGVzYyddXSxcbiAgICBsYWJlbENvbHVtbjogJ3RpdGxlX2pzb24nLFxuICAgIGZpZWxkczoge1xuICAgICAgdGl0bGU6IGYoJ3RpdGxlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgc2x1ZzogZignc2x1ZycsICd0ZXh0JyksXG4gICAgICBjdXJhdGVkSW50cm86IGYoJ2N1cmF0ZWRfaW50cm9fanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBwdWJsaXNoZWRBdDogZigncHVibGlzaGVkX2F0JywgJ3B1Ymxpc2hlZC1hdCcpLFxuICAgIH0sXG4gIH0sXG4gICdyZXNlYXJjaC1zdWJqZWN0cyc6IHtcbiAgICB0YWJsZTogJ3Jlc2VhcmNoX3N1YmplY3RzJyxcbiAgICBsb2NhbGl6ZWQ6IHRydWUsXG4gICAgc3VwcG9ydHNEcmFmdDogdHJ1ZSxcbiAgICBzZWFyY2hDb2x1bW5zOiBbJ3NsdWcnXSxcbiAgICBkZWZhdWx0U29ydDogW1sndXBkYXRlZF9hdCcsICdkZXNjJ11dLFxuICAgIGxhYmVsQ29sdW1uOiAndGl0bGVfanNvbicsXG4gICAgZmllbGRzOiB7XG4gICAgICB0aXRsZTogZigndGl0bGVfanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBzbHVnOiBmKCdzbHVnJywgJ3RleHQnKSxcbiAgICAgIGRlc2NyaXB0aW9uOiBmKCdkZXNjcmlwdGlvbl9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIHN1YmplY3RUeXBlOiBmKCdzdWJqZWN0X3R5cGUnLCAndGV4dCcpLFxuICAgICAgY292ZXI6IGYoJ2NvdmVyX3VybCcsICdtZWRpYScpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICAncmVzZWFyY2gtcGF0aHMnOiB7XG4gICAgdGFibGU6ICdyZXNlYXJjaF9wYXRocycsXG4gICAgbG9jYWxpemVkOiB0cnVlLFxuICAgIHN1cHBvcnRzRHJhZnQ6IHRydWUsXG4gICAgc2VhcmNoQ29sdW1uczogWydzbHVnJ10sXG4gICAgZGVmYXVsdFNvcnQ6IFtcbiAgICAgIFsnc29ydF9vcmRlcicsICdhc2MnXSxcbiAgICAgIFsndXBkYXRlZF9hdCcsICdkZXNjJ10sXG4gICAgXSxcbiAgICBsYWJlbENvbHVtbjogJ3RpdGxlX2pzb24nLFxuICAgIGZpZWxkczoge1xuICAgICAgdGl0bGU6IGYoJ3RpdGxlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgc2x1ZzogZignc2x1ZycsICd0ZXh0JyksXG4gICAgICBkZXNjcmlwdGlvbjogZignZGVzY3JpcHRpb25fanNvbicsICd0ZXh0JywgdHJ1ZSksXG4gICAgICBkaWZmaWN1bHR5OiBmKCdkaWZmaWN1bHR5JywgJ3RleHQnKSxcbiAgICAgIG9yZGVyOiBmKCdzb3J0X29yZGVyJywgJ251bWJlcicpLFxuICAgICAgcHVibGlzaGVkQXQ6IGYoJ3B1Ymxpc2hlZF9hdCcsICdwdWJsaXNoZWQtYXQnKSxcbiAgICB9LFxuICB9LFxuICAncmVzZWFyY2gtY2l0YXRpb25zJzoge1xuICAgIHRhYmxlOiAncmVzZWFyY2hfY2l0YXRpb25zJyxcbiAgICBsb2NhbGl6ZWQ6IHRydWUsXG4gICAgc3VwcG9ydHNEcmFmdDogdHJ1ZSxcbiAgICBzZWFyY2hDb2x1bW5zOiBbJ3NvdXJjZV9yZWYnXSxcbiAgICBkZWZhdWx0U29ydDogW1sndXBkYXRlZF9hdCcsICdkZXNjJ11dLFxuICAgIGxhYmVsQ29sdW1uOiAnY2xhaW1fc2hvcnRfanNvbicsXG4gICAgZmllbGRzOiB7XG4gICAgICBjbGFpbVNob3J0OiBmKCdjbGFpbV9zaG9ydF9qc29uJywgJ3RleHQnLCB0cnVlKSxcbiAgICAgIHNvdXJjZVR5cGU6IGYoJ3NvdXJjZV90eXBlJywgJ3RleHQnKSxcbiAgICAgIHNvdXJjZVJlZjogZignc291cmNlX3JlZicsICd0ZXh0JyksXG4gICAgICBzb3VyY2VRdW90ZTogZignc291cmNlX3F1b3RlX2pzb24nLCAndGV4dCcsIHRydWUpLFxuICAgICAgY29uZmlkZW5jZTogZignY29uZmlkZW5jZScsICd0ZXh0JyksXG4gICAgICBwdWJsaXNoZWRBdDogZigncHVibGlzaGVkX2F0JywgJ3B1Ymxpc2hlZC1hdCcpLFxuICAgIH0sXG4gIH0sXG59XG5cbi8qKiDotKjph4/miavmj4/opobnm5bnmoTlhoXlrrnpm4blkIjvvIjkuI7ml6flkI7nq68gc2NhbkNvbnRlbnRRdWFsaXR5IOWvuem9kO+8ieOAgiAqL1xuZXhwb3J0IGNvbnN0IFFVQUxJVFlfU0NBTl9DT0xMRUNUSU9OUyA9IFtcbiAgJ2V2ZW50cycsXG4gICdzdHVkZW50cycsXG4gICdhbm5vdW5jZW1lbnRzJyxcbiAgJ2ZyaWVuZC1saW5rcycsXG5dIGFzIGNvbnN0XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1BhbmVsQ29sbGVjdGlvbihrZXk6IHN0cmluZyk6IGtleSBpcyBrZXlvZiB0eXBlb2YgQ09MTEVDVElPTlMgJiBzdHJpbmcge1xuICByZXR1cm4gT2JqZWN0Lmhhc093bihDT0xMRUNUSU9OUywga2V5KVxufVxuIl0sImZpbGUiOiIvVXNlcnMva2FyYS9Db2RlL1NjaGFsZS1MaWJyYXJ5L3NlcnZlci9zcmMvcGFuZWwvY29sbGVjdGlvbnMudHMifQ==
