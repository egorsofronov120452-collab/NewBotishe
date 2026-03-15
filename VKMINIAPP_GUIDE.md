# Перенос функций бота в VK Mini App

## Архитектура проекта

```
[ VK Mini App (Next.js) ]  ←→  [ API Routes (Vercel) ]  ←→  [ JSON файлы данных ]
                                                                       ↑
[ long-polling.cjs ]  ─────────────────────────────────────────────────┘
(запускается на ПК / VPS отдельно от Vercel)
```

- **Next.js + Vercel** — фронтенд мини-апп и API эндпоинты (уже задеплоен)
- **long-polling.cjs** — бот, работает отдельно: `node scripts/long-polling.cjs`
- Оба читают/пишут одни и те же JSON файлы (или через API)

---

## 1. Создание Mini App в VK

1. Открыть https://vk.com/editapp?act=create
2. Выбрать **«Приложение для сообщества»**
3. Привязать к нужной группе (такси или доставка)
4. В поле **URL** вставить адрес вашего Vercel деплоя: `https://your-app.vercel.app`
5. Настройки → включить **«Доступ к сообщениям сообщества»**
6. Скопировать **App ID** — он понадобится для инициализации bridge

Кнопку «Открыть приложение» можно добавить прямо в меню группы ВКонтакте.

---

## 2. Деплой на Vercel (фронтенд + API)

```bash
# Установить Vercel CLI
npm i -g vercel

# В папке проекта
vercel --prod
```

Vercel автоматически определит Next.js и задеплоит. После этого:
- Мини-апп доступен по адресу: `https://your-app.vercel.app`
- API доступно по: `https://your-app.vercel.app/api/...`

> long-polling.cjs **не деплоится на Vercel** — Vercel не поддерживает долгоживущие процессы.
> Бот запускается на ПК или отдельном VPS через PM2.

---

## 3. Запуск бота отдельно (ПК или VPS)

```bash
# Установка PM2
npm install -g pm2

# Запуск бота
pm2 start scripts/long-polling.cjs --name vk-bot
pm2 save
pm2 startup   # автозапуск при перезагрузке

# Просмотр логов
pm2 logs vk-bot
```

---

## 4. Инициализация VK Bridge в мини-апп

```typescript
// app/layout.tsx или pages/_app.tsx
import bridge from '@vkontakte/vk-bridge';

// Вызвать один раз при старте приложения
bridge.send('VKWebAppInit');

// Получить VK user_id текущего пользователя
const { id } = await bridge.send('VKWebAppGetUserInfo');
```

Установка пакетов:
```bash
npm install @vkontakte/vk-bridge @vkontakte/vkui
```

---

## 5. Интерактивная карта такси (уже реализована)

Карта уже работает в `/taxi-order` — пользователь нажимает откуда и куда,  
цена считается автоматически по расстоянию между точками.

Для перевода на реальные координаты (Leaflet / OpenStreetMap):

```tsx
// Заменить x/y на lat/lng в map-editor.html (добавить поля «Широта» и «Долгота»)
// calculateTaxiPrice() в long-polling.cjs автоматически переключится на Haversine

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
// Тариф: 45р/км, +30% в часы пик (18-22 МСК)
```

---

## 6. Что остаётся только в боте (не переносить)

- Диспетчерская — приём заказов с inline-кнопками в чате
- Журнал активности (`!онлайн`, `!афк`, `!вышел`)
- Закупки курьера
- Ежедневные/еженедельные отчёты руководству
- Чат-команды (`!кик`, `!инвайт`, `!пост` и т.д.)

---

## 7. Переменные окружения на Vercel

В настройках проекта на Vercel добавьте те же переменные что и в `.env`:
`VK_GROUP1_TOKEN`, `VK_GROUP3_TOKEN`, `VK_GROUP1_ID`, `VK_GROUP3_ID` и т.д.

Это нужно чтобы API роуты (`/api/taxi-pick`, `/api/taxi-points`) могли  
авторизовывать запросы и записывать данные.


## Что можно реализовать через Mini App (рекомендуется)

VK Mini App — это React/Vue веб-приложение, которое открывается прямо внутри ВКонтакте.  
Ключевые преимущества для данного проекта:
- Интерактивная карта для выбора точек такси (Leaflet / react-leaflet)
- Красивый каталог с фото, пагинацией и корзиной
- Профиль сотрудника с фото машины
- Статистика онлайна в реальном времени

---

## 1. Создание Mini App

