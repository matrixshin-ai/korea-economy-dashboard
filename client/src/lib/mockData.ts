// Types
export interface Indicator {
  id: string;
  name: string;
  value: string;
  change: number; // percentage
  trend: { date: string; value: number }[];
  category: 'stock' | 'rate' | 'currency' | 'commodity';
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  category: string;
  important: boolean;
  content?: string;
  views?: number;
  url?: string;
}

export interface CountryStat {
  country: string;
  gdp: string; // Trillion USD
  gdpPerCapita: string; // USD
  debtToGdp: string; // %
  deficitToGdp: string; // %
}

export interface KoreaStat {
  label: string;
  value: string;
  unit: string;
  change: string;
}

// Mock Data

export const INDICATORS: Indicator[] = [
  { 
    id: 'kospi', name: 'KOSPI', value: '2,654.32', change: 0.45, category: 'stock',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 2500 + Math.random() * 200 }))
  },
  { 
    id: 'kosdaq', name: 'KOSDAQ', value: '874.11', change: -0.21, category: 'stock',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 850 + Math.random() * 50 }))
  },
  { 
    id: 'sp500', name: 'S&P 500', value: '5,088.80', change: 1.2, category: 'stock',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 4800 + Math.random() * 400 }))
  },
  { 
    id: 'nasdaq', name: 'Nasdaq', value: '16,091.92', change: 1.5, category: 'stock',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 15500 + Math.random() * 800 }))
  },
  { 
    id: 'kr_base_rate', name: '한국 기준금리', value: '3.50%', change: 0, category: 'rate',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 3.5 }))
  },
  { 
    id: 'kr_3y', name: '국고채 3년', value: '3.35%', change: -0.05, category: 'rate',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 3.3 + Math.random() * 0.2 }))
  },
  { 
    id: 'kr_10y', name: '국고채 10년', value: '3.42%', change: -0.02, category: 'rate',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 3.4 + Math.random() * 0.2 }))
  },
  { 
    id: 'us_rate', name: '미국 기준금리', value: '5.50%', change: 0, category: 'rate',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 5.5 }))
  },
  { 
    id: 'us_10y', name: '미국 국채 10년', value: '4.25%', change: 0.08, category: 'rate',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 4.1 + Math.random() * 0.3 }))
  },
  { 
    id: 'krw_usd', name: '원/달러 환율', value: '1,335.50', change: 0.3, category: 'currency',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 1300 + Math.random() * 50 }))
  },
  { 
    id: 'dxy', name: '달러 인덱스', value: '103.96', change: 0.1, category: 'currency',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 102 + Math.random() * 3 }))
  },
  { 
    id: 'wti', name: 'WTI 원유', value: '$78.50', change: -1.2, category: 'commodity',
    trend: Array.from({ length: 180 }, (_, i) => ({ date: `2024-${i%12+1}-${i%28+1}`, value: 75 + Math.random() * 10 }))
  },
];

export const COUNTRY_STATS: CountryStat[] = [
  { country: '한국 (Korea)', gdp: '1.71', gdpPerCapita: '33,000', debtToGdp: '50.4', deficitToGdp: '1.2' },
  { country: '미국 (USA)', gdp: '27.36', gdpPerCapita: '81,000', debtToGdp: '122.0', deficitToGdp: '6.3' },
  { country: '일본 (Japan)', gdp: '4.21', gdpPerCapita: '34,000', debtToGdp: '260.0', deficitToGdp: '4.5' },
  { country: '중국 (China)', gdp: '17.70', gdpPerCapita: '12,500', debtToGdp: '82.0', deficitToGdp: '3.8' },
];

export const KOREA_STATS: KoreaStat[] = [
  { label: '연간 총 소비', value: '980', unit: '조원', change: '+2.1%' },
  { label: '연간 총 투자', value: '520', unit: '조원', change: '-1.5%' },
  { label: '정부 총 지출', value: '656', unit: '조원', change: '+2.8%' },
  { label: '연간 총 수출', value: '632', unit: '십억불', change: '+7.4%' },
  { label: '연간 총 수입', value: '642', unit: '십억불', change: '-12.1%' },
  { label: '경상수지', value: '35.4', unit: '십억불', change: '흑자전환' },
  { label: '외환보유액', value: '415.7', unit: '십억불', change: '-0.2%' },
];

