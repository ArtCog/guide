# Библиотеки и ресурсы: моушен-графика и монтаж через агента

Всё ниже открыто и проверено 17.10.2026. Лицензии указаны, потому что ролики ты будешь продавать.
Как ставить скиллы: команды `npx skills add ...` запускаются в терминале в папке проекта;
команды `claude plugin ...` тоже в терминале; `/plugin ...` вводятся внутри Claude Code.

---

## 1. Официальный старт

| Что | Ссылка | Зачем |
|---|---|---|
| Remotion + агент: пошагово | remotion.dev/docs/ai/coding-agents | самый короткий путь от нуля до первого ролика |
| Плагин Remotion для Claude Code | remotion.dev/docs/ai/claude-code-plugin | `claude plugin marketplace add remotion-dev/claude-code-plugin`, затем `claude plugin install remotion@remotion`, в Claude Code `/remotion:remotion-create <идея>` |
| Скиллы Remotion | remotion.dev/docs/ai/skills | `npx skills add remotion-dev/skills`, главный вход `/remotion-best-practices` |
| Шаблоны Remotion | remotion.dev/templates | 20 бесплатных стартов, среди них субтитры по словам в стиле TikTok и аудиограмма |
| video-use | github.com/browser-use/video-use | монтаж живой съёмки по транскрипту; MIT; нужен ключ ElevenLabs |
| ChatMonteur | github.com/ArtCog/chatmonteur | монтаж говорящей головы по смыслу; MIT; распознавание локально и бесплатно |

Лайфхак: допиши `.md` к любой странице документации Remotion, получишь чистый текст. Его можно скормить агенту.

---

## 2. Промпты, которые можно скопировать

| Что | Ссылка | Что внутри |
|---|---|---|
| Remotion Prompt Showcase | remotion.dev/prompts | ролики сообщества, у каждого кнопка «Copy prompt»: запуск продукта, новостной заголовок, маршрут на карте, демо продукта |
| 24 промпта для моушена (Roo, 11.10.2026) | roo.beehiiv.com/p/claude-motion-graphics-prompts | кинетическая типографика, графики и цифры, логотип и плашки, запуск продукта, вертикальные рилсы, промпты-доработки. Сделаны под HyperFrames, часть подходит и для Remotion |
| Гайд по промптам HyperFrames | hyperframes.heygen.com/guides/prompting | как писать промпт по секундам («0-1 с: ...»), холодный и тёплый старт |

---

## 3. Готовые стили, которые перекрашиваются в свои цвета

| Что | Ссылка | Как пользоваться |
|---|---|---|
| awesome-design-md | github.com/VoltAgent/awesome-design-md | около 84 файлов DESIGN.md известных брендов (цвета, шрифты, отступы, компоненты). Кладёшь в корень проекта, меняешь палитру на свою, просишь агента следовать. MIT. Ещё больше на getdesign.md |
| Формат DESIGN.md | github.com/google-labs-code/design.md | спецификация формата от Google, если хочешь написать свой стиль с нуля. Apache-2.0 |
| claude-code-video-toolkit | github.com/digitalsamba/claude-code-video-toolkit | набор для Remotion: бренд в `brand.json` (цвета, шрифты), команды `/setup`, `/video`, 4 шаблона. MIT |

Важно: чужой стиль это отправная точка. Логотипы и названия брендов в свой ролик не тащи, бери логику: иерархию, ритм, отступы.

---

## 4. Библиотеки приёмов (скиллы, которые дают агенту насмотренность)

| Что | Ссылка | Что даёт | Установка | Лицензия |
|---|---|---|---|---|
| video-shotcraft | github.com/Vincentwei1021/video-shotcraft | больше 120 описанных приёмов камеры и движения с готовым кодом на Remotion и галереей превью. Ролики про продукт из твоих скриншотов | `npx skills add Vincentwei1021/video-shotcraft` | Apache-2.0 |
| product-launch-video (Every) | github.com/EveryInc/product-launch-video | скилл «сначала раскадровка, потом код» для запуска продукта на 15-30 с | клонировать, `npm install`, `/product-launch-video` | MIT |
| GSAP skills (официальные) | github.com/greensock/gsap-skills | анимация таймлайнов, текста по буквам (SplitText), путей. GSAP со всеми плагинами бесплатен для коммерции с 2025 | `npx skills add https://github.com/greensock/gsap-skills` | MIT |
| Motion design skill (LottieFiles) | github.com/lottiefiles/motion-design-skill | таблицы скоростей и кривых, «характеры» движения | `npx skills add LottieFiles/motion-design-skill` | MIT |
| Remocn | github.com/Remocn/remocn | готовые анимации, переходы и фоны для Remotion, копируешь кусок кода | remocn.dev | MIT |

---

## 5. Разобрать чужие сильные работы

| Что | Ссылка | Что внутри |
|---|---|---|
| hyperframes-launches | github.com/heygen-com/hyperframes-launches | около 20 настоящих роликов-запусков (Stripe, Figma, SpaceX, Claude и др.) как редактируемые проекты. Код под Apache-2.0, а логотипы, шрифты и медиа внутри не лицензированы: учись на структуре, бренды заменяй |
| Галерея video-shotcraft | vincentwei1021.github.io/video-shotcraft | превью приёмов: смотришь, называешь агенту нужный |

---

## 6. Бесплатные ассеты для коммерческих роликов

| Что | Ссылка | Условие |
|---|---|---|
| Google Fonts | fonts.google.com | в основном лицензия OFL: в роликах можно, продавать сам файл шрифта нельзя. Для русского текста ищи фильтр «Cyrillic» |
| Lucide | lucide.dev | иконки, ISC, свободно для коммерции |
| Simple Icons | simpleicons.org | логотипы брендов в SVG. Сам набор CC0, но логотипы остаются товарными знаками: следуй правилам бренда |
| Pixabay (музыка и звуки) | pixabay.com/music | коммерция без указания автора; возможна заявка Content ID на YouTube (это не страйк) |
| Freesound | freesound.org | у каждого звука своя лицензия: CC0 свободно, CC BY с указанием автора, CC BY-NC нельзя в монетизированных роликах |
| Фонотека YouTube | studio.youtube.com → Фонотека | безопасно на YouTube; бери треки, где указывать автора не требуется (есть фильтр) |

---

## Лицензии, которые надо знать до первого заказа

- **Remotion**: бесплатно частному лицу и командам до 3 человек, включая работу на заказ. Если сдаёшь заказчику
  только MP4, размер его компании не считается (FAQ Remotion). Команде от 4 человек: $25 в месяц за каждого,
  кто пишет код Remotion, в том числе руками агента.
- **HyperFrames**, **video-use**, **ChatMonteur**: открытые лицензии (Apache-2.0, MIT, MIT).
- **GSAP**: бесплатен для коммерции со всеми плагинами; нельзя только встраивать в конструкторы анимации, конкурирующие с Webflow.