1. Открыть https://vk.com/editapp?act=create
2. Выбрать тип **«Приложение для сообщества»**
3. Привязать к сообществу 2 (Доставка) или создать общее приложение
4. Указать **URL сервера** — ваш деплой на Vercel (например `https://your-app.vercel.app`)
5. В настройках приложения → **«Настройки»** → включить `«Доступ к сообщениям сообщества»`

---

## 2. Технологический стек

```
frontend/
  ├── src/
  │   ├── App.tsx              # роутинг
  │   ├── pages/
  │   │   ├── MainMenu.tsx     # главное меню (доставка / такси)
  │   │   ├── Catalogue.tsx    # каталог с фото
  │   │   ├── Order.tsx        # корзина и оформление заказа
  │   │   ├── TaxiMap.tsx      # карта с выбором точек (Leaflet)
  │   │   ├── Profile.tsx      # профиль сотрудника
  │   │   └── OrderStatus.tsx  # статус активного заказа
  │   └── api/
  │       └── bot.ts           # вызовы к вашему серверу (Express/Next.js API)
  └── package.json
```

Установка SDK:

```bash
npm install @vkontakte/vk-bridge @vkontakte/vkui
npm install react-leaflet leaflet
```

---

## 3. Инициализация VK Bridge

```typescript
// src/main.tsx
import bridge from '@vkontakte/vk-bridge';
bridge.send('VKWebAppInit');

// Получить user_id текущего пользователя
const { id } = await bridge.send('VKWebAppGetUserInfo');
```

---

## 4. Интерактивная карта (такси)

```tsx
// src/pages/TaxiMap.tsx
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

// Загружаем точки из вашего API (которое читает taxi_points.json)
const points = await fetch('/api/taxi-points').then(r => r.json());

<MapContainer center={[55.75, 37.62]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {points.map(pt => (
    <Marker key={pt.id} position={[pt.lat, pt.lng]}>
      <Popup>{pt.name} — от {pt.defaultPrice}р.</Popup>
    </Marker>
  ))}
</MapContainer>
```

> Важно: точки в `taxi_points.json` хранят координаты `x, y` из редактора карты.  
> При переходе на Mini App заменить `x/y` на реальные `lat/lng` в `map-editor.html`  
> (добавить поля «Широта» и «Долгота» вместо или вместе с X/Y).

---

## 5. Автоматический расчёт стоимости

```typescript
// Обновить calculateTaxiPrice() в long-polling.cjs:
// Вместо евклидовой дистанции использовать Haversine formula

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Тариф: 45р/км базово, +30% в пиковые часы (18-22 МСК)
function calculateTaxiPrice(from, to) {
  if (from.lat && to.lat) {
    const km = haversine(from.lat, from.lng, to.lat, to.lng);
    const hour = new Date(...).getHours();
    const peak = (hour >= 18 && hour <= 22) ? 1.3 : 1.0;
    return Math.round(km * 45 * peak);
  }
  return from.defaultPrice || 500;
}
```

---

## 6. API-сервер (Express) для Mini App

Добавьте `scripts/api-server.cjs` — простой Express сервер, который:
- Отдаёт каталог, точки такси, статус заказа по orderId
- Принимает создание заказа (вызывает ту же логику что и бот)
- Авторизует пользователей через `vk_sign` (VK Launch Params)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.get('/api/catalogue', (req, res) => {
  res.json(readJSON(CATALOGUE_FILE));
});
app.get('/api/taxi-points', (req, res) => {
  res.json(readJSON(TAXI_POINTS_FILE));
});
app.post('/api/order', async (req, res) => {
  // Validate vk_sign, then create order
  const order = createDeliveryOrder(req.body);
  await sendOrderToDispatch(order);
  res.json({ ok: true, orderId: order.id });
});

app.listen(3001, () => console.log('[API] running on :3001'));
```

---

## 7. Что остаётся в боте (long-polling.cjs)

Следующие части лучше **оставить в боте** (не переносить в Mini App):
- Диспетчерская — приём заказов с inline-кнопками в чате
- Журнал активности (`!онлайн`, `!афк`, `!вышел`)
- Экран закупок курьера (редактирование сообщения)
- Ежедневные/еженедельные отчёты руководству
- Чат-команды (`!кик`, `!бан`, `!пост` и т.д.)

---

## 8. Деплой

```bash
# Vercel (рекомендуется)
vercel --prod

# PM2 для бота + API
pm2 start scripts/long-polling.cjs --name bot
pm2 start scripts/api-server.cjs --name api
pm2 save
```

Vercel автоматически обнаружит `package.json` и задеплоит Next.js / Vite frontend.  
Убедитесь что `scripts/long-polling.cjs` **не** является entry-point для Vercel  
(он запускается отдельно на VPS через PM2).