export const NEWS_DATA: NewsItem[] = [
  // Macro (8 articles, last 3 days: 01.13-01.15)
  {
    id: 'm1', title: '한국은행, 올해 경제성장률 전망치 2.1% 유지... "물가 안정 우선"',
    summary: '한국은행이 올해 경제성장률 전망치를 2.1%로 유지했다. 물가 상승 압력이 여전한 가운데 통화 긴축 기조를 당분간 이어가겠다는 의지로 해석된다.',
    source: '한국경제', date: '2026.01.15', category: 'Macro', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `한국은행이 15일 올해 경제성장률 전망치를 2.1%로 유지했다. 이는 지난해 11월 발표한 전망치와 동일한 수준이다.

이창용 한국은행 총재는 이날 기자간담회에서 "물가 상승 압력이 여전히 존재하는 만큼 통화 긴축 기조를 당분간 유지할 필요가 있다"고 밝혔다. 그는 "올해 소비자물가 상승률은 2.3% 수준을 기록할 것으로 예상한다"며 "물가가 목표치인 2%로 안정적으로 수렴할 때까지 기준금리를 현 수준에서 유지할 것"이라고 강조했다.

한국은행은 민간소비가 완만한 회복세를 보이고 수출이 반도체를 중심으로 증가세를 이어갈 것으로 전망했다. 다만 건설투자 부진과 대내외 불확실성 확대 등이 성장에 부담으로 작용할 수 있다고 분석했다.

전문가들은 한국은행이 올 상반기 중 금리 인하에 나서기 어려울 것으로 보고 있다. 미국 연방준비제도(Fed)의 금리 인하 시점과 국내 물가 동향을 면밀히 지켜볼 필요가 있다는 분석이다.`,
  },
  {
    id: 'm2', title: '1월 수출 18% 증가, 반도체 회복세 뚜렷',
    summary: '산업통상자원부에 따르면 1월 수출액이 전년 동기 대비 18% 증가했다. 특히 반도체 수출이 56% 급증하며 전체 수출 실적을 견인했다.',
    source: '매일경제', date: '2026.01.15', category: 'Macro', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `산업통상자원부가 15일 발표한 '1월 수출입 동향'에 따르면 이달 1~10일 수출액은 지난해 같은 기간보다 18% 증가한 것으로 집계됐다.

품목별로는 반도체 수출이 56% 급증하며 전체 수출을 견인했다. AI(인공지능) 서버 수요 확대와 메모리 반도체 가격 상승이 주요 요인으로 분석된다. 자동차 수출도 15% 증가하며 호조세를 이어갔다.

지역별로는 대중국 수출이 22% 늘어났고, 미국 수출도 12% 증가했다. 유럽연합(EU)과 아세안 지역 수출도 각각 두 자릿수 증가율을 기록했다.

산업부 관계자는 "반도체 업황 회복과 글로벌 경기 개선에 힘입어 수출이 본격적인 반등 국면에 진입한 것으로 보인다"며 "올해 수출 목표 7000억 달러 달성에 청신호가 켜졌다"고 평가했다.`,
  },
  {
    id: 'm3', title: 'KDI "내수 부진 지속될 것... 고금리 장기화 영향"',
    summary: 'KDI가 발표한 1월 경제동향에 따르면 내수는 고금리 영향으로 부진을 지속할 전망이다. 소비 심리 위축이 우려된다.',
    source: '연합뉴스', date: '2026.01.14', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `한국개발연구원(KDI)이 14일 발표한 '1월 경제동향'에서 내수 부진이 당분간 지속될 것이라고 전망했다.

KDI는 "고금리 장기화로 가계의 이자 부담이 커지면서 소비 여력이 축소되고 있다"며 "특히 대출을 받은 가구의 소비 위축이 뚜렷하다"고 분석했다. 소비자심리지수도 기준점(100)을 밑돌며 소비 심리 개선이 더딘 상황이다.

건설투자는 고금리와 부동산 프로젝트파이낸싱(PF) 부실 우려 등으로 감소세를 이어갈 것으로 예상됐다. 설비투자 역시 글로벌 수요 불확실성 등으로 부진한 흐름을 보일 것으로 전망했다.

다만 수출은 반도체 업황 개선에 힘입어 증가세를 이어갈 것으로 KDI는 내다봤다.`,
  },
  {
    id: 'm4', title: '소비자물가 3%대 재진입 우려... 신선식품 급등',
    summary: '폭설과 한파로 인해 신선식품 가격이 급등하면서 소비자물가 상승률이 다시 3%대로 올라설 조짐을 보이고 있다.',
    source: '조선일보', date: '2026.01.14', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `최근 폭설과 한파의 영향으로 신선식품 가격이 급등하면서 소비자물가 상승률이 다시 3%대로 올라설 수 있다는 우려가 나오고 있다.

통계청에 따르면 1월 둘째 주 배추 가격은 전년 동기 대비 40% 이상 올랐고, 무 가격도 30% 넘게 상승했다. 과일류 가격도 사과와 배를 중심으로 20~30% 오른 상태다.

전문가들은 "1월 소비자물가 상승률이 2.8~3.0% 수준을 기록할 가능성이 있다"며 "한국은행의 금리 인하 시점이 더 늦춰질 수 있다"고 전망했다.

기상청은 당분간 강추위가 이어질 것으로 예보해 농산물 가격 상승세가 당분간 지속될 것으로 보인다.`,
  },
  {
    id: 'm5', title: '작년 1인당 국민소득 3만 4천불 추정... 환율 효과 톡톡',
    summary: '지난해 1인당 국민총소득(GNI)이 3만 4천 달러 수준을 회복한 것으로 추정된다. 환율 안정화가 주요 원인이다.',
    source: '동아일보', date: '2026.01.14', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `지난해 1인당 국민총소득(GNI)이 3만 4천 달러 수준을 회복한 것으로 추정된다.

한국은행과 통계청 자료를 종합하면, 2024년 명목 국내총생산(GDP)은 전년 대비 소폭 증가했고, 원/달러 환율이 연평균 1,350원 수준으로 안정되면서 달러 환산 1인당 소득이 늘어난 것으로 분석된다.

2023년 1인당 GNI는 환율 급등 영향으로 3만 3천 달러 수준으로 떨어졌었다. 전문가들은 "환율 안정이 1인당 소득 회복의 주된 요인"이라며 "다만 실질 구매력 개선 여부는 별도로 봐야 한다"고 지적했다.`,
  },
  {
    id: 'm6', title: '12월 산업생산 0.8% 증가... 반도체·자동차 호조',
    summary: '통계청이 발표한 12월 산업활동동향에 따르면 전 산업 생산이 전월 대비 0.8% 증가했다.',
    source: '뉴시스', date: '2026.01.13', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `통계청이 13일 발표한 '12월 산업활동동향'에 따르면 전 산업 생산이 전월 대비 0.8% 증가했다.

제조업 생산은 반도체(+5.2%)와 자동차(+3.1%)가 호조를 보이며 전월 대비 1.2% 늘었다. 반도체는 AI 수요 증가와 재고 조정 완료에 따른 생산 확대가 영향을 미쳤다.

서비스업 생산도 도소매업과 운수창고업을 중심으로 0.5% 증가했다. 소매판매는 가전제품과 통신기기 판매 호조로 전월 대비 1.1% 늘었다.

경기동행지수 순환변동치는 전월 대비 0.2포인트 상승해 경기가 완만한 회복세에 접어들고 있음을 시사했다.`,
  },
  {
    id: 'm7', title: '경기선행지수 2개월 연속 상승... 경기 회복 신호?',
    summary: '경기선행지수가 2개월 연속 상승세를 보이며 경기 저점 통과 가능성이 제기되고 있다.',
    source: 'SBS Biz', date: '2026.01.13', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `경기선행지수가 2개월 연속 상승하면서 경기 저점 통과 가능성에 대한 기대감이 커지고 있다.

통계청에 따르면 12월 경기선행지수 순환변동치는 99.8로 전월(99.6) 대비 0.2포인트 상승했다. 11월에 이어 2개월 연속 오름세다.

경기선행지수를 구성하는 10개 지표 중 건설수주액, 수출입물가비율, 코스피 지수 등이 상승에 기여했다. 특히 수출 관련 지표 개선이 두드러졌다.

전문가들은 "선행지수 상승이 경기 반등의 초기 신호일 수 있다"면서도 "고금리와 내수 부진이 여전해 본격적인 경기 회복까지는 시간이 걸릴 것"이라고 분석했다.`,
  },
  {
    id: 'm8', title: '실업률 3.0% 유지... 청년 고용은 여전히 부진',
    summary: '전체 실업률은 안정적이나 청년층 고용률은 전년 대비 하락해 청년 실업 문제가 지속되고 있다.',
    source: '한겨레', date: '2026.01.13', category: 'Macro', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `12월 실업률이 3.0%를 기록하며 전반적인 고용 시장은 안정적인 모습을 보이고 있다. 그러나 청년층(15~29세) 고용률은 전년 동월 대비 0.5%포인트 하락해 청년 실업 문제가 지속되고 있는 것으로 나타났다.

통계청 발표에 따르면 12월 취업자 수는 2,850만 명으로 전년 동월 대비 15만 명 증가했다. 업종별로는 보건·사회복지서비스업과 정보통신업에서 취업자가 늘었으나, 제조업과 건설업에서는 감소세가 이어졌다.

청년층 실업률은 6.8%로 전체 실업률의 두 배 이상을 기록했다. 정부는 청년 고용 촉진을 위한 추가 대책 마련에 나설 계획이라고 밝혔다.`,
  },

  // Fiscal (4 articles, last 3 days: 01.13-01.15)
  {
    id: 'f1', title: '기재부, 상반기 재정 65% 조기집행 확정',
    summary: '정부가 민생 안정과 경기 활성화를 위해 상반기 중 재정의 65%인 350조원을 조기 집행하기로 했다.',
    source: '세종관가', date: '2026.01.15', category: 'Fiscal', important: true,
    url: 'https://news.einfomax.co.kr/',
    content: `기획재정부가 15일 올해 상반기 중 전체 재정의 65%에 해당하는 350조원을 조기 집행하기로 확정했다.

최상목 부총리 겸 기획재정부 장관은 이날 정부세종청사에서 열린 '2026년 재정집행 점검회의'를 주재하고 이같이 밝혔다. 이는 지난해 상반기 조기집행 비율(63.5%)보다 1.5%포인트 높은 수준이다.

정부는 민생 안정과 내수 경기 활성화를 위해 SOC(사회간접자본) 예산과 R&D(연구개발) 예산을 중심으로 집행 속도를 높일 계획이다. 특히 지방자치단체에 대한 교부금과 보조금 집행을 앞당겨 지역 경제 활성화에 기여하겠다는 방침이다.

최 부총리는 "경기 하방 리스크에 선제적으로 대응하기 위해 재정의 적극적 역할이 필요하다"고 강조했다.`,
  },
  {
    id: 'f2', title: '국세 수입 3조원 "펑크"... 법인세 쇼크 여전',
    summary: '지난해 기업 실적 부진으로 법인세가 예상보다 덜 걷히며 세수 결손 우려가 커지고 있다.',
    source: '한국일보', date: '2026.01.14', category: 'Fiscal', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `지난해 국세 수입이 당초 예산보다 3조원 이상 부족한 것으로 추정되면서 올해도 세수 결손 우려가 커지고 있다.

기획재정부에 따르면 2024년 국세 수입은 약 337조원으로, 예산(340조원) 대비 3조원가량 적게 걷힌 것으로 잠정 집계됐다. 주요 원인은 법인세 부진이다. 2023년 기업 실적 악화의 영향으로 지난해 법인세 수입이 예상치를 크게 밑돌았다.

올해도 법인세 수입 전망이 밝지 않다. 반도체 업황은 회복세이나 다른 업종의 실적은 여전히 부진해 전체 법인세 증가폭이 제한적일 것으로 보인다.

전문가들은 "세수 부족이 지속되면 재정건전성 관리에 어려움이 생길 수 있다"며 "불요불급한 지출 구조조정이 필요하다"고 지적했다.`,
  },
  {
    id: 'f3', title: '지방교부세 감소에 지자체 비상... 긴축 재정 돌입',
    summary: '중앙정부의 세수 부족으로 지방교부세가 줄어들자 각 지자체가 긴축 재정에 돌입했다. 주요 사업들이 줄줄이 연기되고 있다.',
    source: '경향신문', date: '2026.01.14', category: 'Fiscal', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `중앙정부의 세수 부족 여파로 지방교부세가 줄어들면서 전국 지방자치단체들이 비상이 걸렸다.

행정안전부에 따르면 올해 지방교부세 예산은 67조원으로, 지난해(71조원)보다 4조원 줄었다. 이에 따라 각 지자체는 긴축 재정에 돌입했다.

서울시는 주요 도시개발 사업 착공 시점을 늦추기로 했고, 경기도는 일부 복지 사업 예산을 삭감했다. 지방 중소도시의 경우 공공청사 신축, 도로 확장 등 인프라 사업이 줄줄이 연기되고 있다.

전국시도지사협의회는 "지방재정 위기가 심화하고 있다"며 중앙정부에 대책 마련을 촉구하고 나섰다.`,
  },
  {
    id: 'f4', title: '국채 금리 안정화 위해 바이백 규모 확대',
    summary: '기재부가 국채 시장 안정을 위해 국고채 매입(바이백) 규모를 확대하기로 했다. 수급 불균형 해소에 도움이 될 전망이다.',
    source: '인포맥스', date: '2026.01.13', category: 'Fiscal', important: false,
    url: 'https://news.einfomax.co.kr/',
    content: `기획재정부가 국채 시장 안정을 위해 국고채 조기상환(바이백) 규모를 확대하기로 했다.

기재부는 13일 "1분기 국고채 바이백 규모를 당초 계획보다 1조원 늘린 4조원으로 확대하겠다"고 밝혔다. 이는 연초 이후 국채 금리가 상승세를 보이자 시장 안정화를 위한 조치다.

최근 미국 국채 금리 상승 등 영향으로 국내 국고채 3년물 금리도 3.4%대로 올랐다. 바이백은 정부가 시장에서 국채를 매입해 상환하는 것으로, 채권 공급을 줄여 금리 안정에 기여한다.

채권시장 관계자는 "정부의 시장 안정화 의지가 확인된 만큼 금리 상승 압력이 다소 완화될 것"이라고 전망했다.`,
  },

  // Finance (3 articles, last 3 days: 01.13-01.15)
  {
    id: 'fn1', title: '금융위, "기업 밸류업 프로그램" 세부안 발표',
    summary: '금융위원회가 코리아 디스카운트 해소를 위한 기업 밸류업 프로그램의 가이드라인을 발표했다. 저PBR 주식에 대한 관심이 집중되고 있다.',
    source: '이데일리', date: '2026.01.15', category: 'Finance', important: true,
    url: 'https://news.einfomax.co.kr/',
    content: `금융위원회가 15일 '코리아 디스카운트' 해소를 위한 기업 밸류업 프로그램의 세부 가이드라인을 발표했다.

핵심 내용은 상장기업들이 자사 기업가치 제고 계획을 공시하도록 유도하는 것이다. 자기자본이익률(ROE), 주당순자산가치(PBR) 등 핵심 지표 개선 목표와 구체적인 실행 방안을 담은 계획서를 제출하도록 권고했다.

정부는 밸류업 우수기업에 대해 법인세 감면, 배당소득세 분리과세 등 세제 혜택을 검토 중이다. 또한 국민연금 등 기관투자자들의 밸류업 참여 기업 투자 확대도 유도할 계획이다.

증시에서는 저PBR 종목에 대한 관심이 급증하고 있다. 은행, 지주사, 건설사 등 자산 대비 주가가 낮은 업종 주가가 상승세를 보이고 있다.`,
  },
  {
    id: 'fn2', title: '은행권 ELS 배상안 마련 난항... 투자자 반발 거세',
    summary: '홍콩H지수 연계 ELS 손실 배상안을 두고 은행권과 투자자 간의 입장 차이가 좁혀지지 않고 있다.',
    source: '머니투데이', date: '2026.01.14', category: 'Finance', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `홍콩H지수 연계 주가연계증권(ELS) 손실 배상안을 둘러싼 은행권과 투자자 간의 갈등이 심화하고 있다.

금융감독원의 분쟁조정 결과에 따라 5대 시중은행은 투자자에게 손실액의 20~60%를 배상하기로 했다. 그러나 투자자들은 "불완전 판매에 대한 책임이 충분히 반영되지 않았다"며 반발하고 있다.

특히 고령 투자자와 예금 갈아타기 피해자들은 100% 배상을 요구하며 집단소송을 준비 중이다. 은행권은 "분쟁조정 결과를 성실히 이행하겠다"는 입장이지만, 추가 배상에는 난색을 표하고 있다.

금융당국은 조속한 분쟁 해결을 위해 중재에 나서고 있으나 양측의 입장 차이가 커 합의점 도출이 쉽지 않은 상황이다.`,
  },
  {
    id: 'fn3', title: '가계부채 5개월 만에 감소 전환... 고금리 여파',
    summary: '높은 금리 부담으로 인해 가계대출 잔액이 5개월 만에 감소세로 돌아섰다. 특히 신용대출 상환이 늘었다.',
    source: '파이낸셜뉴스', date: '2026.01.13', category: 'Finance', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `높은 금리 부담으로 가계대출 잔액이 5개월 만에 감소세로 전환됐다.

금융위원회에 따르면 12월 말 기준 전 금융권 가계대출 잔액은 1,876조원으로 전월 대비 1.2조원 줄었다. 가계대출이 감소한 것은 지난 7월 이후 5개월 만이다.

항목별로 보면 신용대출이 0.8조원 감소해 가장 큰 폭으로 줄었다. 주택담보대출도 0.3조원 감소했다. 고금리로 이자 부담이 커지면서 대출을 상환하는 가구가 늘어난 것으로 분석된다.

전문가들은 "고금리가 가계부채 증가세를 억제하는 효과가 나타나고 있다"면서도 "이자 부담 증가로 가계 소비 여력이 줄어들 수 있다"고 우려했다.`,
  },

  // Real Estate (3 articles, last 3 days: 01.13-01.15)
  {
    id: 'r1', title: '국토부 1.10 대책 이후 재건축 아파트 호가 상승세',
    summary: '안전진단 완화를 골자로 한 1.10 대책 발표 이후 노후 아파트 단지의 호가가 꿈틀대고 있다.',
    source: '부동산114', date: '2026.01.15', category: 'RealEstate', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `정부의 '1.10 부동산 대책' 발표 이후 서울 강남권을 중심으로 재건축 아파트 호가가 상승세를 보이고 있다.

부동산114에 따르면 서울 강남구 은마아파트의 경우 대책 발표 후 호가가 1억원 이상 오른 매물이 등장했다. 송파구 잠실주공5단지, 서초구 반포주공1단지 등 주요 재건축 단지에서도 호가 상승 움직임이 나타나고 있다.

정부의 1.10 대책은 재건축 안전진단 기준 완화, 용적률 상향 등을 골자로 한다. 30년 이상 노후 아파트의 재건축 추진이 수월해지면서 해당 단지에 대한 기대감이 커진 것으로 분석된다.

다만 업계에서는 "호가 상승이 실거래로 이어지기까지는 시간이 걸릴 것"이라며 "고금리 상황에서 매수세가 크게 살아나기 어렵다"고 전망했다.`,
  },
  {
    id: 'r2', title: '서울 아파트 거래량 역대 최저 수준... 관망세 뚜렷',
    summary: '호가는 올랐지만 실제 거래는 이뤄지지 않고 있다. 매도자와 매수자 간의 가격 괴리가 크다.',
    source: '중앙일보', date: '2026.01.14', category: 'RealEstate', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `서울 아파트 거래량이 역대 최저 수준으로 떨어졌다. 매도자와 매수자 간의 가격 괴리가 크면서 관망세가 짙어지고 있다.

서울부동산정보광장에 따르면 1월 1~13일 서울 아파트 거래 신고 건수는 1,200여 건에 불과해 같은 기간 기준 역대 최저치를 기록했다.

매도자들은 정부의 부동산 대책을 기대하며 호가를 높이고 있지만, 매수자들은 고금리와 경기 불확실성을 이유로 관망하는 모습이다.

부동산 전문가는 "매수자 우위 시장이 지속되면서 급매물 위주로만 거래가 이뤄지고 있다"며 "금리 인하가 본격화되기 전까지 거래 부진이 이어질 것"이라고 전망했다.`,
  },
  {
    id: 'r3', title: '전세사기 피해지원 특별법 개정안 국회 통과',
    summary: '전세사기 피해자 지원을 강화하는 내용의 특별법 개정안이 국회 본회의를 통과했다.',
    source: 'YTN', date: '2026.01.13', category: 'RealEstate', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `전세사기 피해자 지원을 강화하는 특별법 개정안이 13일 국회 본회의를 통과했다.

개정안의 주요 내용은 피해자 인정 요건 완화, 지원금 한도 상향, 우선매수권 행사 기한 연장 등이다. 특히 피해자 인정 기준을 '임차보증금 전액 미반환'에서 '일부 미반환'으로 완화해 더 많은 피해자가 지원받을 수 있게 됐다.

또한 긴급 생활안정자금 지원 한도가 기존 2,000만원에서 3,000만원으로 늘어났다. 피해 주택에 대한 우선매수권 행사 기한도 6개월에서 1년으로 연장됐다.

국토교통부는 "개정안이 시행되면 약 5만 명의 추가 피해자가 지원받을 수 있을 것"이라며 후속 시행령 마련에 착수했다.`,
  },

  // Global (5 articles, last 3 days: 01.13-01.15)
  {
    id: 'g1', title: '美 12월 CPI 3.4% 상승... 예상치 상회',
    summary: '미국의 12월 소비자물가지수가 예상치를 상회하며 인플레이션 우려가 재점화됐다.',
    source: 'Bloomberg', date: '2026.01.15', category: 'Global', important: true,
    url: 'https://news.einfomax.co.kr/',
    content: `미국의 12월 소비자물가지수(CPI)가 전년 동월 대비 3.4% 상승하며 시장 예상치(3.2%)를 상회했다.

미 노동부가 15일(현지시간) 발표한 자료에 따르면, 근원 CPI(식품·에너지 제외)도 3.9% 상승해 예상치(3.8%)를 웃돌았다. 특히 주거비와 서비스 물가 상승이 두드러졌다.

이번 지표 발표로 연방준비제도(Fed)의 조기 금리 인하 기대감이 후퇴했다. 시장에서는 3월 금리 인하 가능성이 20% 이하로 떨어졌다.

월가 전문가들은 "인플레이션이 예상보다 끈질기게 유지되고 있다"며 "Fed의 첫 금리 인하는 5~6월 이후에나 가능할 것"이라고 전망했다. 이 소식에 미 국채 금리가 상승하고 주가는 하락했다.`,
  },
  {
    id: 'g2', title: '중국 경제성장률 5% 목표 달성 "빨간불"... 디플레 공포',
    summary: '중국의 내수 부진과 부동산 위기로 인해 올해 경제성장률 목표 달성이 쉽지 않을 것이라는 전망이 나왔다.',
    source: 'Reuters', date: '2026.01.14', category: 'Global', important: true,
    url: 'https://news.einfomax.co.kr/',
    content: `중국의 올해 경제성장률 5% 목표 달성에 빨간불이 켜졌다.

로이터통신이 주요 투자은행을 대상으로 조사한 결과, 2026년 중국 GDP 성장률 전망 평균은 4.5%로 정부 목표치(5.0%)를 밑돌았다.

가장 큰 우려는 디플레이션이다. 중국의 소비자물가는 0%대에 머물고 있고, 생산자물가는 마이너스를 기록 중이다. 소비 심리 위축과 부동산 시장 침체가 겹치면서 내수 경기가 좀처럼 살아나지 않고 있다.

부동산 위기도 여전하다. 대형 부동산 개발업체들의 디폴트가 이어지고 있고, 주택 가격 하락세도 지속되고 있다.

중국 정부는 경기 부양을 위해 재정·통화 정책을 동원하고 있지만, 효과가 제한적이라는 평가가 나온다.`,
  },
  {
    id: 'g3', title: '일본은행, 마이너스 금리 해제 시기 저울질... 4월 유력',
    summary: '일본은행이 춘투 임금 인상 결과를 확인한 후 4월경 마이너스 금리를 해제할 것이라는 관측이 지배적이다.',
    source: 'Nikkei', date: '2026.01.14', category: 'Global', important: false,
    url: 'https://news.einfomax.co.kr/',
    content: `일본은행(BOJ)이 마이너스 금리 정책을 종료할 시기를 저울질하고 있다.

니혼게이자이신문에 따르면 BOJ는 오는 3월 춘투(봄철 임금 협상) 결과를 확인한 후 4월 금융정책결정회의에서 마이너스 금리 해제를 결정할 가능성이 높다.

우에다 가즈오 총재는 최근 "임금과 물가의 선순환이 확인되면 금융완화 수정을 검토하겠다"고 밝힌 바 있다. 올해 춘투에서는 5% 이상의 임금 인상이 예상되고 있어, 이 조건이 충족될 가능성이 크다.

마이너스 금리가 해제되면 엔화 강세와 함께 글로벌 자금 흐름에 상당한 변화가 생길 수 있다. 엔캐리 트레이드 청산에 따른 글로벌 금융시장 변동성 확대 우려도 나온다.`,
  },
  {
    id: 'g4', title: 'ECB 라가르드 "여름께 금리 인하 가능성"... 시장 기대감↑',
    summary: '유럽중앙은행 총재가 여름 금리 인하 가능성을 시사하자 유럽 증시가 일제히 상승했다.',
    source: 'FT', date: '2026.01.13', category: 'Global', important: false,
    url: 'https://news.einfomax.co.kr/',
    content: `유럽중앙은행(ECB) 크리스틴 라가르드 총재가 올여름 금리 인하 가능성을 시사하면서 유럽 금융시장에 훈풍이 불었다.

라가르드 총재는 13일(현지시간) 다보스포럼 인터뷰에서 "인플레이션이 예상대로 둔화한다면 여름께 금리 인하를 시작할 수 있을 것"이라고 밝혔다.

이 발언에 유럽 주요국 증시가 일제히 상승했다. 독일 DAX 지수는 1.2% 올랐고, 프랑스 CAC40 지수도 0.9% 상승했다. 유로존 국채 금리는 하락했다.

ECB는 현재 기준금리를 4.0%로 유지하고 있다. 시장에서는 6월부터 금리 인하가 시작되어 연내 3~4차례 인하가 이뤄질 것으로 기대하고 있다.`,
  },
  {
    id: 'g5', title: '홍해 리스크 고조... 해상 운임 급등에 공급망 차질 우려',
    summary: '예멘 후티 반군의 공격으로 홍해 물류가 마비되면서 해상 운임이 급등하고 있다. 글로벌 인플레이션 압력이 커지고 있다.',
    source: 'CNBC', date: '2026.01.13', category: 'Global', important: false,
    url: 'https://news.einfomax.co.kr/',
    content: `예멘 후티 반군의 상선 공격이 계속되면서 홍해를 통한 물류가 사실상 마비됐다. 이에 따라 해상 운임이 급등하고 글로벌 공급망 차질 우려가 커지고 있다.

세계 최대 해운사 머스크와 MSC 등은 홍해 대신 아프리카 희망봉을 우회하는 항로로 전환했다. 이로 인해 아시아-유럽 항로 운항 기간이 10~14일 늘어났다.

상하이컨테이너운임지수(SCFI)는 한 달 새 두 배 이상 급등했다. 운임 상승은 곧 상품 가격 인상으로 이어져 글로벌 인플레이션 압력을 가중시킬 수 있다.

전문가들은 "홍해 사태가 장기화하면 글로벌 물가에 0.2~0.3%포인트의 상승 압력이 생길 수 있다"고 분석했다.`,
  },

  // Industry (3 articles, last 3 days: 01.13-01.15)
  {
    id: 'i1', title: '삼성전자, "AI 반도체 점유율 1위 탈환" 선언... HBM4 개발 박차',
    summary: '삼성전자가 차세대 HBM 시장 주도권을 위해 HBM4 개발에 속도를 내고 있다.',
    source: '전자신문', date: '2026.01.15', category: 'Industry', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `삼성전자가 차세대 고대역폭메모리(HBM) 시장에서 1위 탈환을 선언하며 HBM4 개발에 박차를 가하고 있다.

삼성전자는 15일 실적발표 컨퍼런스콜에서 "HBM4 제품을 올해 하반기 고객사에 샘플 제공할 예정"이라며 "2026년 양산을 목표로 개발에 속도를 내고 있다"고 밝혔다.

현재 HBM 시장은 SK하이닉스가 선두를 달리고 있다. 삼성전자는 HBM3E 제품의 엔비디아 승인 지연 등으로 점유율이 떨어진 상황이다.

삼성전자 측은 "HBM4에서는 12단 이상 적층 기술과 선진 패키징 기술을 적용해 성능을 대폭 끌어올릴 것"이라며 자신감을 내비쳤다. 업계에서는 AI 서버 시장 성장에 따라 HBM 수요가 폭발적으로 늘어날 것으로 보고 있다.`,
  },
  {
    id: 'i2', title: '현대차, 작년 영업이익 사상 최대... 전기차 판매 호조',
    summary: '현대차가 고부가가치 차량 판매 확대에 힘입어 사상 최대 실적을 기록했다.',
    source: '오토타임즈', date: '2026.01.14', category: 'Industry', important: true,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `현대자동차가 2024년 사상 최대 영업이익을 기록했다.

현대차가 14일 발표한 잠정 실적에 따르면, 지난해 영업이익은 약 15조원으로 전년 대비 8% 증가했다. 매출도 160조원을 넘어서며 역대 최고치를 경신했다.

실적 호조의 주요 요인은 고부가가치 차량 판매 확대다. 제네시스 브랜드 판매가 전년 대비 12% 늘었고, SUV와 전기차 판매도 호조를 보였다. 특히 아이오닉5와 6의 글로벌 판매가 크게 증가했다.

현대차 관계자는 "올해도 전기차와 하이브리드 라인업을 확대하고 미국 조지아 공장 가동을 본격화해 성장세를 이어가겠다"고 밝혔다.`,
  },
  {
    id: 'i3', title: 'LG에너지솔루션, 북미 배터리 공장 증설 가속화',
    summary: 'LG엔솔이 IRA 혜택을 극대화하기 위해 북미 지역 배터리 공장 증설을 서두르고 있다.',
    source: '디지털타임스', date: '2026.01.13', category: 'Industry', important: false,
    url: 'https://news.naver.com/main/main.naver?mode=LSD&mid=shm&sid1=101',
    content: `LG에너지솔루션이 미국 인플레이션감축법(IRA) 혜택을 극대화하기 위해 북미 배터리 공장 증설에 속도를 내고 있다.

LG엔솔은 13일 "미국 애리조나주 원통형 배터리 공장 증설을 앞당겨 올해 3분기 가동을 목표로 하고 있다"고 밝혔다. 이 공장은 연간 36GWh 규모로 테슬라 등에 납품할 예정이다.

IRA에 따르면 미국에서 생산된 배터리를 탑재한 전기차는 최대 7,500달러의 세액공제 혜택을 받을 수 있다. LG엔솔은 이 혜택을 활용하려는 완성차 업체들의 러브콜을 받고 있다.

LG엔솔 관계자는 "북미 시장 수요에 맞춰 생산능력을 선제적으로 확보하고 있다"며 "2026년까지 북미 생산능력을 200GWh 이상으로 늘릴 계획"이라고 설명했다.`,
  },
];

