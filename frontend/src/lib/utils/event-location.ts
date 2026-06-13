import type { Locale } from '@/lib/i18n';

export type EventLocationLevel = 'country' | 'region' | 'city';

export interface EventLocationOption {
  value: string;
  level: EventLocationLevel;
  label: Record<Locale, string>;
  country?: string;
  region?: string;
  aliases?: string[];
}

const countryOptions: EventLocationOption[] = [
  { value: '全球', level: 'country', label: { 'zh-Hans': '全球', en: 'Global', ja: '全世界' }, aliases: ['worldwide', 'global', '全世界'] },
  { value: '日本', level: 'country', label: { 'zh-Hans': '日本', en: 'Japan', ja: '日本' }, aliases: ['jp', 'japan'] },
  { value: '中国大陆', level: 'country', label: { 'zh-Hans': '中国大陆', en: 'Mainland China', ja: '中国大陸' }, aliases: ['中国', '中國', '大陆', '大陸', 'mainland china', 'china'] },
  { value: '台湾地区', level: 'country', label: { 'zh-Hans': '台湾地区', en: 'Taiwan region', ja: '台湾地域' }, aliases: ['台湾', '台灣', '臺灣', '台湾省', '台灣省', '臺灣省', 'taiwan'] },
  { value: '香港特别行政区', level: 'country', label: { 'zh-Hans': '香港特别行政区', en: 'Hong Kong SAR', ja: '香港特別行政区' }, aliases: ['香港', 'hong kong', 'hk'] },
  { value: '澳门特别行政区', level: 'country', label: { 'zh-Hans': '澳门特别行政区', en: 'Macao SAR', ja: 'マカオ特別行政区' }, aliases: ['澳门', '澳門', 'macao', 'macau'] },
  { value: '韩国', level: 'country', label: { 'zh-Hans': '韩国', en: 'South Korea', ja: '韓国' }, aliases: ['南韩', '韓国', 'south korea', 'korea', 'kr'] },
  { value: '新加坡', level: 'country', label: { 'zh-Hans': '新加坡', en: 'Singapore', ja: 'シンガポール' }, aliases: ['singapore', 'sg'] },
  { value: '马来西亚', level: 'country', label: { 'zh-Hans': '马来西亚', en: 'Malaysia', ja: 'マレーシア' }, aliases: ['malaysia', 'my'] },
  { value: '泰国', level: 'country', label: { 'zh-Hans': '泰国', en: 'Thailand', ja: 'タイ' }, aliases: ['thailand', 'thai', 'th'] },
  { value: '印度尼西亚', level: 'country', label: { 'zh-Hans': '印度尼西亚', en: 'Indonesia', ja: 'インドネシア' }, aliases: ['印尼', 'indonesia', 'id'] },
  { value: '菲律宾', level: 'country', label: { 'zh-Hans': '菲律宾', en: 'Philippines', ja: 'フィリピン' }, aliases: ['philippines', 'ph'] },
  { value: '越南', level: 'country', label: { 'zh-Hans': '越南', en: 'Vietnam', ja: 'ベトナム' }, aliases: ['vietnam', 'vn'] },
  { value: '美国', level: 'country', label: { 'zh-Hans': '美国', en: 'United States', ja: 'アメリカ' }, aliases: ['usa', 'us', 'united states', 'america'] },
  { value: '加拿大', level: 'country', label: { 'zh-Hans': '加拿大', en: 'Canada', ja: 'カナダ' }, aliases: ['canada', 'ca'] },
  { value: '英国', level: 'country', label: { 'zh-Hans': '英国', en: 'United Kingdom', ja: 'イギリス' }, aliases: ['uk', 'united kingdom', 'britain'] },
  { value: '澳大利亚', level: 'country', label: { 'zh-Hans': '澳大利亚', en: 'Australia', ja: 'オーストラリア' }, aliases: ['澳洲', 'australia', 'au'] },
];

