export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center font-sans px-4 bg-background text-foreground">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">

        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-accent" aria-hidden="true">
          <span className="text-4xl font-bold text-background">K</span>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground">
            Kaskad Taxi
          </h1>
          <p className="text-base leading-relaxed text-pretty text-muted">
            Служба такси Kaskad Group. Заказывайте поездки через VK-бота — быстро,
            безопасно и без лишних шагов.
          </p>
        </div>

        <div className="w-full rounded-xl p-5 flex flex-col gap-4 bg-surface border border-border">
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                <circle cx="12" cy="9" r="2.5"/>
              </svg>
            }
            label="Выбор точек на карте"
            desc="Нажмите кнопку в боте — откроется карта, тыкните откуда и куда."
          />
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            }
            label="Моментальный расчёт"
            desc="Цена рассчитывается автоматически по расстоянию и времени суток."
          />
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-4 0v2M8 7V5a2 2 0 0 0-4 0v2"/>
                <line x1="8" y1="12" x2="8" y2="12.01"/>
                <line x1="12" y1="12" x2="12" y2="12.01"/>
                <line x1="16" y1="12" x2="16" y2="12.01"/>
              </svg>
            }
            label="Промокоды"
            desc="Используйте промокоды для получения скидки."
          />
          <Feature
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-accent flex-shrink-0 mt-0.5">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            }
            label="Несколько способов оплаты"
            desc="Наличные, счёт телефона или банковский счёт."
          />
        </div>

        <p className="text-muted text-xs">
          Kaskad Group — виртуальный бизнес-симулятор
        </p>
      </div>
    </main>
  )
}

function Feature({
  icon,
  label,
  desc,
}: {
  icon: React.ReactNode
  label: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 text-left">
      {icon}
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs leading-relaxed mt-0.5 text-muted">{desc}</div>
      </div>
    </div>
  )
}