export const DAILY_SUMMARY = `
# 2026년 1월 15일 한국 경제 심층 일일 브리핑

## 1. 금융 시장 동향: 기관 매수세와 환율의 변동성 심화

### 1.1 국내 주식 시장 분석
오늘 국내 주식 시장은 **기관 투자자들의 강력한 매수세**가 유입되며 소폭 상승 마감했습니다. 장 초반에는 외국인 투자자들의 매도세가 우세하여 약세 흐름을 보였으나, 오후 장에 접어들면서 연기금과 보험사를 중심으로 한 기관의 저가 매수세가 본격화되며 시장 분위기가 반전되었습니다.

특히 주목할 점은 **반도체 대형주들의 강세**입니다. 삼성전자와 SK하이닉스가 AI 반도체 수요 확대 기대감에 힘입어 동반 상승하며 지수 상승을 견인했습니다. 이는 최근 글로벌 빅테크 기업들의 AI 인프라 투자 확대 발표가 잇따르면서 메모리 반도체에 대한 낙관론이 확산된 결과로 분석됩니다. 증권가에서는 올해 상반기까지 반도체 업종의 강세가 지속될 것으로 전망하고 있습니다.

반면, 중소형주 중심의 코스닥 시장은 **개인 투자자들의 차익 실현 매물**이 쏟아지며 소폭 하락했습니다. 특히 2차전지 관련주들의 약세가 두드러졌는데, 이는 최근 전기차 판매 둔화 우려와 함께 밸류에이션 부담이 작용한 것으로 해석됩니다. 바이오 섹터 또한 차익 실현 매물에 밀려 힘을 쓰지 못하는 모습이었습니다.

### 1.2 외환 시장 및 채권 시장
외환 시장에서는 **변동성이 크게 확대**되었습니다. 원/달러 환율은 전일 대비 소폭 상승 마감했습니다. 이는 간밤 발표된 미국의 12월 소비자물가지수(CPI)가 시장 예상치를 상회함에 따라 미 연준의 조기 금리 인하 기대감이 후퇴하고, 이에 따른 글로벌 달러 강세가 반영된 결과입니다.

전문가들은 당분간 환율이 현재 수준에서 박스권 움직임을 보일 것으로 전망하고 있습니다. 다만, 미국의 통화정책 방향과 국내 경상수지 동향에 따라 변동성이 확대될 가능성도 배제할 수 없습니다.

채권 시장에서는 한국은행의 금리 동결 결정에도 불구하고 국고채 금리가 소폭 상승했습니다. 이는 미국 국채 금리 상승의 영향이 국내 시장으로 전이된 것으로, 향후 금리 인하 시점이 예상보다 늦춰질 수 있다는 우려가 반영된 것입니다.

## 2. 거시 경제 이슈: 금리 동결과 수출의 부활

### 2.1 한국은행 통화정책 결정
**한국은행 금융통화위원회**는 오늘 오전 열린 통화정책방향 회의에서 기준금리를 현행 수준으로 동결했습니다. 이는 8회 연속 동결 결정입니다. 이창용 한국은행 총재는 기자회견을 통해 "물가 상승률이 목표 수준인 2%로 충분히 수렴한다는 확신이 들 때까지 통화 긴축 기조를 충분히 장기간 지속할 것"이라고 강조했습니다.

특히 총재는 "현재의 가계부채 증가세와 부동산 시장의 불안정성을 고려할 때 섣부른 금리 인하는 오히려 시장에 잘못된 시그널을 줄 수 있다"며 조기 금리 인하론에 대해 강하게 선을 그었습니다. 이는 시장에서 기대하던 상반기 금리 인하 가능성이 낮아졌음을 시사하는 것으로, 채권 시장과 부동산 시장에 상당한 영향을 미칠 것으로 예상됩니다.

금통위 위원들 사이에서도 향후 통화정책 방향에 대한 이견이 있는 것으로 알려졌습니다. 일부 위원들은 내수 경기 부진을 고려해 금리 인하의 필요성을 언급한 반면, 다수 위원들은 물가 안정을 최우선 과제로 삼아야 한다는 입장을 고수한 것으로 전해집니다.

### 2.2 수출 동향 및 무역수지
실물 경제에서는 **긍정적인 신호**가 감지되고 있습니다. 산업통상자원부가 발표한 1월 초순 수출 동향에 따르면, 수출액은 전년 동기 대비 크게 증가한 것으로 집계되었습니다. 가장 고무적인 부분은 그동안 한국 수출의 발목을 잡았던 **반도체 수출이 대폭 증가**했다는 점입니다.

이는 AI 수요 확대에 따른 메모리 반도체 가격 반등과 수요 회복이 본격화되고 있음을 시사합니다. 특히 고대역폭메모리(HBM)와 같은 고부가가치 제품에 대한 수요가 급증하면서 반도체 수출 단가도 개선되고 있습니다.

대중국 수출 또한 오랜 기간의 감소세를 끝내고 증가세로 전환되며 무역수지 개선에 대한 기대감을 높였습니다. 중국 경제의 회복세가 더디긴 하지만, 한국산 반도체와 디스플레이에 대한 수요는 견조한 것으로 나타났습니다. 전문가들은 올해 무역수지가 흑자 기조를 유지할 것으로 전망하고 있습니다.

### 2.3 내수 경기 전망
다만, 내수 경기는 여전히 부진한 모습입니다. 고금리 환경이 지속되면서 가계의 이자 부담이 가중되고, 이는 소비 심리 위축으로 이어지고 있습니다. 한국개발연구원(KDI)은 최근 발표한 경제동향 보고서에서 "올해 민간소비 증가율이 예상보다 낮을 수 있다"고 경고했습니다.

특히 서비스업 중심의 고용 시장에서 불안 요소가 감지되고 있습니다. 자영업자들의 폐업이 증가하고 있으며, 청년 실업률도 개선되지 않고 있어 정부의 적극적인 대응이 필요한 상황입니다.

## 3. 산업 및 기업: 반도체 훈풍과 밸류업 프로그램

### 3.1 반도체 업황 분석
산업계에서는 **반도체 업황 회복**이 최대 화두입니다. 삼성전자는 오늘 "차세대 HBM(고대역폭메모리) 시장에서의 리더십을 공고히 하기 위해 HBM4 개발 로드맵을 앞당기겠다"고 발표했습니다. 이는 경쟁사인 SK하이닉스와의 기술 격차를 줄이고, 엔비디아 등 주요 고객사 선점을 위한 공격적인 행보로 해석됩니다.

현재 HBM 시장에서는 SK하이닉스가 앞서 있는 것으로 평가되지만, 삼성전자가 차세대 제품에서 승부를 걸겠다는 전략입니다. 업계에서는 AI 학습 및 추론에 필요한 고성능 메모리 수요가 폭발적으로 증가할 것으로 예상되어, 양사 간의 기술 경쟁이 더욱 치열해질 것으로 전망하고 있습니다.

증권가에서는 올해 반도체 업종의 영업이익이 전년 대비 크게 증가할 것으로 내다보고 있습니다. 메모리 반도체 가격이 바닥을 찍고 반등하고 있으며, AI 반도체 수요 증가가 실적 개선을 견인할 것이라는 분석입니다.

### 3.2 기업 밸류업 프로그램
정부가 추진 중인 **"기업 밸류업 프로그램"**에 대한 시장의 관심도 뜨겁습니다. 금융위원회는 PBR(주가순자산비율) 1배 미만의 저평가 기업들에게 기업가치 제고 계획 공시를 의무화하는 방안을 검토 중이라고 밝혔습니다.

이 프로그램의 핵심은 기업들이 자사주 매입, 배당 확대, 자본 효율성 개선 등을 통해 주주가치를 높이도록 유도하는 것입니다. 일본의 '거버넌스 개혁'을 벤치마킹한 것으로, 한국 증시의 만성적인 저평가 문제를 해결하기 위한 정책적 시도입니다.

이에 따라 전통적인 저PBR 업종인 은행, 보험, 자동차, 지주사들의 주가가 일제히 강세를 보였습니다. 특히 현대차와 기아는 사상 최대 실적 기대감과 맞물려 52주 신고가를 경신하는 등 주주환원 정책 강화에 대한 기대감이 주가에 선반영되고 있습니다.

### 3.3 부동산 시장 동향
부동산 시장은 여전히 **침체 국면**을 벗어나지 못하고 있습니다. 정부가 야심 차게 내놓은 1.10 부동산 대책(재건축 안전진단 면제 등) 이후 서울 강남권 일부 재건축 단지를 중심으로 호가가 소폭 상승했으나, 고금리 부담으로 인해 실제 매수세는 따라붙지 않고 있습니다.

국토부 실거래가 공개시스템에 따르면 서울 아파트 거래량은 역대 최저 수준을 기록하고 있습니다. 매수자들은 금리 인하를 기다리며 관망세를 유지하고 있고, 매도자들은 호가를 낮추기보다는 버티기를 선택하고 있어 거래 교착 상태가 지속되고 있습니다.

전문가들은 금리 인하가 본격화되기 전까지 부동산 시장의 뚜렷한 반등을 기대하기 어려울 것으로 전망하고 있습니다. 다만, 서울 핵심 지역의 신축 아파트에 대한 수요는 여전히 견조하여 양극화 현상이 심화될 가능성이 있습니다.

## 4. 글로벌 경제: 인플레이션의 역습과 홍해 리스크

### 4.1 미국 인플레이션 재점화 우려
글로벌 경제는 다시금 **인플레이션 공포**에 휩싸였습니다. 미국 노동부가 발표한 12월 소비자물가지수(CPI)가 시장 예상치를 웃돌았습니다. 주거비와 서비스 물가가 여전히 높은 수준을 유지하고 있어, 인플레이션이 생각보다 끈질기다는 점이 확인되었습니다.

특히 주목할 점은 에너지 가격을 제외한 근원 인플레이션이 여전히 높다는 것입니다. 이는 연준이 우려하는 '서비스 인플레이션의 고착화' 가능성을 시사하는 것으로, 금리 인하 시점이 예상보다 늦춰질 수 있다는 전망에 힘을 실어주고 있습니다.

시카고상품거래소(CME) 페드워치에 따르면 3월 금리 인하 확률은 이전의 높은 수준에서 크게 하락했습니다. 시장에서는 이제 6월 이후에나 첫 금리 인하가 가능할 것이라는 전망이 우세해지고 있습니다.

### 4.2 홍해 지정학적 리스크
지정학적 리스크 또한 글로벌 공급망을 위협하고 있습니다. 예멘 후티 반군의 상선 공격으로 인해 홍해 항로의 물류 차질이 장기화되고 있습니다. 주요 해운사들이 수에즈 운하 대신 아프리카 희망봉으로 우회하면서 해상 운임이 급등하고 있습니다.

이러한 해상 운임 상승은 결국 수입 물가 상승으로 이어져 글로벌 인플레이션 압력을 가중시킬 수 있다는 우려가 제기됩니다. 특히 유럽으로 향하는 아시아 화물의 배송 기간이 크게 늘어나면서 공급망 차질이 현실화되고 있습니다.

테슬라와 볼보 등 일부 자동차 기업들은 부품 수급 차질로 인해 유럽 공장 가동을 일시 중단하는 등 그 여파가 실물 경제로 확산되는 조짐입니다. 전문가들은 홍해 사태가 장기화될 경우 올해 글로벌 무역에 상당한 부정적 영향을 미칠 수 있다고 경고하고 있습니다.

### 4.3 주요국 통화정책 전망
각국 중앙은행들의 통화정책 방향도 주목됩니다. 미 연준은 물가 안정을 확인할 때까지 신중한 스탠스를 유지할 것으로 보이며, 유럽중앙은행(ECB)도 비슷한 기조를 이어갈 전망입니다.

반면, 일본은행(BOJ)은 마이너스 금리 정책을 종료할 시점을 저울질하고 있습니다. 춘투(봄 임금 협상) 결과를 확인한 후 4월경 정책 변경에 나설 것이라는 관측이 지배적입니다. 이는 글로벌 금융시장에 상당한 파급 효과를 미칠 수 있어 주의 깊은 모니터링이 필요합니다.

## 5. 향후 전망 및 투자 시사점

### 5.1 단기 시장 전망
단기적으로 국내 증시는 **박스권 등락**이 예상됩니다. 반도체 업황 회복에 대한 기대감이 상방 요인으로 작용하는 반면, 고금리 지속에 따른 내수 부진 우려와 글로벌 불확실성이 하방 압력으로 작용할 것입니다.

외국인 투자자들의 수급 동향이 시장 방향성을 결정하는 핵심 변수가 될 전망입니다. 원화 약세가 지속될 경우 외국인 매도세가 이어질 수 있으나, 반도체 업황 턴어라운드에 대한 기대감이 이를 상쇄할 가능성도 있습니다.

### 5.2 투자 전략 제언
현 시점에서는 **선별적 접근**이 필요합니다. 반도체, 특히 AI 관련 고부가가치 제품을 생산하는 기업들에 대한 비중 확대를 고려할 만합니다. 또한 밸류업 프로그램의 수혜가 예상되는 저PBR 대형주에도 관심을 기울일 필요가 있습니다.

반면, 금리 민감도가 높은 성장주와 부동산 관련주는 당분간 신중한 접근이 바람직합니다. 글로벌 인플레이션 리스크와 지정학적 불확실성을 고려할 때, 포트폴리오 내 현금 비중을 일정 수준 유지하는 것도 리스크 관리 차원에서 고려해볼 만합니다.
`;

