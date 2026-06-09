# MU Idle Adventure

Idle / clicker RPG inspired by **MU Online** — characters, equipment, bosses, events, ranking, and an offline rewards system. Web app built with Next.js, with an Android mobile build via Capacitor.

**Live:** https://mu-idle-nextjs.vercel.app

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?logo=postgresql)
![Capacitor](https://img.shields.io/badge/Capacitor-Android-119eff?logo=capacitor)

---

## Game features

| System | Description |
| --- | --- |
| **Character classes** | Dark Knight, Dark Wizard, Elf, Magic Gladiator and more — each with its own stat tree |
| **Hunting Zone** | Passive EXP gain, item drops, background hunting |
| **Helpers** | Companion system: Attacker + Buffer support your hunting |
| **Boss Zone** | Boss fights with better loot |
| **Endless Tower** | Floor-based mode — progressively harder enemies |
| **Chaos Machine** | Create and upgrade items (Jewels, Wings, Excellent items) |
| **Crafting** | Crafting from materials (Blood Bone, Devil's Eye, Feather...) |
| **Achievements** | Achievement system with rewards |
| **Quests** | Dynamic quests |
| **Events** | Blood Castle, Devil Square and other timed events |
| **Ranking** | Global leaderboard |
| **Vault** | Shared storage across characters |
| **Wiki** | Built-in game knowledge base |
| **Offline Rewards** | 20% of normal production while away, 8h max, heartbeat system prevents double-counting |

---

## Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Prisma** ORM + **PostgreSQL** (Neon serverless)
- **NextAuth.js** + Prisma adapter (authentication)
- **Tailwind CSS** + UI components
- **@dnd-kit** (inventory drag & drop)
- **Capacitor 8** (Android mobile build)

---

## Quick start

```bash
git clone https://github.com/mirekdev07/Mu-Idle.git
cd Mu-Idle
npm install

cp .env.example .env
# Fill in DATABASE_URL and NEXTAUTH_SECRET

npx prisma db push
npm run db:seed

npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Next.js in dev mode |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Run the built version |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync Prisma schema with database |
| `npm run db:seed` | Initial data (`prisma/seed.ts`) |
| `npm run db:migrate` | Prisma migrations |
| `npm run db:studio` | Prisma Studio (database GUI) |

---

## Mobile build (Android APK)

```bash
npm run build
npx cap sync android
npx cap open android   # opens Android Studio
```

Capacitor configured in `capacitor.config.ts`. App ID: `com.muidle.adventure`.

`*.apk`, `*.aab`, `*.jks` are in `.gitignore` — the release-signing keystore never goes into the repo.

---

## Project structure

```
src/
├── app/                # Next.js routes (App Router)
│   ├── api/            # Endpoints (boss, characters, events, crafting, ranking...)
│   ├── boss-zone/      # Boss fight page
│   ├── chaos-machine/  # Item crafting / upgrades
│   ├── characters/     # Character list and selection
│   ├── events/         # Timed events
│   ├── ranking/        # Leaderboard
│   ├── vault/          # Storage
│   └── wiki/           # Game encyclopedia
├── components/         # React components (GameLoop, InventorySlot, ItemModal...)
├── lib/
│   ├── game/           # Game logic (formulas, bosses, achievements, quests, endless-tower)
│   └── services/       # Service layer (character, item, stats)
├── store/              # Client state
└── types/              # TypeScript types

prisma/
├── schema.prisma       # Database schema (Users, Characters, Items, Inventory, ...)
└── seed.ts             # Seed data
```

---

## Deploy

Production: **Vercel** + Neon PostgreSQL.

```bash
vercel --prod
```

Remember to configure environment variables in the Vercel dashboard.

---

## License

**MIT** — see [LICENSE](./LICENSE). Free to use, modify, and distribute, including commercially.

> "MU Online" is a trademark of Webzen Inc. This project is fan-made and not affiliated with the original publisher.
