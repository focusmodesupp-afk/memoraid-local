import { Lightbulb } from 'lucide-react';

const STORY_PARAGRAPHS = [
  `MEMORAID נולד מתוך מציאות אמיתית. כשהורה מתחיל להראות סימנים של דמנציה, המשפחה נכנסת לתקופה מבלבלת. פתאום יש תרופות לנהל, תורים לתאם, ושאלות שאין עליהן תשובות - "מי נותן לו את התרופה בבוקר?", "מה הרופא אמר בביקור האחרון?", "למה אף אחד לא סיפר לי?"`,
  `הבנו שהבעיה היא לא חוסר רצון לעזור - אלא חוסר ארגון. קבוצות WhatsApp מלאות בהודעות, אבל אף אחד לא יודע מה באמת קרה. יש רצון טוב, אבל אין כלים.`,
  `אז בנינו את MEMORAID - הכלי שהלוואי שהיה לנו כשהתחלנו. מקום אחד שבו כל המשפחה יודעת מה קורה, מי עשה מה, ומה צריך לעשות הלאה. בלי בלבול. בלי ויכוחים. בלי לאבד את עצמכם בדרך.`,
];

export function OurStorySection() {
  return (
    <section className="mt-16 space-y-6 rounded-3xl bg-[hsl(var(--card))/0.5] px-6 py-12 md:px-10 md:py-16" id="about">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))/0.08] px-4 py-1 text-xs font-medium text-[hsl(var(--primary))]">
          <Lightbulb className="h-3 w-3" />
          <span>הסיפור שלנו</span>
        </div>
        <h2 className="text-2xl font-semibold">למה MEMORAID קיים</h2>
      </div>

      <div className="mx-auto max-w-3xl rounded-2xl bg-[hsl(var(--card))] p-6 shadow-sm md:p-12">
        <div className="space-y-4 text-sm text-[hsl(var(--foreground))] leading-relaxed text-justify">
          {STORY_PARAGRAPHS.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