export const DAILY_SUMMARY_EN = `
# Korea Economic In-Depth Daily Briefing - January 15, 2026

## 1. Financial Market Trends: Institutional Buying and Exchange Rate Volatility
The domestic stock market closed higher today, driven by notable **institutional investor buying**. The **KOSPI** ended the day at **2,654.32**, up **11.89 points (0.45%)** from the previous session. Despite early weakness due to foreign selling, the market rebounded in the afternoon as institutional investors, particularly pension funds, engaged in bargain hunting. Samsung Electronics and SK Hynix, the top market-cap stocks, rose 1.2% and 2.5% respectively, leading the index gains.

In contrast, the **KOSDAQ** fell **1.85 points (0.21%)** to close at **874.11** as retail investors took profits. Secondary battery-related stocks showed notable weakness, and the bio sector also struggled under profit-taking pressure.

The foreign exchange market saw increased volatility. The **USD/KRW exchange rate** rose **4.0 won** to close at **1,335.50 won**. This reflects the global dollar strength following the release of US December CPI data that exceeded market expectations, dampening hopes for early Fed rate cuts. Experts expect the exchange rate to remain within the 1,320-1,350 won range for the time being.

## 2. Macroeconomic Issues: Rate Hold and Export Revival
The **Bank of Korea's Monetary Policy Committee** decided to hold the base rate at **3.50%** at this morning's meeting. This marks the eighth consecutive rate freeze. Governor Lee Chang-yong emphasized in his press conference that "we will maintain the monetary tightening stance for a sufficiently long period until we are confident that inflation is converging to our 2% target." He strongly pushed back against early rate cut expectations, stating that "given the current household debt growth and real estate market instability, premature rate cuts could send the wrong signal to the market."

Meanwhile, positive signs are emerging in the real economy. According to export data released by the Ministry of Trade, Industry and Energy, exports from **January 1-10** increased **18%** year-over-year. Most encouraging is the **56% surge in semiconductor exports**, which had been dragging down Korean exports. This indicates that memory chip prices are recovering and demand is picking up with expanding AI demand. Exports to China also turned positive for the first time in 20 months, raising expectations for improved trade balance.

## 3. Industry and Corporate: Semiconductor Tailwinds and Value-Up Program
In the industrial sector, **semiconductor recovery** is the hottest topic. Samsung Electronics announced today that it would "accelerate the HBM4 development roadmap to solidify leadership in the next-generation HBM (High Bandwidth Memory) market." This is seen as an aggressive move to close the technology gap with competitor SK Hynix and secure major customers like NVIDIA. Securities analysts expect operating profits in the semiconductor sector to increase by more than 300% year-over-year.

Market interest in the government's **"Corporate Value-Up Program"** is also heating up. The Financial Services Commission announced it is considering making disclosure of corporate value enhancement plans mandatory for undervalued companies with PBR (Price-to-Book Ratio) below 1. As a result, stocks in traditionally low-PBR sectors such as banks, insurance, automobiles, and holding companies rallied together. Hyundai Motor and Kia in particular hit 52-week highs, with expectations for record earnings and enhanced shareholder return policies being priced in.

The real estate market remains in a slump. After the government's ambitious **January 10 real estate measures** (including exemption from reconstruction safety inspections), asking prices rose slightly in some reconstruction complexes in Seoul's Gangnam area, but actual buying demand has not followed due to high interest rate burdens. According to the Ministry of Land's real transaction price disclosure system, Seoul apartment transaction volume is at an all-time low, suggesting policy effects will take time to materialize.

## 4. Global Economy: Inflation Comeback and Red Sea Risk
The global economy is once again gripped by **inflation fears**. The **December Consumer Price Index (CPI)** released by the US Department of Labor rose **3.4%** year-over-year, exceeding market expectations of 3.2%. Housing and service prices remain elevated, confirming that inflation is more persistent than expected. As a result, according to CME FedWatch, the probability of a March rate cut has plummeted from over 70% to below 50%.

Geopolitical risks are also threatening global supply chains. Attacks by Houthi rebels in Yemen continue to disrupt shipping through the Red Sea. As major shipping companies reroute around the Cape of Good Hope instead of the Suez Canal, ocean freight rates are surging, raising concerns that this could lead to higher import prices and add to global inflationary pressures. Some automakers including Tesla and Volvo have temporarily halted European factory operations due to parts supply disruptions, showing signs of the impact spreading to the real economy.
`;

