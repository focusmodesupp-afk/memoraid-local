import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Users } from 'lucide-react';
import { useLocation } from 'wouter';

type AnswerOption = {
  label: string;
  score: number;
  icon?: JSX.Element;
};

type Question = {
  id: number;
  text: string;
  options: AnswerOption[];
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    text: 'כמה אנשים מעורבים בטיפול היומיומי?',
    options: [
      { label: 'רק אני', score: 1 },
      { label: '2‑3', score: 3 },
      { label: '4 ומעלה', score: 5 },
    ],
  },
  {
    id: 2,
    text: 'כמה תרופות צריך לנהל ביום?',
    options: [
      { label: '1‑2', score: 1 },
      { label: '3‑5', score: 3 },
      { label: '6 ומעלה', score: 5 },
    ],
  },
  {
    id: 3,
    text: 'האם קרה ששכחתם לתת תרופה או נתתם פעמיים?',
    options: [
      { label: 'אף פעם', score: 0 },
      { label: 'לפעמים', score: 3 },
      { label: 'לעיתים קרובות', score: 5 },
    ],
  },
  {
    id: 4,
    text: 'איך מתואמים בין בני המשפחה כרגע?',
    options: [
      { label: 'מסודר', score: 0 },
      { label: 'בעיקר WhatsApp', score: 2 },
      { label: 'טלפון ובלגן', score: 4 },
      { label: 'אין תיאום בכלל', score: 5 },
    ],
  },
  {
    id: 5,
    text: 'כמה זמן ביום מוקדש לתיאום ומעקב?',
    options: [
      { label: 'פחות מ‑15 דקות', score: 1 },
      { label: '15‑30 דקות', score: 2 },
      { label: '30‑60 דקות', score: 3 },
      { label: 'שעה ומעלה', score: 5 },
    ],
  },
  {
    id: 6,
    text: 'האם צריך לעקוב אחרי מדדים רפואיים?',
    options: [
      { label: 'לא', score: 0 },
      { label: 'מדד אחד', score: 2 },
      { label: 'כמה מדדים', score: 4 },
    ],
  },
];

type Level = 'low' | 'medium' | 'high';

