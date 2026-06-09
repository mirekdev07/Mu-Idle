# MU Idle Adventure

Idle / clicker RPG inspirowany **MU Online** — postacie, ekwipunek, bossy, eventy, ranking, system offline rewards. Aplikacja webowa (Next.js) z buildem mobilnym na Android przez Capacitor.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119eff?logo=capacitor)

---

## Co potrafi gra

| System | Opis |
| --- | --- |
| **Klasy postaci** | Dark Knight, Dark Wizard, Elf, Magic Gladiator i inne — każda z osobnym drzewkiem statystyk |
| **Hunting Zone** | Pasywne zdobywanie EXP, item dropy, polowanie w tle |
| **Helpers** | System pomocników: Attacker + Buffer wspierają polowanie |
| **Boss Zone** | Walki z bossami o lepszy loot |
| **Endless Tower** | Tryb piętrowy — coraz trudniejsi przeciwnicy |
| **Chaos Machine** | Tworzenie i ulepszanie itemów (Jewele, Wings, Excellent items) |
| **Crafting** | Rzemiosło z materiałów (Blood Bone, Devil's Eye, Feather...) |
| **Achievements** | System osiągnięć z nagrodami |
| **Quests** | Dynamiczne questy |
| **Events** | Blood Castle, Devil Square i inne czasowe eventy |
| **Ranking** | Globalna tablica wyników |
| **Vault** | Współdzielony magazyn między postaciami |
| **Wiki** | Wbudowana baza wiedzy o grze |
| **Offline Rewards** | 20% normalnej produkcji w czasie nieobecności, max 8h, system "heartbeat" zapobiega podwójnemu liczeniu |

---

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Prisma** ORM + **PostgreSQL** (Neon serverless)
- **NextAuth.js** + Prisma adapter (autoryzacja)
- **Tailwind CSS** + komponenty UI
- **@dnd-kit** (drag & drop ekwipunku)
- **Capacitor 8** (build mobilny Android)

---

## Quick start

```bash
git clone https://github.com/<user>/mu-idle-nextjs.git
cd mu-idle-nextjs
npm install

cp .env.example .env
# Wypełnij DATABASE_URL i NEXTAUTH_SECRET

npx prisma db push
npm run db:seed

npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000).

---

## Skrypty

| Komenda | Opis |
| --- | --- |
| `npm run dev` | Start Next.js w trybie dev |
| `npm run build` | Build produkcyjny (`prisma generate` + `next build`) |
| `npm run start` | Uruchomienie zbudowanej wersji |
| `npm run lint` | ESLint |
| `npm run db:push` | Synchronizacja schematu Prisma z bazą |
| `npm run db:seed` | Inicjalne dane (`prisma/seed.ts`) |
| `npm run db:migrate` | Migracje Prisma |
| `npm run db:studio` | Prisma Studio (GUI bazy) |

---

## Build mobilny (Android APK)

```bash
npm run build
npx cap sync android
npx cap open android   # otwiera Android Studio
```

Capacitor konfigurowany w `capacitor.config.ts`. App ID: `com.muidle.adventure`.

`*.apk`, `*.aab`, `*.jks` są w `.gitignore` — keystore podpisujący release nigdy nie idzie do repo.

---

## Struktura projektu

```
src/
├── app/                # Routy Next.js (App Router)
│   ├── api/            # Endpointy (boss, characters, events, crafting, ranking...)
│   ├── boss-zone/      # Walka z bossami
│   ├── chaos-machine/  # Crafting / upgrade itemów
│   ├── characters/     # Lista i wybór postaci
│   ├── events/         # Eventy czasowe
│   ├── ranking/        # Tablica wyników
│   ├── vault/          # Magazyn
│   └── wiki/           # Encyklopedia gry
├── components/         # React komponenty (GameLoop, InventorySlot, ItemModal...)
├── lib/
│   ├── game/           # Logika gry (formulas, bosses, achievements, quests, endless-tower)
│   └── services/       # Warstwa serwisów (character, item, stats)
├── store/              # Stan klienta
└── types/              # Typy TypeScript

prisma/
├── schema.prisma       # Schemat bazy (Users, Characters, Items, Inventory, ...)
└── seed.ts             # Seed danych
```

---

## Deploy

Production: **Vercel** + Neon PostgreSQL.

```bash
vercel --prod
```

Pamiętaj o ustawieniu zmiennych środowiskowych w panelu Vercel.

---

## Licencja

Projekt prywatny / portfolio. MU Online jest znakiem towarowym Webzen Inc. — projekt nie jest powiązany z oryginalnym wydawcą.
