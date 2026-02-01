# System Offline Rewards - Pełna Instrukcja

## Przegląd systemu

System offline rewards pozwala graczom zarabiać pieniądze nawet gdy nie grają. Gracz wraca do gry i widzi modal z informacją ile zarobił podczas nieobecności.

**Kluczowe cechy:**
- Zarobki offline = 20% normalnej produkcji
- Maksymalny czas offline = 8 godzin (28800 sekund)
- Minimalna nieobecność = 60 sekund
- System "heartbeat" zapobiega podwójnemu liczeniu

---

## Architektura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GameLoop.tsx  │────▶│  saveGame()      │────▶│   Baza danych   │
│   (co 15 sek)   │     │  (Server Action) │     │   (PostgreSQL)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                │
         │ zapisuje:                                      │
         │ - money, buildings                             │
         │ - lastProductionPerSecond ◄────────────────────│
         │ - lastHeartbeat                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  beforeunload   │────▶│  /api/save       │────▶│ lastPlayedAt    │
│  (zamknięcie)   │     │  (keepalive)     │     │ (BEZ heartbeat) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Dashboard.tsx  │◀────│  getGameState()  │◀────│ Oblicz offline  │
│  (przy starcie) │     │  (Server Action) │     │ earnings        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 1. Schemat bazy danych (Prisma)

```prisma
model GameSave {
  id                      String   @id @default(cuid())
  userId                  String

  // Stan gry
  money                   Float    @default(100)
  totalEarnings           Float    @default(0)
  buildings               Json     @default("{}")

  // KLUCZOWE dla offline rewards:
  lastProductionPerSecond Float    @default(0)    // Snapshot produkcji $/s
  lastPlayedAt            DateTime @default(now()) // Aktualizowane ZAWSZE przy zapisie
  lastHeartbeat           DateTime @default(now()) // Aktualizowane TYLKO podczas aktywnej gry

  user                    User     @relation(fields: [userId], references: [id])
}
```

### Różnica między lastPlayedAt a lastHeartbeat

| Pole | Kiedy aktualizowane | Cel |
|------|---------------------|-----|
| `lastPlayedAt` | Każdy zapis (także beforeunload) | Informacja kiedy ostatnio zapisano |
| `lastHeartbeat` | Tylko podczas aktywnej gry (GameLoop) | Obliczanie offline earnings |

**Dlaczego dwa pola?**
Gdy gracz zamyka stronę, `beforeunload` zapisuje stan. Gdybyśmy używali tylko `lastPlayedAt`, czas offline byłby ~0 sekund. `lastHeartbeat` jest aktualizowany tylko co 15 sekund podczas gry, więc zawsze mamy prawidłowy czas nieobecności.

---

## 2. GameLoop - zapisywanie stanu podczas gry

```typescript
// src/components/GameLoop.tsx

const SAVE_INTERVAL = 15000; // Co 15 sekund

export function GameLoop() {
  const lastSaveRef = useRef<number>(Date.now());
  const tick = useGameStore((state) => state.tick);

  useEffect(() => {
    let animationFrameId: number;

    const gameLoop = (currentTime: number) => {
      // Update game state
      tick(deltaTime);

      // Auto-save co 15 sekund
      if (Date.now() - lastSaveRef.current > SAVE_INTERVAL) {
        const state = useGameStore.getState();

        saveGame(
          state.money,
          state.followers,
          state.totalEarnings,
          // ... inne pola ...
          state.buildings,
          state.moneyPerSecond  // ◄── KLUCZOWE: snapshot produkcji
        );

        lastSaveRef.current = Date.now();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    // Zapis przy zamknięciu strony (keepalive)
    const handleBeforeUnload = () => {
      const payload = getSavePayload();

      fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,  // ◄── WAŻNE: request kończy się nawet po zamknięciu strony
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [tick]);

  return null;
}
```

---

## 3. Server Action - saveGame()

```typescript
// src/actions/gameActions.ts

export async function saveGame(
  money: number,
  followers: number,
  totalEarnings: number,
  // ... inne pola ...
  buildings?: Record<string, number>,
  lastProductionPerSecond?: number  // Snapshot produkcji
): Promise<{ success: boolean }> {

  const user = await getUser();
  if (!user?.currentSaveId) return { success: false };

  await prisma.gameSave.update({
    where: { id: user.currentSaveId },
    data: {
      money,
      followers,
      totalEarnings,
      buildings,

      // Snapshot produkcji dla offline earnings
      ...(lastProductionPerSecond !== undefined
        ? { lastProductionPerSecond }
        : {}),

      // KLUCZOWE: Heartbeat aktualizowany TYLKO podczas aktywnej gry
      lastHeartbeat: new Date(),
    },
  });

  return { success: true };
}
```

---

## 4. API Route - /api/save (beforeunload)

```typescript
// src/app/api/save/route.ts

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user?.currentSaveId) return NextResponse.json({ error: "No save" }, { status: 400 });

  const body = await request.json();

  await prisma.gameSave.update({
    where: { id: user.currentSaveId },
    data: {
      money: body.money,
      followers: body.followers,
      buildings: body.buildings,
      lastProductionPerSecond: body.lastProductionPerSecond,

      // Aktualizuj lastPlayedAt
      lastPlayedAt: new Date(),

      // NIE aktualizuj lastHeartbeat!
      // To pozwala na prawidłowe obliczenie czasu offline
    },
  });

  return NextResponse.json({ success: true });
}
```

---

## 5. Obliczanie offline earnings - getGameState()

