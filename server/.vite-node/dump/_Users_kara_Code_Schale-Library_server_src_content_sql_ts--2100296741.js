// /Users/kara/Code/Schale-Library/server/src/content/sql.ts
function camelToSnake(s) {
  return s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
Object.defineProperty(__vite_ssr_exports__, "camelToSnake", { enumerable: true, configurable: true, get(){ return camelToSnake }});
const OP_SQL = {
  eq: "= ?",
  ne: "<> ?",
  gt: "> ?",
  gte: ">= ?",
  lt: "< ?",
  lte: "<= ?"
};
function cond(col, op, value) {
  if (op === "containsi") return { sql: `LOWER(${col}) LIKE LOWER(?)`, params: [`%${value}%`] };
  const cmp = OP_SQL[op];
  return { sql: `${col} ${cmp}`, params: [value] };
}
Object.defineProperty(__vite_ssr_exports__, "cond", { enumerable: true, configurable: true, get(){ return cond }});
function andAll(conds) {
  if (conds.length === 0) return { sql: "1=1", params: [] };
  return {
    sql: conds.map((c) => `(${c.sql})`).join(" AND "),
    params: conds.flatMap((c) => c.params)
  };
}
Object.defineProperty(__vite_ssr_exports__, "andAll", { enumerable: true, configurable: true, get(){ return andAll }});
function orAny(conds) {
  if (conds.length === 0) return { sql: "1=0", params: [] };
  return {
    sql: conds.map((c) => `(${c.sql})`).join(" OR "),
    params: conds.flatMap((c) => c.params)
  };
}
Object.defineProperty(__vite_ssr_exports__, "orAny", { enumerable: true, configurable: true, get(){ return orAny }});
function limitOffset(limit, offset) {
  return { sql: `LIMIT ? OFFSET ?`, params: [limit, offset] };
}
Object.defineProperty(__vite_ssr_exports__, "limitOffset", { enumerable: true, configurable: true, get(){ return limitOffset }});

//# sourceMappingSource=vite-node
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBV08sU0FBUyxhQUFhLEdBQW1CO0FBQzlDLFNBQU8sRUFBRSxRQUFRLFVBQVUsQ0FBQyxNQUFNLE1BQU0sRUFBRSxZQUFZLENBQUM7QUFDekQ7bUlBQUE7QUFFQSxNQUFNLFNBQVM7QUFBQSxFQUNiLElBQUk7QUFBQSxFQUNKLElBQUk7QUFBQSxFQUNKLElBQUk7QUFBQSxFQUNKLEtBQUs7QUFBQSxFQUNMLElBQUk7QUFBQSxFQUNKLEtBQUs7QUFDUDtBQU9PLFNBQVMsS0FBSyxLQUFhLElBQXVDLE9BQWlDO0FBQ3hHLE1BQUksT0FBTyxZQUFhLFFBQU8sRUFBRSxLQUFLLFNBQVMsR0FBRyxtQkFBbUIsUUFBUSxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUU7QUFDNUYsUUFBTSxNQUFNLE9BQU8sRUFBRTtBQUNyQixTQUFPLEVBQUUsS0FBSyxHQUFHLEdBQUcsSUFBSSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRTtBQUNqRDttSEFBQTtBQUdPLFNBQVMsT0FBTyxPQUEyQjtBQUNoRCxNQUFJLE1BQU0sV0FBVyxFQUFHLFFBQU8sRUFBRSxLQUFLLE9BQU8sUUFBUSxDQUFDLEVBQUU7QUFDeEQsU0FBTztBQUFBLElBQ0wsS0FBSyxNQUFNLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLE9BQU87QUFBQSxJQUNoRCxRQUFRLE1BQU0sUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNO0FBQUEsRUFDdkM7QUFDRjt1SEFBQTtBQUdPLFNBQVMsTUFBTSxPQUEyQjtBQUMvQyxNQUFJLE1BQU0sV0FBVyxFQUFHLFFBQU8sRUFBRSxLQUFLLE9BQU8sUUFBUSxDQUFDLEVBQUU7QUFDeEQsU0FBTztBQUFBLElBQ0wsS0FBSyxNQUFNLElBQUksQ0FBQyxNQUFNLElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxLQUFLLE1BQU07QUFBQSxJQUMvQyxRQUFRLE1BQU0sUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNO0FBQUEsRUFDdkM7QUFDRjtxSEFBQTtBQUdPLFNBQVMsWUFBWSxPQUFlLFFBQXlCO0FBQ2xFLFNBQU8sRUFBRSxLQUFLLG9CQUFvQixRQUFRLENBQUMsT0FBTyxNQUFNLEVBQUU7QUFDNUQ7aUlBQUEiLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbInNxbC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEQxIOWOn+eUnyBwcmVwYXJlZCBzdGF0ZW1lbnQg55qEIFNRTCDmi7zoo4XliqnmiYvjgIJcbiAqIOiuvuiuoe+8muWPtuWtkOadoeS7tiDihpIgeyBzcWwg54mH5q61LCDlj4LmlbAgfe+8m+Wfn+i3r+eUsei0n+i0o+aKiiBwYXRoIOaYoOWwhOWIsOecn+WunuWIl++8iOWQqyBKT0lOIOihqOWIq+WQje+8ieOAglxuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3FsQ29uZCB7XG4gIHNxbDogc3RyaW5nXG4gIHBhcmFtczogdW5rbm93bltdXG59XG5cbi8qKiBjYW1lbENhc2XvvIhTdHJhcGkg5a2X5q615ZCN77yJ4oaSIHNuYWtlX2Nhc2XvvIhEMSDliJflkI3vvInjgILlpJrlpITosIPnlKjvvIzooYzkuLrpnIDkuIDoh7TjgIIgKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW1lbFRvU25ha2Uoczogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHMucmVwbGFjZSgvW0EtWl0vZywgKG0pID0+ICdfJyArIG0udG9Mb3dlckNhc2UoKSlcbn1cblxuY29uc3QgT1BfU1FMID0ge1xuICBlcTogJz0gPycsXG4gIG5lOiAnPD4gPycsXG4gIGd0OiAnPiA/JyxcbiAgZ3RlOiAnPj0gPycsXG4gIGx0OiAnPCA/JyxcbiAgbHRlOiAnPD0gPycsXG59IGFzIGNvbnN0XG5cbi8qKlxuICog5qCH6YeP5YiX5p2h5Lu25p6E6YCg5Zmo44CCXG4gKiBjb2wg5Li65bim5Yir5ZCN55qE5YiX5ZCN77yI5aaCICdlLmtpbmQn77yJ77yMdmFsdWUg5bey55Sx6LCD55So5pa55YGa57G75Z6L5b2S5LiA77yI5a2X56ym5Liy5Y6f5qC344CB5biD5bCU6L2sIDAvMe+8ieOAglxuICogY29udGFpbnNpIOi1sCBMSUtFICsgTE9XRVIg5Y+M5L6n5bCP5YaZ77yIRDEg5pegIElDVSBjaXRleHTvvInjgIJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbmQoY29sOiBzdHJpbmcsIG9wOiBrZXlvZiB0eXBlb2YgT1BfU1FMIHwgJ2NvbnRhaW5zaScsIHZhbHVlOiBzdHJpbmcgfCBudW1iZXIpOiBTcWxDb25kIHtcbiAgaWYgKG9wID09PSAnY29udGFpbnNpJykgcmV0dXJuIHsgc3FsOiBgTE9XRVIoJHtjb2x9KSBMSUtFIExPV0VSKD8pYCwgcGFyYW1zOiBbYCUke3ZhbHVlfSVgXSB9XG4gIGNvbnN0IGNtcCA9IE9QX1NRTFtvcF1cbiAgcmV0dXJuIHsgc3FsOiBgJHtjb2x9ICR7Y21wfWAsIHBhcmFtczogW3ZhbHVlXSB9XG59XG5cbi8qKiBBTkQg6L+e5o6l5aSa5Liq5p2h5Lu277yb56m65pWw57uE6L+U5ZueIDE9MSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFuZEFsbChjb25kczogU3FsQ29uZFtdKTogU3FsQ29uZCB7XG4gIGlmIChjb25kcy5sZW5ndGggPT09IDApIHJldHVybiB7IHNxbDogJzE9MScsIHBhcmFtczogW10gfVxuICByZXR1cm4ge1xuICAgIHNxbDogY29uZHMubWFwKChjKSA9PiBgKCR7Yy5zcWx9KWApLmpvaW4oJyBBTkQgJyksXG4gICAgcGFyYW1zOiBjb25kcy5mbGF0TWFwKChjKSA9PiBjLnBhcmFtcyksXG4gIH1cbn1cblxuLyoqIE9SIOi/nuaOpeWkmuS4quadoeS7tu+8m+epuuaVsOe7hOi/lOWbniAxPTDvvIjml6DljLnphY3vvIkgKi9cbmV4cG9ydCBmdW5jdGlvbiBvckFueShjb25kczogU3FsQ29uZFtdKTogU3FsQ29uZCB7XG4gIGlmIChjb25kcy5sZW5ndGggPT09IDApIHJldHVybiB7IHNxbDogJzE9MCcsIHBhcmFtczogW10gfVxuICByZXR1cm4ge1xuICAgIHNxbDogY29uZHMubWFwKChjKSA9PiBgKCR7Yy5zcWx9KWApLmpvaW4oJyBPUiAnKSxcbiAgICBwYXJhbXM6IGNvbmRzLmZsYXRNYXAoKGMpID0+IGMucGFyYW1zKSxcbiAgfVxufVxuXG4vKiogTElNSVQvT0ZGU0VUIOWtkOWPpeS4juWIhumhteWPguaVsCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxpbWl0T2Zmc2V0KGxpbWl0OiBudW1iZXIsIG9mZnNldDogbnVtYmVyKTogU3FsQ29uZCB7XG4gIHJldHVybiB7IHNxbDogYExJTUlUID8gT0ZGU0VUID9gLCBwYXJhbXM6IFtsaW1pdCwgb2Zmc2V0XSB9XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9rYXJhL0NvZGUvU2NoYWxlLUxpYnJhcnkvc2VydmVyL3NyYy9jb250ZW50L3NxbC50cyJ9
