import { ApiError } from '@/lib/api'

export interface AuthProblem {
  field: 'email' | 'password' | null
  message: string
}

const SAME_EMAIL = 'Email này đã có tài khoản. Hãy đăng nhập, hoặc dùng “Quên mật khẩu” nếu không nhớ mật khẩu.'

/** ASP.NET Identity error codes (the keys of a ValidationProblem) in the owner's words. */
function fromCode(code: string, original: string): AuthProblem {
  switch (code) {
    case 'PasswordTooShort': {
      const n = /\d+/.exec(original)?.[0]
      return { field: 'password', message: n ? `Mật khẩu cần ít nhất ${n} ký tự.` : 'Mật khẩu quá ngắn.' }
    }
    case 'PasswordRequiresNonAlphanumeric':
      return { field: 'password', message: 'Mật khẩu cần ít nhất một ký tự đặc biệt (ví dụ ! @ #).' }
    case 'PasswordRequiresDigit':
      return { field: 'password', message: 'Mật khẩu cần ít nhất một chữ số.' }
    case 'PasswordRequiresLower':
      return { field: 'password', message: 'Mật khẩu cần ít nhất một chữ thường.' }
    case 'PasswordRequiresUpper':
      return { field: 'password', message: 'Mật khẩu cần ít nhất một chữ hoa.' }
    case 'PasswordRequiresUniqueChars':
      return { field: 'password', message: 'Mật khẩu cần nhiều ký tự khác nhau hơn.' }
    case 'DuplicateUserName':
    case 'DuplicateEmail':
      return { field: 'email', message: SAME_EMAIL }
    case 'InvalidEmail':
    case 'InvalidUserName':
      return { field: 'email', message: 'Email không hợp lệ.' }
    case 'InvalidToken':
      return { field: null, message: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.' }
    default:
      return { field: null, message: original }
  }
}

/** Every problem in a failed auth call, de-duplicated, ready to show next to the right field. */
export function authProblems(e: unknown): AuthProblem[] {
  if (!(e instanceof ApiError)) return [{ field: null, message: 'Đã có lỗi không mong muốn. Vui lòng thử lại.' }]
  if (e.status === 0) return [{ field: null, message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' }]
  if (e.status === 429) return [{ field: null, message: 'Bạn thử quá nhiều lần. Đợi một lát rồi thử lại.' }]
  if (e.status >= 500) return [{ field: null, message: 'Máy chủ gặp sự cố, vui lòng thử lại sau ít phút.' }]
  if (e.status === 401) {
    const detail = e.problem?.detail?.toLowerCase() ?? ''
    if (detail.includes('locked')) return [{ field: null, message: 'Tài khoản tạm khóa vì nhập sai nhiều lần. Thử lại sau ít phút.' }]
    if (detail.includes('notallowed')) return [{ field: null, message: 'Tài khoản chưa được phép đăng nhập. Kiểm tra email xác nhận rồi thử lại.' }]
    return [{ field: null, message: 'Email hoặc mật khẩu không đúng.' }]
  }
  const errors = Object.entries(e.problem?.errors ?? {}).flatMap(([code, messages]) => messages.map((m) => fromCode(code, m)))
  if (errors.length === 0) return [{ field: null, message: e.problem?.detail ?? e.problem?.title ?? 'Yêu cầu không hợp lệ.' }]
  const seen = new Set<string>()
  return errors.filter((p) => !seen.has(p.message) && Boolean(seen.add(p.message)))
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** ASP.NET Identity's default password policy, which the backend keeps. */
export const PASSWORD_HINT = 'Ít nhất 6 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.'