```typescript
// src/actions/gameActions.ts

export async function getGameState(): Promise<GameState | null> {
  // Wyłącz cache - zawsze świeże dane
  noStore();

  const user = await getUser();
  if (!user?.currentSaveId) return null;

  const save = await prisma.gameSave.findUnique({
    where: { id: user.currentSaveId },
  });

  // Oblicz czas od ostatniego heartbeat (NIE lastPlayedAt!)
  const now = new Date();
  const lastHeartbeat = new Date(save.lastHeartbeat);
  const secondsElapsed = Math.floor(
    Math.abs(now.getTime() - lastHeartbeat.getTime()) / 1000
  );

  // Pobierz zapisaną produkcję
  const productionRate = Number(save.lastProductionPerSecond) || 0;

  let currentMoney = Number(save.money);
  let offlineEarningsAmount = 0;
  let offlineSecondsAmount = 0;

  // Oblicz offline earnings jeśli:
  // - Minęło więcej niż 60 sekund
  // - Produkcja > 0
  if (secondsElapsed > 60 && productionRate > 0) {
    // Max 8 godzin (28800 sekund)
    offlineSecondsAmount = Math.min(secondsElapsed, 28800);

    // 20% normalnej produkcji
    offlineEarningsAmount = Math.floor(
      productionRate * offlineSecondsAmount * 0.20
    );

    if (offlineEarningsAmount > 0) {
      // Zapisz do bazy i zresetuj heartbeat
      await prisma.gameSave.update({
        where: { id: save.id },
        data: {
          money: { increment: offlineEarningsAmount },
          totalEarnings: { increment: offlineEarningsAmount },
          lastHeartbeat: now,  // Reset heartbeat żeby nie liczyć podwójnie
        },
      });

      currentMoney += offlineEarningsAmount;
    }
  }

  return {
    // ... wszystkie pola stanu gry ...
    money: currentMoney,

    // Offline earnings info (dla modalu)
    offlineEarnings: offlineEarningsAmount,
    offlineSeconds: offlineSecondsAmount,
  };
}
```

---

## 6. Dashboard - wyświetlanie modalu

```typescript
// src/components/Dashboard.tsx

// Komponent modalu
function OfflineEarningsModal({
  earnings,
  seconds,
  onClose,
}: {
  earnings: number;
  seconds: number;
  onClose: () => void;
}) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  let timeText = "";
  if (hours > 0) {
    timeText = `${hours}h ${minutes}min`;
  } else if (minutes > 0) {
    timeText = `${minutes} min`;
  } else {
    timeText = `${seconds} sek`;
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 max-w-sm">
        <div className="text-center">
          <div className="text-5xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-white mb-2">
            Zarobki offline!
          </h2>
          <p className="text-slate-400 mb-4">
            Podczas {timeText} nieobecności zarobiłeś:
          </p>
          <p className="text-3xl font-bold text-green-400 mb-6">
            +${formatMoney(earnings)}
          </p>
          <p className="text-xs text-slate-500 mb-4">
            (20% normalnej produkcji, max 8h)
          </p>
          <button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
          >
            Super!
          </button>
        </div>
      </div>
    </div>
  );
}

// Główny komponent
export function Dashboard({ initialState }: { initialState: GameState }) {
  const [offlineEarnings, setOfflineEarnings] = useState<{
    earnings: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    // Pokaż modal jeśli są offline earnings
    if (initialState.offlineEarnings > 0) {
      setOfflineEarnings({
        earnings: initialState.offlineEarnings,
        seconds: initialState.offlineSeconds,
      });
    }
  }, []);

  return (
    <>
      {/* Gra */}
      <GameLoop />

      {/* Modal offline earnings */}
      {offlineEarnings && (
        <OfflineEarningsModal
          earnings={offlineEarnings.earnings}
          seconds={offlineEarnings.seconds}
          onClose={() => setOfflineEarnings(null)}
        />
      )}
    </>
  );
}
```

---

## 7. Konfiguracja Next.js - wyłączenie cache

```typescript
// src/app/dashboard/page.tsx

import { unstable_noStore as noStore } from "next/cache";

// Wymuś dynamiczne renderowanie
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  noStore();  // Wyłącz cache dla tego komponentu

  const gameState = await getGameState();

  return <Dashboard initialState={gameState} />;
}
```

---

## Podsumowanie - co potrzebujesz

### Baza danych
1. `lastProductionPerSecond` - snapshot produkcji $/s
2. `lastHeartbeat` - timestamp ostatniej aktywnej gry
3. `lastPlayedAt` - timestamp ostatniego zapisu (opcjonalne)

### Frontend
1. **GameLoop** - co 15 sekund zapisuje stan + `lastProductionPerSecond` + `lastHeartbeat`
2. **beforeunload** - zapisuje stan przy zamknięciu (BEZ heartbeat)
3. **Dashboard** - pokazuje modal z offline earnings

### Backend
1. **saveGame()** - Server Action aktualizująca heartbeat
2. **/api/save** - API Route dla keepalive (BEZ heartbeat)
3. **getGameState()** - oblicza offline earnings przy ładowaniu

### Wzór obliczania
```
offlineEarnings = lastProductionPerSecond × min(sekundy, 28800) × 0.20
```

---

## Możliwe rozszerzenia

1. **Premium bonus** - 50% zamiast 20% dla premium graczy
2. **Reklamy** - obejrzyj reklamę aby podwoić offline earnings
3. **Powiadomienia push** - "Twoje offline earnings są pełne!"
4. **Różne mnożniki** - różne stawki dla różnych zasobów