const regionOptions: EventLocationOption[] = [
  { value: '東京都', level: 'region', country: '日本', label: { 'zh-Hans': '东京都', en: 'Tokyo', ja: '東京都' }, aliases: ['东京都', '東京', 'tokyo'] },
  { value: '大阪府', level: 'region', country: '日本', label: { 'zh-Hans': '大阪府', en: 'Osaka', ja: '大阪府' }, aliases: ['osaka'] },
  { value: '京都府', level: 'region', country: '日本', label: { 'zh-Hans': '京都府', en: 'Kyoto', ja: '京都府' }, aliases: ['kyoto'] },
  { value: '神奈川県', level: 'region', country: '日本', label: { 'zh-Hans': '神奈川县', en: 'Kanagawa', ja: '神奈川県' }, aliases: ['神奈川', 'kanagawa'] },
  { value: '愛知県', level: 'region', country: '日本', label: { 'zh-Hans': '爱知县', en: 'Aichi', ja: '愛知県' }, aliases: ['爱知县', '愛知', 'aichi'] },
  { value: '福岡県', level: 'region', country: '日本', label: { 'zh-Hans': '福冈县', en: 'Fukuoka', ja: '福岡県' }, aliases: ['福冈县', '福岡', 'fukuoka'] },
  { value: '北海道', level: 'region', country: '日本', label: { 'zh-Hans': '北海道', en: 'Hokkaido', ja: '北海道' }, aliases: ['hokkaido'] },
  { value: '宮城県', level: 'region', country: '日本', label: { 'zh-Hans': '宫城县', en: 'Miyagi', ja: '宮城県' }, aliases: ['宫城县', '宮城', 'miyagi'] },
  { value: '北京市', level: 'region', country: '中国大陆', label: { 'zh-Hans': '北京市', en: 'Beijing', ja: '北京市' }, aliases: ['北京', 'beijing'] },
  { value: '上海市', level: 'region', country: '中国大陆', label: { 'zh-Hans': '上海市', en: 'Shanghai', ja: '上海市' }, aliases: ['上海', 'shanghai'] },
  { value: '广东省', level: 'region', country: '中国大陆', label: { 'zh-Hans': '广东省', en: 'Guangdong', ja: '広東省' }, aliases: ['廣東省', 'guangdong'] },
  { value: '江苏省', level: 'region', country: '中国大陆', label: { 'zh-Hans': '江苏省', en: 'Jiangsu', ja: '江蘇省' }, aliases: ['江蘇省', 'jiangsu'] },
  { value: '浙江省', level: 'region', country: '中国大陆', label: { 'zh-Hans': '浙江省', en: 'Zhejiang', ja: '浙江省' }, aliases: ['zhejiang'] },
  { value: '四川省', level: 'region', country: '中国大陆', label: { 'zh-Hans': '四川省', en: 'Sichuan', ja: '四川省' }, aliases: ['sichuan'] },
  { value: '湖北省', level: 'region', country: '中国大陆', label: { 'zh-Hans': '湖北省', en: 'Hubei', ja: '湖北省' }, aliases: ['hubei'] },
  { value: '重庆市', level: 'region', country: '中国大陆', label: { 'zh-Hans': '重庆市', en: 'Chongqing', ja: '重慶市' }, aliases: ['重慶市', '重庆', 'chongqing'] },
  { value: '台北市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '台北市', en: 'Taipei', ja: '台北市' }, aliases: ['臺北市', '台北', 'taipei'] },
  { value: '新北市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '新北市', en: 'New Taipei', ja: '新北市' }, aliases: ['new taipei'] },
  { value: '桃园市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '桃园市', en: 'Taoyuan', ja: '桃園市' }, aliases: ['桃園市', 'taoyuan'] },
  { value: '台中市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '台中市', en: 'Taichung', ja: '台中市' }, aliases: ['臺中市', 'taichung'] },
  { value: '台南市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '台南市', en: 'Tainan', ja: '台南市' }, aliases: ['臺南市', 'tainan'] },
  { value: '高雄市', level: 'region', country: '台湾地区', label: { 'zh-Hans': '高雄市', en: 'Kaohsiung', ja: '高雄市' }, aliases: ['kaohsiung'] },
  { value: '香港', level: 'region', country: '香港特别行政区', label: { 'zh-Hans': '香港', en: 'Hong Kong', ja: '香港' }, aliases: ['hong kong'] },
  { value: '澳门', level: 'region', country: '澳门特别行政区', label: { 'zh-Hans': '澳门', en: 'Macao', ja: 'マカオ' }, aliases: ['澳門', 'macao', 'macau'] },
  { value: '首尔特别市', level: 'region', country: '韩国', label: { 'zh-Hans': '首尔特别市', en: 'Seoul', ja: 'ソウル特別市' }, aliases: ['首尔', '서울', 'seoul'] },
  { value: '新加坡', level: 'region', country: '新加坡', label: { 'zh-Hans': '新加坡', en: 'Singapore', ja: 'シンガポール' }, aliases: ['singapore'] },
  { value: '吉隆坡', level: 'region', country: '马来西亚', label: { 'zh-Hans': '吉隆坡', en: 'Kuala Lumpur', ja: 'クアラルンプール' }, aliases: ['kuala lumpur'] },
  { value: '曼谷', level: 'region', country: '泰国', label: { 'zh-Hans': '曼谷', en: 'Bangkok', ja: 'バンコク' }, aliases: ['bangkok'] },
  { value: '雅加达', level: 'region', country: '印度尼西亚', label: { 'zh-Hans': '雅加达', en: 'Jakarta', ja: 'ジャカルタ' }, aliases: ['jakarta'] },
  { value: '马尼拉', level: 'region', country: '菲律宾', label: { 'zh-Hans': '马尼拉', en: 'Manila', ja: 'マニラ' }, aliases: ['manila'] },
  { value: '河内', level: 'region', country: '越南', label: { 'zh-Hans': '河内', en: 'Hanoi', ja: 'ハノイ' }, aliases: ['hanoi'] },
  { value: '胡志明市', level: 'region', country: '越南', label: { 'zh-Hans': '胡志明市', en: 'Ho Chi Minh City', ja: 'ホーチミン市' }, aliases: ['ho chi minh city', 'saigon'] },
  { value: '加利福尼亚州', level: 'region', country: '美国', label: { 'zh-Hans': '加利福尼亚州', en: 'California', ja: 'カリフォルニア州' }, aliases: ['california', 'ca'] },
  { value: '纽约州', level: 'region', country: '美国', label: { 'zh-Hans': '纽约州', en: 'New York', ja: 'ニューヨーク州' }, aliases: ['new york', 'ny'] },
  { value: '安大略省', level: 'region', country: '加拿大', label: { 'zh-Hans': '安大略省', en: 'Ontario', ja: 'オンタリオ州' }, aliases: ['ontario'] },
  { value: '英格兰', level: 'region', country: '英国', label: { 'zh-Hans': '英格兰', en: 'England', ja: 'イングランド' }, aliases: ['england'] },
  { value: '新南威尔士州', level: 'region', country: '澳大利亚', label: { 'zh-Hans': '新南威尔士州', en: 'New South Wales', ja: 'ニューサウスウェールズ州' }, aliases: ['new south wales', 'nsw'] },
  { value: '维多利亚州', level: 'region', country: '澳大利亚', label: { 'zh-Hans': '维多利亚州', en: 'Victoria', ja: 'ビクトリア州' }, aliases: ['victoria'] },
];

const cityOptions: EventLocationOption[] = [
  { value: '东京', level: 'city', country: '日本', region: '東京都', label: { 'zh-Hans': '东京', en: 'Tokyo', ja: '東京' }, aliases: ['東京', 'tokyo'] },
  { value: '大阪', level: 'city', country: '日本', region: '大阪府', label: { 'zh-Hans': '大阪', en: 'Osaka', ja: '大阪' }, aliases: ['osaka'] },
  { value: '京都', level: 'city', country: '日本', region: '京都府', label: { 'zh-Hans': '京都', en: 'Kyoto', ja: '京都' }, aliases: ['kyoto'] },
  { value: '横滨', level: 'city', country: '日本', region: '神奈川県', label: { 'zh-Hans': '横滨', en: 'Yokohama', ja: '横浜' }, aliases: ['横浜', 'yokohama'] },
  { value: '名古屋', level: 'city', country: '日本', region: '愛知県', label: { 'zh-Hans': '名古屋', en: 'Nagoya', ja: '名古屋' }, aliases: ['nagoya'] },
  { value: '福冈', level: 'city', country: '日本', region: '福岡県', label: { 'zh-Hans': '福冈', en: 'Fukuoka', ja: '福岡' }, aliases: ['福岡', 'fukuoka'] },
  { value: '札幌', level: 'city', country: '日本', region: '北海道', label: { 'zh-Hans': '札幌', en: 'Sapporo', ja: '札幌' }, aliases: ['sapporo'] },
  { value: '仙台', level: 'city', country: '日本', region: '宮城県', label: { 'zh-Hans': '仙台', en: 'Sendai', ja: '仙台' }, aliases: ['sendai'] },
  { value: '北京', level: 'city', country: '中国大陆', region: '北京市', label: { 'zh-Hans': '北京', en: 'Beijing', ja: '北京' }, aliases: ['beijing'] },
  { value: '上海', level: 'city', country: '中国大陆', region: '上海市', label: { 'zh-Hans': '上海', en: 'Shanghai', ja: '上海' }, aliases: ['shanghai'] },
  { value: '广州', level: 'city', country: '中国大陆', region: '广东省', label: { 'zh-Hans': '广州', en: 'Guangzhou', ja: '広州' }, aliases: ['廣州', 'guangzhou'] },
  { value: '深圳', level: 'city', country: '中国大陆', region: '广东省', label: { 'zh-Hans': '深圳', en: 'Shenzhen', ja: '深圳' }, aliases: ['shenzhen'] },
  { value: '南京', level: 'city', country: '中国大陆', region: '江苏省', label: { 'zh-Hans': '南京', en: 'Nanjing', ja: '南京' }, aliases: ['nanjing'] },
  { value: '杭州', level: 'city', country: '中国大陆', region: '浙江省', label: { 'zh-Hans': '杭州', en: 'Hangzhou', ja: '杭州' }, aliases: ['hangzhou'] },
  { value: '成都', level: 'city', country: '中国大陆', region: '四川省', label: { 'zh-Hans': '成都', en: 'Chengdu', ja: '成都' }, aliases: ['chengdu'] },
  { value: '武汉', level: 'city', country: '中国大陆', region: '湖北省', label: { 'zh-Hans': '武汉', en: 'Wuhan', ja: '武漢' }, aliases: ['武漢', 'wuhan'] },
  { value: '重庆', level: 'city', country: '中国大陆', region: '重庆市', label: { 'zh-Hans': '重庆', en: 'Chongqing', ja: '重慶' }, aliases: ['重慶', 'chongqing'] },
  { value: '台北', level: 'city', country: '台湾地区', region: '台北市', label: { 'zh-Hans': '台北', en: 'Taipei', ja: '台北' }, aliases: ['臺北', 'taipei'] },
  { value: '新北', level: 'city', country: '台湾地区', region: '新北市', label: { 'zh-Hans': '新北', en: 'New Taipei', ja: '新北' }, aliases: ['new taipei'] },
  { value: '桃园', level: 'city', country: '台湾地区', region: '桃园市', label: { 'zh-Hans': '桃园', en: 'Taoyuan', ja: '桃園' }, aliases: ['桃園', 'taoyuan'] },
  { value: '台中', level: 'city', country: '台湾地区', region: '台中市', label: { 'zh-Hans': '台中', en: 'Taichung', ja: '台中' }, aliases: ['臺中', 'taichung'] },
  { value: '台南', level: 'city', country: '台湾地区', region: '台南市', label: { 'zh-Hans': '台南', en: 'Tainan', ja: '台南' }, aliases: ['臺南', 'tainan'] },
  { value: '高雄', level: 'city', country: '台湾地区', region: '高雄市', label: { 'zh-Hans': '高雄', en: 'Kaohsiung', ja: '高雄' }, aliases: ['kaohsiung'] },
  { value: '香港', level: 'city', country: '香港特别行政区', region: '香港', label: { 'zh-Hans': '香港', en: 'Hong Kong', ja: '香港' }, aliases: ['hong kong'] },
  { value: '澳门', level: 'city', country: '澳门特别行政区', region: '澳门', label: { 'zh-Hans': '澳门', en: 'Macao', ja: 'マカオ' }, aliases: ['澳門', 'macao', 'macau'] },
  { value: '首尔', level: 'city', country: '韩国', region: '首尔特别市', label: { 'zh-Hans': '首尔', en: 'Seoul', ja: 'ソウル' }, aliases: ['서울', 'seoul'] },
  { value: '新加坡', level: 'city', country: '新加坡', region: '新加坡', label: { 'zh-Hans': '新加坡', en: 'Singapore', ja: 'シンガポール' }, aliases: ['singapore'] },
  { value: '吉隆坡', level: 'city', country: '马来西亚', region: '吉隆坡', label: { 'zh-Hans': '吉隆坡', en: 'Kuala Lumpur', ja: 'クアラルンプール' }, aliases: ['kuala lumpur'] },
  { value: '曼谷', level: 'city', country: '泰国', region: '曼谷', label: { 'zh-Hans': '曼谷', en: 'Bangkok', ja: 'バンコク' }, aliases: ['bangkok'] },
  { value: '雅加达', level: 'city', country: '印度尼西亚', region: '雅加达', label: { 'zh-Hans': '雅加达', en: 'Jakarta', ja: 'ジャカルタ' }, aliases: ['jakarta'] },
  { value: '马尼拉', level: 'city', country: '菲律宾', region: '马尼拉', label: { 'zh-Hans': '马尼拉', en: 'Manila', ja: 'マニラ' }, aliases: ['manila'] },
  { value: '河内', level: 'city', country: '越南', region: '河内', label: { 'zh-Hans': '河内', en: 'Hanoi', ja: 'ハノイ' }, aliases: ['hanoi'] },
  { value: '胡志明市', level: 'city', country: '越南', region: '胡志明市', label: { 'zh-Hans': '胡志明市', en: 'Ho Chi Minh City', ja: 'ホーチミン市' }, aliases: ['ho chi minh city', 'saigon'] },
  { value: '洛杉矶', level: 'city', country: '美国', region: '加利福尼亚州', label: { 'zh-Hans': '洛杉矶', en: 'Los Angeles', ja: 'ロサンゼルス' }, aliases: ['los angeles', 'la'] },
  { value: '纽约', level: 'city', country: '美国', region: '纽约州', label: { 'zh-Hans': '纽约', en: 'New York City', ja: 'ニューヨーク' }, aliases: ['new york city', 'nyc'] },
  { value: '多伦多', level: 'city', country: '加拿大', region: '安大略省', label: { 'zh-Hans': '多伦多', en: 'Toronto', ja: 'トロント' }, aliases: ['toronto'] },
  { value: '伦敦', level: 'city', country: '英国', region: '英格兰', label: { 'zh-Hans': '伦敦', en: 'London', ja: 'ロンドン' }, aliases: ['london'] },
  { value: '悉尼', level: 'city', country: '澳大利亚', region: '新南威尔士州', label: { 'zh-Hans': '悉尼', en: 'Sydney', ja: 'シドニー' }, aliases: ['sydney'] },
  { value: '墨尔本', level: 'city', country: '澳大利亚', region: '维多利亚州', label: { 'zh-Hans': '墨尔本', en: 'Melbourne', ja: 'メルボルン' }, aliases: ['melbourne'] },
];

export const eventLocationOptions = [...countryOptions, ...regionOptions, ...cityOptions];

function compactLocationValue(value?: string | null) {
  return String(value || '').trim().replace(/\s+/g, '').toLocaleLowerCase();
}

const locationAliasMap = new Map<string, string>();
for (const option of eventLocationOptions) {
  const values = [
    option.value,
    option.label['zh-Hans'],
    option.label.en,
    option.label.ja,
    ...(option.aliases || []),
  ];
  for (const value of values) {
    const key = compactLocationValue(value);
    if (key) {
      locationAliasMap.set(key, option.value);
    }
  }
}

function byLocationLabel(locale: Locale) {
  return (a: EventLocationOption, b: EventLocationOption) => {
    const aLabel = getEventLocationLabel(a.value, locale);
    const bLabel = getEventLocationLabel(b.value, locale);
    return aLabel.localeCompare(bLabel, locale === 'zh-Hans' ? 'zh-Hans' : locale);
  };
}

export function normalizeEventLocationName(value?: string | null) {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return locationAliasMap.get(compactLocationValue(text)) || text;
}

export function getEventLocationOption(value?: string | null) {
  const normalizedValue = normalizeEventLocationName(value);
  return eventLocationOptions.find((option) => option.value === normalizedValue) || null;
}

export function getEventLocationLabel(value: string | null | undefined, locale: Locale) {
  const normalizedValue = normalizeEventLocationName(value);
  if (!normalizedValue) return '';
  const option = getEventLocationOption(normalizedValue);
  return option?.label[locale] || option?.label['zh-Hans'] || normalizedValue;
}

export function getEventLocationOptions(
  level: EventLocationLevel,
  locale: Locale,
  parents: { country?: string | null; region?: string | null } = {}
) {
  const country = normalizeEventLocationName(parents.country);
  const region = normalizeEventLocationName(parents.region);

  return eventLocationOptions
    .filter((option) => option.level === level)
    .filter((option) => !country || !option.country || option.country === country)
    .filter((option) => !region || !option.region || option.region === region)
    .sort(byLocationLabel(locale));
}

export function eventLocationSearchTerms(value?: string | null) {
  const text = normalizeEventLocationName(value);
  if (!text) return [];
  const option = getEventLocationOption(text);
  const values = option
    ? [option.value, option.label['zh-Hans'], option.label.en, option.label.ja, ...(option.aliases || [])]
    : [text];
  return Array.from(new Set(values.map((item) => String(item || '').trim()).filter(Boolean)));
}
