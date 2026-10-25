import type { IsoDate } from '@/lib/types'
import type { Copy, Marked, TapeWords } from './copy'
import { HORIZON, OPENING, PAYROLL, RENT, at, culprit, tapeDay } from './model'
import type { Flight, FlowName } from './model'

/* The landing page in Vietnamese: the same page as copy.ts, written for a shop owner rather than translated. */

const grouped = new Intl.NumberFormat('vi-VN')
const compact = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 })
const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const pad = (n: number) => String(n).padStart(2, '0')

/** `45.000.000 ₫` */
const vnd = (v: number) => `${v < 0 ? '−' : ''}${grouped.format(Math.abs(Math.round(v)))} ₫`
/** `12,8 triệu` */
const m = (v: number) => `${v < 0 ? '−' : ''}${compact.format(Math.abs(v) / 1e6)} triệu`
/** `16/11` */
const date = (today: IsoDate, day: number) => {
  const d = at(today, day)
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`
}
/** `Thứ Hai 16/11` */
const dayName = (today: IsoDate, day: number) => `${WD[at(today, day).getUTCDay()]} ${date(today, day)}`
const M = (v: number) => m(v).toUpperCase()

const NAMES: Record<FlowName, string> = {
  payout: 'Tiền sàn về',
  cod: 'Tiền COD về',
  clay: 'Đất & men',
  payroll: 'Trả lương',
  rent: 'Thuê xưởng',
  utilities: 'Điện nước',
  packaging: 'Bao bì',
  ads: 'Quảng cáo & ship',
  restock: 'Nhập hàng',
  restock1: 'Nhập hàng 1/2',
  restock2: 'Nhập hàng 2/2',
  sales: 'Tiền bán hàng mới',
}
const VERDICT = { short: 'Thiếu tiền', clear: 'Đủ tiền' }

export const VI: Copy = {
  vnd,
  m,
  date,
  dayName,
  names: NAMES,

  skip: 'Tới nội dung chính',
  home: 'Trang chủ FinPilot',
  nav: { board: 'Sắp đến hạn', checklist: 'Cách dùng', case: 'Ví dụ', pricing: 'Bảng giá', faq: 'Hỏi đáp' },
  navPrimary: 'Mục chính',
  navSections: 'Các phần',
  navFooter: 'Chân trang',
  sound: { label: 'Âm thanh', on: 'Âm thanh bật', off: 'Âm thanh tắt' },
  signIn: 'Đăng nhập',
  start: 'Đăng ký',
  menu: { open: 'Mở menu', close: 'Đóng menu' },

  hero: {
    eyebrow: 'Dự báo dòng tiền cho shop online',
    title: ['Xem dòng tiền ', 'trước', ' khi nhập hàng.'] as Marked,
    lede: 'FinPilot vẽ dòng tiền của shop theo từng ngày cho 56 ngày tới. Trước khi trả tiền nhà cung cấp, bạn biết ngay lương, tiền thuê và mọi hóa đơn có còn đủ tiền trả không.',
    fares: 'Xem bảng giá',
    preflight: 'Xem 4 bước kiểm tra',
    facts: ['Dự báo 56 ngày', 'Tính từng đồng, không làm tròn', 'Làm riêng cho shop Việt'],
  },

  plan: {
    eyebrow: 'Thử ngay',
    shop: 'gốm làm tay',
    tag: 'Shop mẫu',
    today: 'Hôm nay',
    days: 'ngày',
    restock: 'Tiền nhập hàng, trả hôm nay',
    paid: (split: boolean) => (split ? 'chia đôi' : 'trả một lần'),
    mark: (millions: number) => (millions === 0 ? '0' : `${millions} tr`),
    pay: 'Trả nhà cung cấp',
    upfront: 'Trả một lần',
    split: 'Chia đôi',
    lowest: 'Thấp nhất',
    on: 'Vào ngày',
    verdict: 'Kết luận',
    chartShort: (today: IsoDate, day: number) => `THIẾU TỪ ${date(today, day)}`,
  },
  verdict: VERDICT,
  inDays: (n: number) => (n === 0 ? 'hôm nay' : n === 1 ? 'ngày mai' : `sau ${n} ngày`),
  sentence(f: Flight, today: IsoDate): { alarm: string; rest: string } {
    if (!f.short) return { alarm: '', rest: `Đủ tiền trả lương, tiền thuê và nhà cung cấp. Thấp nhất còn ${vnd(f.min)} vào ${dayName(today, f.minDay)}.` }
    const c = culprit(f, f.firstShort)
    return {
      alarm: `Thiếu ${vnd(-f.balances[f.firstShort])} vào ${dayName(today, f.firstShort)}`,
      rest: `${c ? `, khi đến hạn “${NAMES[c.name]}” (${m(-c.amount)})` : ''}.${f.split ? ' Thử nhập ít hàng hơn.' : ' Thử chia đôi tiền hàng.'}`,
    }
  },

  ticker(f: Flight, today: IsoDate, hour: number) {
    return {
      label: 'Tóm tắt dự báo',
      head: 'BẢN TIN FNPL',
      stamp: `${date(today, 0)} ${pad(hour)}:00`,
      items: [
        ['SỐ DƯ', M(OPENING)],
        ['NHẬP HÀNG', `${M(f.restock)} ${f.split ? 'CHIA ĐÔI' : 'TRẢ MỘT LẦN'}`],
        ['LƯƠNG', `${date(today, 12)} ${M(PAYROLL)}`],
        ['THUÊ XƯỞNG', `${date(today, 19)} ${M(RENT)}`],
        ['THẤP NHẤT', `${M(f.min)} ${date(today, f.minDay)}`],
        ['DỰ BÁO', `${HORIZON} NGÀY`],
      ] as [string, string][],
      tail: 'SHOP MẪU',
    }
  },

  board: {
    eyebrow: 'Sắp đến hạn',
    title: ['Đủ hay thiếu, biết ', 'trước', ' khi trả.'] as Marked,
    lede: 'Mọi khoản chi lớn trong 56 ngày tới và số tiền còn lại sau mỗi khoản. Kéo thanh nhập hàng ở trên, bảng lật theo ngay.',
    heading: 'KHOẢN CHI · 56 NGÀY',
    local: 'GIỜ',
    columns: ['Ngày', 'Khoản chi', 'Số tiền', 'Còn lại', 'Tình trạng'],
    list: 'Các khoản sắp chi của shop mẫu, kèm số tiền còn lại sau mỗi khoản',
    note: 'Số liệu của một shop mẫu.',
    adjust: 'Đổi tiền nhập hàng ↑',
    empty: 'Trống',
    noRestock: { label: 'KHÔNG NHẬP', said: 'Hôm nay không nhập hàng.' },
    status: { clear: 'ĐỦ', short: 'THIẾU' },
    due: (today: IsoDate, day: number) => date(today, day),
    amount: (v: number) => (Math.abs(v) >= 100e6 ? `${Math.round(v / 1e6)}TR` : `${(v / 1e6).toFixed(1).replace('.', ',')}TR`),
    said: (today: IsoDate, day: number, name: string, amount: number, balance: number, short: boolean) =>
      `${dayName(today, day)}, ${name.toLowerCase()} ${vnd(amount)}. Còn lại ${vnd(balance)}, ${short ? 'thiếu tiền' : 'đủ tiền'}.`,
  },

  checklist: {
    eyebrow: 'Cách dùng',
    title: ['Kiểm tra ', 'hai phút', ' trước khi nhập hàng.'] as Marked,
    lede: 'Phi công không cất cánh theo trí nhớ. Chủ shop sắp chuyển 80 triệu cũng đừng đoán. Đánh dấu lần lượt bốn bước, cũng là bốn bước FinPilot làm giúp bạn.',
    head: 'Trước khi nhập hàng',
    count: (n: number, total: number) => (n === total ? `${total}/${total}, yên tâm nhập hàng` : `Xong ${n}/${total} bước`),
    progress: 'Số bước đã xong',
    checks: [
      {
        title: 'Số dư hiện có',
        response: 'Đã nhập',
        text: 'Bắt đầu từ số tiền tiêu được ngay hôm nay. Không tính tiền sàn chưa về hay khoản “chắc thứ Sáu có”, chỉ con số bạn dám dùng để trả lương.',
      },
      {
        title: 'Tiền vào, tiền ra',
        response: 'Đã ghi',
        text: 'Tiền sàn trả về, tiền COD, lương, tiền thuê, hóa đơn nhà cung cấp, mỗi khoản ghi đúng ngày tiền thật sự về hay đi.',
      },
      {
        title: 'Kịch bản nhập hàng',
        response: 'Đã vẽ',
        text: 'Thêm đơn hàng bạn đang cân nhắc, trả một lần hay chia đợt, và đường 56 ngày vẽ lại trước khi một đồng nào rời tài khoản.',
      },
      {
        title: 'Điểm thấp nhất',
        response: 'Ổn',
        text: 'Nếu đường số dư xuống dưới 0, FinPilot chỉ rõ ngày nào, thiếu bao nhiêu và khoản nào gây ra, để bạn kịp hoãn, chia đợt hay bớt đơn.',
      },
    ],
  },

  caseFile: {
    eyebrow: 'Hồ sơ FP-26-029',
    title: ['Tháng shop ', 'trễ lương', '.'] as Marked,
    lede: 'Một tiệm gốm giả định, một tháng rất bình thường. Chúng tôi mở hộp đen dòng tiền của tiệm và phát lại hai lần: một lần đúng như đã xảy ra, một lần có FinPilot ngồi ghế phụ.',
    findings: [
      { k: 'Phát hiện 1 · Báo trước', v: '24 ngày', text: 'từ lúc trả tiền hàng tới ngày không đủ tiền trả lương. Bản dự báo thấy ngay từ ngày đầu.' },
      { k: 'Phát hiện 2 · Khoản hụt', v: '12,8 triệu', text: 'thiếu đúng ngày trả lương. Chưa bằng một tuần doanh thu, mà không có dự báo thì không ai thấy.' },
      { k: 'Phát hiện 3 · Cách gỡ', v: 'Chia đôi', text: 'tiền trả nhà cung cấp. Không vay, không ai bị trễ lương.' },
    ],
  },

  blackBox: {
    recorder: 'Hộp đen dòng tiền',
    unit: 'TRIỆU',
    day: (n: number) => `Ngày ${n}`,
    fictional: 'giả định',
    channel: 'Kênh phát lại',
    channels: { a: 'Như đã xảy ra', b: 'Có FinPilot' },
    replay: 'Phát lại băng',
    transcript: 'Ghi âm + sổ quỹ',
    time: (day: number, hhmm: string) => {
      const d = tapeDay(day)
      return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)} ${hhmm}`
    },
    rejected: 'Bị từ chối',
    sent: 'Đã chuyển',
    balance: (v: number) => `${v < 0 ? '−' : ''}${compact.format(Math.abs(v) / 1e6)} tr`,
    short: (v: number) => `Thiếu ${compact.format(v / 1e6)} tr`,
    endOfTape: 'Hết băng',
    tapes: {
      a: [
        ['Sổ quỹ', 'Số dư đầu tháng'],
        ['Nhà cung cấp', '“Trả đủ 72 triệu hôm nay thì bên em bớt 2%.”'],
        ['Chủ shop', '“Được, chuyển hết luôn.”'],
        ['Ngân hàng', 'Tiền nhập hàng, trả một lần'],
        ['Shopee', 'Tiền sàn trả về'],
        ['Quảng cáo', 'Quảng cáo & ship'],
        ['Chủ nhà', 'Tiền thuê xưởng'],
        ['Shopee', 'Tiền sàn trả về'],
        ['COD', 'Tiền COD, dòng men mới'],
        ['Chủ shop', '“Chuyển lương cho mọi người đi.”'],
        ['Ngân hàng', 'Lương 9 nhân viên'],
        ['Chủ shop', '“Vay tạm 15 triệu, lãi 4% một tháng. Mai trả lương mọi người.”'],
      ] as TapeWords[],
      b: [
        ['Sổ quỹ', 'Số dư đầu tháng'],
        ['Nhà cung cấp', '“Trả đủ 72 triệu hôm nay thì bên em bớt 2%.”'],
        ['FinPilot', 'Trả một lần thì ngày 26/09 thiếu 12,8 triệu tiền lương.'],
        ['FinPilot', 'Chia 36 + 36, đợt hai trả ngày 03/10 thì đủ lương, thấp nhất còn 6,8 triệu.'],
        ['Chủ shop', '“Trả trước một nửa, nửa còn lại mùng 3. Không lấy 2% cũng được.”'],
        ['Ngân hàng', 'Tiền nhập hàng, đợt 1'],
        ['Shopee', 'Tiền sàn trả về'],
        ['Quảng cáo', 'Quảng cáo & ship'],
        ['Chủ nhà', 'Tiền thuê xưởng'],
        ['Shopee', 'Tiền sàn trả về'],
        ['COD', 'Tiền COD, dòng men mới'],
        ['Ngân hàng', 'Lương 9 nhân viên'],
        ['Shopee', 'Tiền sàn trả về'],
        ['Ngân hàng', 'Tiền nhập hàng, đợt 2'],
      ] as TapeWords[],
    },
    end: {
      a: {
        stamp: 'Trễ lương',
        sub: 'Đã rõ nguyên nhân',
        label: 'Nguyên nhân',
        text: 'Cả 72 triệu đi ra 24 ngày trước ngày trả lương, mà không có gì cho thấy phần còn lại của tháng sẽ ra sao. Giờ phát thử kênh B.',
      },
      b: {
        stamp: 'Đủ lương',
        sub: 'Không vay · không ai trễ lương',
        label: 'Kết quả',
        text: 'Cùng tháng đó, cùng doanh thu. FinPilot thấy chỗ hụt trước 24 ngày, và chỉ một lần chia đôi tiền hàng đã giữ lương mọi người đúng hạn.',
      },
    },
  },

  pricing: {
    eyebrow: 'Bảng giá',
    title: ['Chọn gói ', 'vừa với shop', '.'] as Marked,
    lede: 'Bắt đầu miễn phí. Nâng gói khi dự báo đã đáng tiền, và hạ lại tháng nào cũng được.',
    period: 'Kỳ thanh toán',
    monthly: 'Tháng',
    yearly: 'Năm',
    tag: 'Giá dự kiến khi ra mắt · chưa mở bán',
    note: 'Giá tính bằng đồng, đã gồm VAT. Gói Glider không cần thẻ. Trang này không thu tiền hay gửi gì đi.',
    number: (n: number) => grouped.format(n),
    currencyFirst: false,
    perMonth: '/ tháng',
    free: 'Miễn phí, dùng bao lâu tùy bạn',
    billedMonthly: 'Trả theo tháng · hủy lúc nào cũng được',
    billedYearly: (total: number, save: number) => `Trả ${vnd(total)} mỗi năm · tiết kiệm ${vnd(save)}`,
    fares: [
      {
        level: 'FL000 · Dưới đất',
        for: 'Cho shop mới bắt đầu.',
        list: ['1 shop, dự báo 56 ngày', 'Tự nhập số dư và hóa đơn', 'Lưu 1 kịch bản nhập hàng', 'Cảnh báo thiếu tiền trên biểu đồ'],
        cta: 'Dùng miễn phí',
      },
      {
        level: 'FL180 · Đang lên',
        for: 'Cho shop tháng nào cũng nhập hàng.',
        list: ['Mọi thứ của Glider', 'Không giới hạn kịch bản', 'Nhập từ Excel & CSV'],
        cta: 'Chọn Pilot',
        badge: 'Nhiều shop chọn nhất',
      },
      {
        level: 'FL350 · Bay ổn định',
        for: 'Cho shop muốn có người hỗ trợ sát bên.',
        list: ['Mọi thứ của Pilot', 'Hỗ trợ ưu tiên bằng tiếng Việt'],
        cta: 'Chọn Fleet',
      },
    ],
  },

  faq: {
    eyebrow: 'Hỏi đáp',
    title: ['Câu hỏi ', 'thường gặp', '.'] as Marked,
    radio: 'TẦN SỐ 121,5 · ĐANG NGHE',
    tower: 'ĐÁP',
    questions: [
      {
        q: 'FinPilot có kết nối với ngân hàng hay sàn của tôi không?',
        a: 'Không. Bạn tự nhập số dư đã chắc chắn, để bản dự báo bắt đầu từ con số bạn tin. Danh sách khoản thu, khoản chi thì có thể nhập từ tệp Excel hoặc CSV.',
      },
      {
        q: 'Đây có phải phần mềm kế toán không?',
        a: 'Không. FinPilot không ghi sổ, không làm thuế và không bao giờ chuyển tiền. Nó chỉ trả lời đúng một câu hỏi. Tới ngày mỗi khoản đến hạn, có đủ tiền không?',
      },
      {
        q: 'Sao chỉ dự báo 56 ngày?',
        a: 'Tám tuần là thấy được hai kỳ lương và hai lần trả tiền thuê. Xa hơn nữa thì đoán nhiều hơn biết, nên dự báo dừng ở chỗ còn nói thật được.',
      },
      {
        q: 'Tính bằng tiền gì?',
        a: 'Đồng Việt Nam, số nguyên. Không có số lẻ, không làm tròn, 50.000.001 ₫ vẫn đúng là 50.000.001 ₫.',
      },
      {
        q: 'Đường số dư xuống dưới 0 thì sao?',
        a: 'FinPilot chỉ ra ngày đầu tiên bạn thiếu tiền, thiếu bao nhiêu và khoản nào đến hạn, khi vẫn còn kịp hoãn, chia đợt hay bớt đơn hàng.',
      },
    ],
  },

  footer: {
    about: 'Dự báo dòng tiền cho shop online ở Việt Nam. FinPilot không chuyển tiền và không phải lời khuyên tài chính.',
    legal: '© 2026 FinPilot · Shop và số liệu trên trang này là giả định · Không theo dõi người xem.',
    top: 'Lên đầu trang ↑',
  },
}
