# Kedi Games 🐾

친구들과 하는 고양이 미니게임 모음. 링크를 열고, 고양이를 고르고, 게임을 선택하면 끝!

**게임**
- **Kedi Life** 🎲 — 2~4인 보드 레이스. 맵 3종(공원/골목길/놀이터)에서 주사위를 굴려 갈림길(🪧)을 고르고, 간식을 가장 많이 모아 집에 도착하면 우승. 혼자면 봇이 참가해요.
- **Paw Paw Paw!** 🐾 — 1대1 순발력 대결. 3·2·1 카운트 후 좌/중/우를 동시에 선택. 방향이 겹치면 발바닥 쪽 득점, 3점 선취 승. 혼자면 봇과 대결.
- **Kedi Running** 🏃 — 2~4인 달리기. 좌/우를 번갈아 빠르게 연타(PC는 방향키)! 📣 응원, 🍪 간식 유혹, 💧 물 뿌리기, 그리고 갑자기 내리는 비 🌧️까지.

**방(Room)**: 접속하면 4자리 방 번호를 입력해 입장해요. 방마다 게임·접속자·기록이 완전히 분리돼요. 기본 방 번호는 `0101 / 0514 / 3003 / 7300 / 5511` (환경변수 `ROOM_CODES`로 변경 가능).

**관리자**: 첫 화면 ⚙️ 버튼 → 관리자 키 입력 시 모든 방의 실시간 접속 현황과 방별 기록을 볼 수 있어요. 키는 환경변수 `ADMIN_KEY`로 설정. `/log?key=관리자키` 주소로도 열람 가능.

---

## English

Cozy cat mini-games to play with friends. Open the link, pick your Kedi, choose a game — that's it!

**Games**
- **Kedi Life** 🎲 — A board race for 2–4 players. Roll the dice, choose your path at signposts (🪧), collect the most snacks, and get home. A bot Kedi joins if you play alone.
- **Paw Paw Paw!** 🐾 — A 1 vs 1 reflex duel. On "3·2·1, Paw!" both players pick left / center / right at the same time. Matching directions scores a point for the paw — first to 3 wins. Playing solo? You duel a bot.
- **Kedi Running** 🏃 — A sprint race for 2–4. Tap left·right fast (arrow keys on PC), cheer yourself, tempt rivals with snacks, splash water — and take cover when it rains!

**Rooms**: on open, enter a 4-digit room code. Each room is fully isolated (games, players, logs). Default codes: `0101 / 0514 / 3003 / 7300 / 5511` (override with the `ROOM_CODES` env var).

**Admin**: the ⚙️ button on the first screen opens an admin panel (needs the `ADMIN_KEY` env var) showing every room's live players and per-room log. Also available at `/log?key=YOUR_ADMIN_KEY`.

---

## Run locally · 로컬 실행 (optional)
```
npm install
npm start
```
Then open · 접속: http://localhost:3000

## Deploy · 배포 (Render)
- Build Command: `npm install` · Start Command: `npm start`
- The free plan sleeps after 15 minutes of inactivity and wakes in 30–60s on the next visit.
- 무료 플랜은 15분간 접속이 없으면 잠들고, 다음 접속 시 30~60초 후 깨어나요.
