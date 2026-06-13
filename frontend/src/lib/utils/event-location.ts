export function normalizeEventLocationName(value?: string | null) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  const compact = text.replace(/\s+/g, '');
  if (/^(台湾|台灣|臺灣)(省|地区|地區)?$/.test(compact)) {
    return '台湾地区';
  }
  return text;
}

export function eventLocationSearchTerms(value?: string | null) {
  const text = normalizeEventLocationName(value);
  if (!text) return [];
  if (text === '台湾地区') {
    return ['台湾地区', '台湾', '台灣', '臺灣', '台湾省', '台灣省', '臺灣省'];
  }
  return [text];
}
