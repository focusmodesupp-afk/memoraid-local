import { FormEvent, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const { login, register, loading, error } = useAuth();
  const [, navigate] = useLocation();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerMode, setRegisterMode] = useState<'create' | 'join'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');

  const isLogin = mode === 'login';
  const isCreateFamily = registerMode === 'create';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (isLogin) {
        await login({ email, password, rememberMe });
      } else {
        if (isCreateFamily) {
          await register({
            mode: 'create',
            familyName: familyName || 'משפחת ללא שם',
            fullName,
            email,
            password,
          });
        } else {
          await register({
            mode: 'join',
            inviteCode: inviteCode.trim(),
            fullName,
            email,
            password,
          });
        }
      }
      navigate('/dashboard');
    } catch {
      // השגיאה כבר נשמרת ב-hook
    }
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--primary))/0.16] to-[hsl(var(--background))]"
    >
      <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1 text-[hsl(var(--foreground))] text-center">
          הרשמה ל‑MemorAid
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 text-center">
          כניסה או הרשמה להתחלת ניהול הטיפול המשפחתי.
        </p>

        <div className="flex mb-4 text-sm border border-[hsl(var(--border))] rounded-full overflow-hidden bg-[hsl(var(--background))]">
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-medium ${
              isLogin
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
            }`}
            onClick={() => setMode('login')}
          >
            כניסה
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-xs font-medium ${
              !isLogin
                ? 'bg-[hsl(var(--primary))] text-white'
                : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
            }`}
            onClick={() => setMode('register')}
          >
            הרשמה
          </button>
        </div>

        <div className="mb-4 space-y-2">
          <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
            {isLogin ? 'או התחברות מהירה:' : 'או הרשמה מהירה עם החשבון הקיים:'}
          </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() =>
                  alert('כניסה/הרשמה עם Google תתווסף בשלב הבא (OAuth). כרגע התחבר/י עם אימייל וסיסמה.')
                }
                className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]"
                data-testid="button-login-google"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-white shadow-sm">
                    <span className="text-[11px] font-bold text-[#4285F4]">G</span>
                  </span>
                  <span>{isLogin ? 'כניסה מהירה עם Gmail' : 'הרשמה/כניסה עם Gmail'}</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() =>
                  alert(
                    'כניסה/הרשמה עם Outlook / Microsoft תתווסף בשלב הבא. כרגע התחבר/י עם אימייל וסיסמה.'
                  )
                }
                className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-2 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))]"
                data-testid="button-login-outlook"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#0078D4] text-white shadow-sm">
                    <span className="text-[11px] font-semibold">O</span>
                  </span>
                  <span>{isLogin ? 'כניסה מהירה עם Outlook' : 'הרשמה/כניסה עם Outlook'}</span>
                </span>
              </button>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* בחירת סוג הרשמה: יצירת משפחה חדשה / הצטרפות למשפחה קיימת */}
              <div className="flex mb-1 text-xs border border-[hsl(var(--border))] rounded-full overflow-hidden bg-[hsl(var(--background))]">
                <button
                  type="button"
                  className={`flex-1 py-2 ${
                    isCreateFamily
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
                  }`}
                  onClick={() => setRegisterMode('create')}
                >
                  צור משפחה חדשה
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2 ${
                    !isCreateFamily
                      ? 'bg-[hsl(var(--primary))] text-white'
                      : 'bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]'
                  }`}
                  onClick={() => setRegisterMode('join')}
                >
                  הצטרף למשפחה קיימת
                </button>
              </div>

              {isCreateFamily ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
                      שם משפחה
                    </label>
                    <input
                      className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="משפחת כהן"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
                      שם פרטי + משפחה
                    </label>
                    <input
                      className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="יואב כהן"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
                      קוד משפחה
                    </label>
                    <input
                      className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="MEM-XXXXXX"
                    />
                    <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                      הזן את קוד המשפחה שקיבלת מאחד מבני המשפחה.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
                      שם פרטי + משפחה
                    </label>
                    <input
                      className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      placeholder="יואב כהן"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
              אימייל
            </label>
            <input
              type="email"
              className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[hsl(var(--foreground))]">
              סיסמה
            </label>
            <input
              type="password"
              className="w-full rounded-md border border-[hsl(var(--border))] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-[hsl(var(--primary))]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="לפחות 8 תווים, אות גדולה ומספר"
            />
          </div>

          {isLogin && (
            <div className="mt-1 flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                זכור אותי ל־30 יום
              </label>
              <button
                type="button"
                className="text-[10px] font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] underline-offset-2 hover:underline"
                onClick={() =>
                  alert(
                    'בגרסת ה‑MVP שינוי/איפוס סיסמה נעשה דרך תמיכה. בגרסה הבאה נוסיף מסך איפוס סיסמה מלא.'
                  )
                }
                data-testid="button-password-options"
              >
                שכחת סיסמה / שינוי סיסמה
              </button>
            </div>
          )}

          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 rounded-full bg-[hsl(var(--primary))] text-white py-2 text-sm font-medium hover:bg-[hsl(var(--primary))]/90 disabled:opacity-60"
          >
            {loading
              ? 'מעבד...'
              : isLogin
              ? 'כניסה'
              : isCreateFamily
              ? 'יצירת משפחה חדשה'
              : 'הצטרפות למשפחה קיימת'}
          </button>
        </form>
      </div>
    </div>
  );
}