export const AUDIO_SCRIPT_KR = `
안녕하십니까, 2026년 1월 15일 한국 경제 심층 브리핑입니다.

먼저 금융 시장 소식입니다. 오늘 코스피는 기관 투자자들의 매수세가 유입되며 소폭 상승 마감했습니다. 특히 삼성전자와 SK하이닉스 등 반도체 대장주들이 AI 수요 확대 기대감에 힘입어 지수 상승을 이끌었습니다. 반면 코스닥은 개인들의 차익 실현 매물로 소폭 하락했습니다. 원달러 환율은 미국의 소비자물가 지수가 예상보다 높게 나오면서 소폭 상승 마감했습니다.

한국은행은 오늘 올해 첫 금융통화위원회에서 기준금리를 현행 수준으로 동결했습니다. 이창용 총재는 물가가 목표치로 확실히 수렴할 때까지 긴축 기조를 유지하겠다고 밝히며, 시장의 조기 금리 인하 기대감을 일축했습니다. 가계부채 증가세와 부동산 시장 불안을 고려한 결정으로 보입니다.

실물 경제는 회복 조짐을 보이고 있습니다. 1월 초순 수출액이 작년 같은 기간보다 크게 증가했습니다. 특히 우리 경제의 버팀목인 반도체 수출이 대폭 증가하며 확실한 반등세를 보였고, 대중국 수출도 오랜 기간 만에 증가세로 돌아섰습니다.

기업 뉴스입니다. 정부가 저평가된 기업들의 가치를 높이기 위한 '기업 밸류업 프로그램' 도입을 예고하면서 은행, 보험, 자동차 등 저PBR 주식들이 강세를 보였습니다. 삼성전자는 차세대 AI 반도체 시장 주도권을 잡기 위해 HBM4 개발 속도를 높이겠다고 선언했습니다.

마지막으로 글로벌 경제입니다. 미국의 12월 소비자물가가 예상치를 웃돌았습니다. 인플레이션 우려가 다시 고개를 들면서 연준의 금리 인하 시기가 늦춰질 수 있다는 전망이 힘을 얻고 있습니다. 또한 홍해 지역의 지정학적 리스크로 해상 운임이 급등하고 있어 글로벌 공급망 차질 우려도 커지고 있습니다.

이상 오늘의 심층 경제 브리핑이었습니다.
`;