export function FitQuizSection() {
  const [, navigate] = useLocation();
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const question = QUESTIONS[currentIndex];
  const totalScore = useMemo(
    () => answers.reduce((sum, v) => sum + v, 0),
    [answers]
  );

  const resultLevel: Level = totalScore <= 8 ? 'low' : totalScore <= 18 ? 'medium' : 'high';

  const resultConfig: Record<
    Level,
    { title: string; subtitle: string; highlights: string[]; toneClass: string }
  > = {
    low: {
      title: 'המצב בשליטה - אבל אפשר לשפר',
      subtitle:
        'אתם כבר עושים עבודה טובה. MEMORAID יכולה להוסיף סדר, תיעוד ושקט נפשי.',
      highlights: ['תזכורות אוטומטיות', 'מעקב היסטורי מסודר', 'שקט נפשי למשפחה'],
      toneClass: 'border-[hsl(var(--accent))/0.4] bg-[hsl(var(--accent))/0.06]',
    },
    medium: {
      title: 'MEMORAID מתאימה לכם מאוד!',
      subtitle:
        'יש הרבה מה לנהל והרבה בני משפחה מעורבים. מערכת חכמה תחסוך לכם זמן, מאמץ וחיכוכים.',
      highlights: [
        'התראות WhatsApp חכמות',
        'שיתוף משפחתי בזמן אמת',
        'ניהול תרופות חכם ומדדים',
      ],
      toneClass: 'border-[hsl(var(--primary))/0.5] bg-[hsl(var(--primary))/0.06]',
    },
    high: {
      title: 'אתם ממש צריכים את MEMORAID!',
      subtitle:
        'העומס הטיפולי שלכם גבוה. הגיע הזמן שמערכת תתפוס את הכול בשבילכם – ולא הראש שלכם.',
      highlights: [
        'התראות ב‑4 ערוצים',
        'שאלונים קליניים וניתוח מסמכים',
        'דוחות מתקדמים ושיתוף מלא',
      ],
      toneClass: 'border-[hsl(var(--destructive))/0.5] bg-[hsl(var(--destructive))/0.06]',
    },
  };

  const progressPercent = ((currentIndex + 1) / QUESTIONS.length) * 100;

  const handleChoose = (score: number) => {
    const nextAnswers = [...answers];
    nextAnswers[currentIndex] = score;
    setAnswers(nextAnswers);

    if (currentIndex === QUESTIONS.length - 1) {
      setCurrentIndex(currentIndex + 1); // מצב "תוצאה"
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) return;
    setCurrentIndex(currentIndex - 1);
  };

  const handleRestart = () => {
    setAnswers([]);
    setCurrentIndex(0);
    setStarted(false);
  };

  // מצב תוצאה: currentIndex >= QUESTIONS.length
  const isResult = currentIndex >= QUESTIONS.length;

  return (
    <section id="quiz" className="mt-16">
      <div className="card relative overflow-hidden border-[hsl(var(--primary))/0.3] bg-gradient-to-b from-[hsl(var(--primary))/0.06] to-[hsl(var(--card))]" data-testid="card-fit-quiz">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[hsl(var(--primary))] flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>בדיקת התאמה מהירה</span>
            </p>
            <h2 className="mt-1 text-lg font-semibold">האם MEMORAID מתאימה לכם?</h2>
            <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              ענו על 6 שאלות קצרות וגלו אם המערכת יכולה לעזור למשפחה שלכם.
            </p>
          </div>
          {!started && !isResult && (
            <span className="hidden rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-[10px] font-medium text-[hsl(var(--muted-foreground))] md:inline">
              פחות מדקה אחת
            </span>
          )}
        </div>

        {/* מצב 1 – לפני התחלה */}
        {!started && !isResult && (
          <div
            className="mt-2 rounded-2xl border border-[hsl(var(--primary))/0.4] bg-gradient-to-r from-[hsl(var(--primary))/0.08] to-[hsl(var(--accent))/0.06] p-4 text-center"
            data-testid="card-fit-quiz-start"
          >
            <p className="text-sm font-medium mb-2">ענו על 6 שאלות קצרות וג׳עו לתשובה ברורה.</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-4">
              בלי הרשמה, בלי מחויבות, רק להבין אם הכלי הזה יכול להקל עליכם.
            </p>
            <button
              className="btn-primary inline-flex items-center gap-2 px-6 py-2 text-sm"
              onClick={() => setStarted(true)}
              data-testid="button-start-quiz"
            >
              <Sparkles className="h-4 w-4" />
              <span>בואו נבדוק</span>
            </button>
            <p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">
              לוקח פחות מדקה אחת.
            </p>
          </div>
        )}

        {/* מצב 2 – מהלך הקוויז */}
        {started && !isResult && (
          <div
            className="mt-4 space-y-4"
            data-testid="card-fit-quiz-question"
          >
            <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
              <span>שאלה {currentIndex + 1} מתוך {QUESTIONS.length}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--muted))/0.8]">
              <div
                className="h-full rounded-full bg-[hsl(var(--primary))] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <p className="text-sm font-medium">{question.text}</p>
                <div className="grid gap-2">
                  {question.options.map((opt, idx) => (
                    <button
                      key={idx}
                      className="btn-outline flex items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs md:text-sm hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))/0.04]"
                      onClick={() => handleChoose(opt.score)}
                      data-testid={`quiz-option-${currentIndex}-${idx}`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            {currentIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                data-testid="button-quiz-back"
              >
                <ArrowLeft className="h-3 w-3" />
                חזרה לשאלה הקודמת
              </button>
            )}
          </div>
        )}

        {/* מצב 3 – תוצאה */}
        {isResult && (
          <div
            className="mt-4 space-y-4"
            data-testid="card-fit-quiz-result"
          >
            <div
              className={`rounded-2xl border px-4 py-3 ${resultConfig[resultLevel].toneClass}`}
            >
              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))] mb-1">
                ציון התאמה: <span className="font-semibold">{totalScore}</span> מתוך 30
              </p>
              <h3 className="text-sm font-semibold mb-1">
                {resultConfig[resultLevel].title}
              </h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {resultConfig[resultLevel].subtitle}
              </p>
            </div>

            <ul className="grid gap-2 text-xs text-[hsl(var(--foreground))] md:grid-cols-3">
              {resultConfig[resultLevel].highlights.map((h, idx) => (
                <li
                  key={idx}
                  className="rounded-xl bg-[hsl(var(--card))] px-3 py-2 text-[11px] shadow-sm"
                >
                  {h}
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-2 pt-2 md:flex-row md:items-center">
              <button
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-2 text-sm w-full md:w-auto"
                onClick={() => navigate('/login')}
                data-testid="button-quiz-signup"
              >
                <Users className="h-4 w-4" />
                <span>התחילו עכשיו - חינם</span>
              </button>
              <button
                className="btn-outline px-4 py-2 text-xs w-full md:w-auto"
                onClick={handleRestart}
                data-testid="button-quiz-retry"
              >
                נסו שוב עם תשובות אחרות
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

