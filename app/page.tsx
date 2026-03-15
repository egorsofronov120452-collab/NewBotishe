export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center font-sans px-4">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">

        {/* Logo mark */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold"
          style={{ background: 'var(--color-accent)', color: '#fff' }}
          aria-hidden="true"
        >
          K
        </div>

        <div className="flex flex-col gap-2">
          <h1
            className="text-4xl font-bold tracking-tight text-balance"
            style={{ color: 'var(--color-foreground)' }}
          >
            Kaskad Taxi
          </h1>
          <p
            className="text-base leading-relaxed text-pretty"
            style={{ color: 'var(--color-muted)' }}
          >
            Служба такси Kaskad Group. Заказывайте поездки через VK-бота — быстро,
            безопасно и без лишних шагов.
          </p>
        </div>

        <div
          className="w-full rounded-xl p-5 flex flex-col gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <Feature icon="📍" label="Выбор точек на карте" desc="Нажмите кнопку в боте — откроется карта, тыкните откуда и куда." />
          <Feature icon="💰" label="Моментальный расчёт" desc="Цена рассчитывается автоматически по расстоянию и времени суток." />
          <Feature icon="🎟" label="Промокоды" desc="Используйте промокоды для получения скидки." />
          <Feature icon="💳" label="Несколько способов оплаты" desc="Наличные, счёт телефона или банковский счёт." />
        </div>

        <p style={{ color: 'var(--color-muted)', fontSize: '12px' }}>
          Kaskad Group — виртуальный бизнес-симулятор
        </p>
      </div>
    </main>
  )
}

function Feature({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 text-left">
      <span className="text-xl mt-0.5" aria-hidden="true">{icon}</span>
      <div>
        <div className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>{label}</div>
        <div className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--color-muted)' }}>{desc}</div>
      </div>
    </div>
  )
}
