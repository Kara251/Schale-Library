// /Users/kara/Code/Schale-Library/server/src/lib/i18n.ts
const FALLBACK_ORDER = ["zh-Hans", "en", "ja"];
function pickLocale(json, locale) {
  if (!json) return "";
  let parsed = null;
  if (json.trimStart().startsWith("{")) {
    try {
      parsed = JSON.parse(json);
    } catch {
      parsed = null;
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return typeof json === "string" ? json : "";
  }
  const wanted = (value) => typeof value === "string" && value.length > 0;
  if (wanted(parsed[locale])) return parsed[locale];
  for (const fallback of FALLBACK_ORDER) {
    if (wanted(parsed[fallback])) return parsed[fallback];
  }
  for (const value of Object.values(parsed)) {
    if (wanted(value)) return value;
  }
  return "";
}
Object.defineProperty(__vite_ssr_exports__, "pickLocale", { enumerable: true, configurable: true, get(){ return pickLocale }});
function parseJsonArray(json) {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}
Object.defineProperty(__vite_ssr_exports__, "parseJsonArray", { enumerable: true, configurable: true, get(){ return parseJsonArray }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBS0EsTUFBTSxpQkFBaUIsQ0FBQyxXQUFXLE1BQU0sSUFBSTtBQUV0QyxTQUFTLFdBQVcsTUFBaUMsUUFBd0I7QUFDbEYsTUFBSSxDQUFDLEtBQU0sUUFBTztBQUNsQixNQUFJLFNBQXlDO0FBQzdDLE1BQUksS0FBSyxVQUFVLEVBQUUsV0FBVyxHQUFHLEdBQUc7QUFDcEMsUUFBSTtBQUNGLGVBQVMsS0FBSyxNQUFNLElBQUk7QUFBQSxJQUMxQixRQUFRO0FBQ04sZUFBUztBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQ0EsTUFBSSxDQUFDLFVBQVUsT0FBTyxXQUFXLFVBQVU7QUFDekMsV0FBTyxPQUFPLFNBQVMsV0FBVyxPQUFPO0FBQUEsRUFDM0M7QUFDQSxRQUFNLFNBQVMsQ0FBQyxVQUFvQyxPQUFPLFVBQVUsWUFBWSxNQUFNLFNBQVM7QUFDaEcsTUFBSSxPQUFPLE9BQU8sTUFBTSxDQUFDLEVBQUcsUUFBTyxPQUFPLE1BQU07QUFDaEQsYUFBVyxZQUFZLGdCQUFnQjtBQUNyQyxRQUFJLE9BQU8sT0FBTyxRQUFRLENBQUMsRUFBRyxRQUFPLE9BQU8sUUFBUTtBQUFBLEVBQ3REO0FBQ0EsYUFBVyxTQUFTLE9BQU8sT0FBTyxNQUFNLEdBQUc7QUFDekMsUUFBSSxPQUFPLEtBQUssRUFBRyxRQUFPO0FBQUEsRUFDNUI7QUFDQSxTQUFPO0FBQ1Q7K0hBQUE7QUFFTyxTQUFTLGVBQWUsTUFBMkM7QUFDeEUsTUFBSSxDQUFDLEtBQU0sUUFBTyxDQUFDO0FBQ25CLE1BQUk7QUFDRixVQUFNLFNBQVMsS0FBSyxNQUFNLElBQUk7QUFDOUIsV0FBTyxNQUFNLFFBQVEsTUFBTSxJQUFJLE9BQU8sT0FBTyxDQUFDLE1BQW1CLE9BQU8sTUFBTSxRQUFRLElBQUksQ0FBQztBQUFBLEVBQzdGLFFBQVE7QUFDTixXQUFPLENBQUM7QUFBQSxFQUNWO0FBQ0Y7dUlBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImkxOG4udHMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBpMThuIEpTT04g5YiX6Kej5p6Q77yae1wiemgtSGFuc1wiOlwiLi4uXCIsXCJlblwiOlwiLi4uXCIsXCJqYVwiOlwiLi4uXCJ9XG4gKiDlm57pgIDpobrluo/vvJror7fmsYIgbG9jYWxlIOKGkiB6aC1IYW5zIOKGkiBlbiDihpIgamEg4oaSIOmmluS4qumdnuepuuWAvOOAglxuICog6Z2eIEpTT04g6L6T5YWl5Y6f5qC36L+U5Zue77yI5a656ZSZIEVUTCDohI/mlbDmja7vvInjgIJcbiAqL1xuY29uc3QgRkFMTEJBQ0tfT1JERVIgPSBbJ3poLUhhbnMnLCAnZW4nLCAnamEnXSBhcyBjb25zdFxuXG5leHBvcnQgZnVuY3Rpb24gcGlja0xvY2FsZShqc29uOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkLCBsb2NhbGU6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghanNvbikgcmV0dXJuICcnXG4gIGxldCBwYXJzZWQ6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbCA9IG51bGxcbiAgaWYgKGpzb24udHJpbVN0YXJ0KCkuc3RhcnRzV2l0aCgneycpKSB7XG4gICAgdHJ5IHtcbiAgICAgIHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbikgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICB9IGNhdGNoIHtcbiAgICAgIHBhcnNlZCA9IG51bGxcbiAgICB9XG4gIH1cbiAgaWYgKCFwYXJzZWQgfHwgdHlwZW9mIHBhcnNlZCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gdHlwZW9mIGpzb24gPT09ICdzdHJpbmcnID8ganNvbiA6ICcnXG4gIH1cbiAgY29uc3Qgd2FudGVkID0gKHZhbHVlOiB1bmtub3duKTogdmFsdWUgaXMgc3RyaW5nID0+IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgdmFsdWUubGVuZ3RoID4gMFxuICBpZiAod2FudGVkKHBhcnNlZFtsb2NhbGVdKSkgcmV0dXJuIHBhcnNlZFtsb2NhbGVdXG4gIGZvciAoY29uc3QgZmFsbGJhY2sgb2YgRkFMTEJBQ0tfT1JERVIpIHtcbiAgICBpZiAod2FudGVkKHBhcnNlZFtmYWxsYmFja10pKSByZXR1cm4gcGFyc2VkW2ZhbGxiYWNrXVxuICB9XG4gIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyhwYXJzZWQpKSB7XG4gICAgaWYgKHdhbnRlZCh2YWx1ZSkpIHJldHVybiB2YWx1ZVxuICB9XG4gIHJldHVybiAnJ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VKc29uQXJyYXkoanNvbjogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCk6IHN0cmluZ1tdIHtcbiAgaWYgKCFqc29uKSByZXR1cm4gW11cbiAgdHJ5IHtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb24pXG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkocGFyc2VkKSA/IHBhcnNlZC5maWx0ZXIoKHYpOiB2IGlzIHN0cmluZyA9PiB0eXBlb2YgdiA9PT0gJ3N0cmluZycpIDogW11cbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIFtdXG4gIH1cbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2thcmEvQ29kZS9TY2hhbGUtTGlicmFyeS9zZXJ2ZXIvc3JjL2xpYi9pMThuLnRzIn0=
