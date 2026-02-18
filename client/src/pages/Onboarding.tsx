export default function OnboardingPage() {
  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md bg-white shadow-sm rounded-xl p-6 border border-slate-200">
        <h1 className="text-xl font-semibold mb-2 text-slate-900 text-center">ברוך הבא ל‑MemoRaid</h1>
        <p className="text-sm text-slate-600 mb-4 text-center">
          כאן נבנה בהמשך את תהליך ההצטרפות לקבוצה קיימת או יצירת קבוצה חדשה לפי ה‑PRD.
        </p>
        <p className="text-sm text-slate-700 text-center">
          בינתיים ניתן להשתמש בדף ההרשמה כדי ליצור קבוצה ראשונה, ולאחר מכן נתחבר לדשבורד.
        </p>
      </div>
    </div>
  );
}