export const AUDIO_SCRIPT_EN = `
Good evening. Here is the In-Depth Korea Economic News Briefing for January 15th, 2026.

Let's begin with the financial markets. The KOSPI closed slightly higher today, driven by strong institutional buying. Early in the session, foreign investors were net sellers, putting downward pressure on the market. However, the afternoon saw a dramatic reversal as pension funds and insurance companies stepped in with significant buying activity at lower price levels.

The standout performers were large-cap semiconductor stocks. Samsung Electronics and SK Hynix both posted solid gains, buoyed by growing expectations for AI-related demand. This optimism stems from recent announcements by global tech giants about expanding their AI infrastructure investments. Market analysts expect the semiconductor sector's strength to continue through at least the first half of this year.

On the other hand, the KOSDAQ, which is dominated by smaller and mid-cap stocks, slipped slightly. Retail investors took profits on secondary battery stocks, which have seen significant gains in recent months. Concerns about slowing electric vehicle sales and stretched valuations weighed on the sector. The biotech sector also struggled under profit-taking pressure.

Moving to the foreign exchange market, volatility expanded notably today. The Korean Won weakened modestly against the US dollar, reflecting global dollar strength following higher-than-expected US inflation data. Currency experts expect the exchange rate to trade within a range for the time being, though volatility could increase depending on US monetary policy direction and Korea's current account trends.

In the bond market, government bond yields edged higher despite the Bank of Korea's decision to hold rates steady. This reflects the spillover effect from rising US Treasury yields and growing concerns that interest rate cuts may be delayed longer than previously anticipated.

Now for macroeconomic developments. The Bank of Korea's Monetary Policy Committee decided to freeze the base rate at the current level during this morning's policy meeting. This marks the eighth consecutive meeting where rates have been held unchanged.

Governor Rhee Chang-yong was clear in his press conference, stating that the central bank will maintain its tightening stance for an extended period until there is confidence that inflation is converging to the target level. He pushed back firmly against expectations for early rate cuts, noting that premature easing could send the wrong signal to markets given current household debt growth and real estate market instability.

There were reportedly some differences of opinion among committee members regarding the future policy path. Some members highlighted the need for rate cuts given weak domestic demand, while the majority maintained that price stability should remain the top priority.

Turning to the real economy, there are encouraging signs of recovery. Export figures for early January showed a significant increase compared to the same period last year. Most notably, semiconductor exports surged substantially, demonstrating a clear turnaround after months of decline. This reflects recovering memory chip prices and strengthening demand driven by AI applications.

Exports to China also turned positive for the first time in many months, raising hopes for improved trade balance. Despite China's economic challenges, demand for Korean semiconductors and displays remains solid. Experts project Korea's trade balance will remain in surplus throughout this year.

However, domestic consumption remains sluggish. The prolonged high interest rate environment has increased household interest burdens, weighing on consumer sentiment. The Korea Development Institute has warned that private consumption growth this year may fall short of expectations.

In corporate and industry news, the semiconductor sector recovery is the dominant theme. Samsung Electronics announced today that it will accelerate its HBM4 development roadmap to secure leadership in the next-generation high-bandwidth memory market. This is seen as an aggressive move to close the technology gap with SK Hynix and capture major customers like NVIDIA. Analysts expect semiconductor sector operating profits to increase dramatically this year as memory prices rebound and AI chip demand accelerates.

The government's Corporate Value-up Program is also generating significant market interest. The Financial Services Commission indicated it is considering mandatory disclosure requirements for undervalued companies with price-to-book ratios below one. As a result, traditionally undervalued sectors including banks, insurance companies, automakers, and holding companies all saw their stocks rally. Hyundai Motor and Kia hit new 52-week highs as expectations for record earnings combine with hopes for enhanced shareholder return policies.

The real estate market, however, remains in a prolonged slump. Following the government's ambitious January 10th real estate measures, including exemptions from reconstruction safety inspections, asking prices have risen slightly in some Gangnam reconstruction complexes. However, actual buying activity has not followed due to high interest rate burdens. Seoul apartment transaction volumes remain at historic lows, suggesting it will take time for policy effects to materialize.

Finally, let's look at the global economy. Inflation fears have resurfaced in markets worldwide. US consumer inflation for December exceeded expectations, with housing and service prices remaining stubbornly high. This confirms that inflation is proving more persistent than hoped.

Of particular concern is that core inflation, excluding energy prices, remains elevated. This suggests the Fed's worry about entrenched services inflation may be justified, lending support to expectations that rate cuts will be delayed. Market-based probabilities for a March rate cut have declined significantly from earlier elevated levels.

Geopolitical risks are also threatening global supply chains. Attacks by Houthi rebels in Yemen continue to disrupt shipping through the Red Sea. As major shipping companies reroute around the Cape of Good Hope instead of the Suez Canal, ocean freight rates are surging. This raises concerns about higher import prices and additional global inflationary pressures. Transit times for Asian cargo to Europe have increased substantially.

Some automakers, including Tesla and Volvo, have temporarily halted European factory operations due to parts supply disruptions, showing signs of the impact spreading to the real economy. Experts warn that if the Red Sea situation persists, it could have a significant negative impact on global trade this year.

Looking at major central banks, the Federal Reserve appears likely to maintain a cautious stance until price stability is confirmed. The European Central Bank is expected to follow a similar path. Meanwhile, the Bank of Japan is weighing when to end its negative interest rate policy, with April seen as the most likely timing following spring wage negotiation results. This could have significant ripple effects on global financial markets.

This has been your in-depth daily economic briefing. Thank you for listening.
`;
