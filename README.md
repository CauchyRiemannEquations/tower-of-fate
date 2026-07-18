# 🗼 운명의 탑 (Tower of Fate)

모바일 세로형 **확률 전략 캐주얼 로그라이크**. 매 턴 제시되는 세 개의 마법 유물 블록 중
하나를 골라 밤하늘 위 부유섬에 탑을 쌓는다. 블록을 놓을 때마다 붕괴 판정이 실행되고,
무너지면 금고에 저장하지 않은 점수를 모두 잃는다. **"한 층만 더 쌓을까, 지금 탈출할까?"**

## 실행 방법

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 미리보기
npm test         # Vitest 단위 테스트 (덱/위험/계약/분석)
```

`http://localhost:5173/?debug` 로 접속하면 판정 난수·유효 확률·무게중심을 보여주는
디버그 패널이 켜진다.

## 조작

| 동작 | 모바일 | PC |
|---|---|---|
| 블록 선택 | 카드 터치 | 카드 클릭 |
| 나가기 | 우상단 나가기 버튼 | 동일 |
| 위치 조절 | 화면 좌우 드래그 | 마우스 드래그 |
| 미세 이동 | 화면 좌/우 영역 짧은 탭 | 좌/우 영역 클릭 |
| 낙하 | ⬇ 버튼 또는 아래로 스와이프 | ⬇ 버튼 |
| 점수 확정(탈출) | 🔒 버튼 | 🔒 버튼 |

## 게임 시스템

- **블록 5종** — 나무판(넓고 안전) · 돌 블록(무거움) · 유리 왕관(고득점·깨지기 쉬움) ·
  거대 금괴(최고 득점·최고 위험) · 기초석(탑 안정화)
- **운명 덱 (내부 시스템)** — 한 판은 33장의 블록 카드 덱(나무 10 · 돌 8 · 유리 6 ·
  금괴 4 · 기초석 5)으로 진행. 매 턴 3장을 뽑고, 배치한 카드는 탑이 되어 소멸,
  나머지는 버림 더미로. 덱 소진 시 리셔플. 화면에는 노출하지 않고 예언 효과
  보유 시에만 "다음 카드" 칩이 나타난다
- **체크포인트 (5층마다, 2단계 선택)** — 자동 저장(20→30→40%) 후 게임이 잠시 멈추고
  두 가지를 연이어 고른다. ① **유지 효과**: 길 2개 + 유물 1개 중 택1 (안정 · 탐욕 ·
  유리 장인 · 균형 설계자 · 예언자의 길), ② **예언 계약**: 3번의 배치 동안 도전할
  과제 택1 (균형·탐욕·세 재료·정밀공학자·대칭 중 3개 제시). 둘 다 건너뛸 수 있고,
  계약은 실패해도 처벌 없음
- **유물 (최대 2개)** — 운명의 보험증서(붕괴 시 절반 보존) · 균형의 저울 · 도박사의 주사위 ·
  기하학자의 눈 · 예언자의 렌즈 · 깨진 모래시계(리롤) · 장인의 쐐기 · 황금 계약서(확정 +15%)
- **붕괴 위험 0~100%** — 중심 치우침, 접촉 면적, 탑 무게중심, 높이, 무게, 재질 조합,
  기초석 보너스를 실시간 반영. 위험 요인은 UI에 칩으로 표시.
  **표시 확률과 판정 확률은 항상 동일** (초반 완충도 "초반의 가호" 요인으로 노출)
- **운명의 표식** — 매 턴 탑 좌우에 황금 표식이 번갈아 나타난다. 가운데는 가장 안전하지만,
  표식을 맞혀야 PERFECT와 연속 콤보를 얻어 최고 점수를 노릴 수 있다.
- **공정성 장치** — 초반 3층 가호, 저위험 억울사 1회 보호(아슬아슬 연출)
- **점수** — 금고(확정) vs 탑 위(미확정). 고위험 생존 보너스(30%+ ×1.6 / 50%+ ×2.4 /
  70%+ ×4), 운명의 표식 PERFECT 콤보, 길·유물·계약 보너스가 명확한 순서로 합산
- **운명 분석서** — 게임 종료 화면에서 펼쳐보는 사후 분석: 연속 생존 확률(각 턴 생존
  확률의 곱), 위험 구간별 기록(이번 판/누적), 최고 위험 생존, 마지막 결정의 단순 기대값
- **연출** — PERFECT 슬로모션, LUCKY 금빛 파티클, 재질별 착지 효과음(Web Audio 생성),
  탑 흔들림·기울기, 유리 파편·금괴 회전이 있는 붕괴 애니메이션, 패럴랙스 밤하늘
- **저장** — 최고 기록·튜토리얼·사운드·누적 위험 통계를 localStorage에 보존

## 구조

```
src/
├── game/
│   ├── scenes/TowerScene.ts   # Phaser 씬: 조준·낙하·연출·붕괴
│   ├── objects/textures.ts    # 프로시저럴 텍스처(블록 표정, 하늘, 섬)
│   ├── effects/particles.ts   # 재사용 파티클 이미터
│   ├── systems/               # 순수 로직 (전부 UI와 분리, 단위 테스트 대상)
│   │   ├── risk.ts            #   붕괴 위험 (수정자 파이프라인, 표시=판정)
│   │   ├── rng.ts             #   판정 (RNG 주입 가능)
│   │   ├── scoring.ts         #   점수·체크포인트 비율
│   │   ├── deck.ts            #   운명 덱 (셔플·드로우·버림·리셔플)
│   │   ├── contracts.ts       #   예언 계약 5종 정의·진행 판정
│   │   ├── checkpoints.ts     #   길 5종·유물 8종 정의·선택지 생성
│   │   ├── modifiers.ts       #   길/유물/계약 효과 → 위험·점수 수정자
│   │   ├── analytics.ts       #   운명 분석서 계산·누적 통계 저장
│   │   ├── tower.ts           #   탑 모델
│   │   └── __tests__/         #   Vitest 33개 테스트
│   ├── config/                # blocks.ts, balance.ts — 밸런스 수치 전부 여기
│   └── state/                 # store(React↔Phaser 공유) + actions(게임 진행)
├── components/                # HUD, 카드, 덱 패널, 계약/체크포인트 모달, 분석서 등
├── hooks/useGameStore.ts
├── utils/sound.ts             # Web Audio 생성형 효과음
└── types/
```

## 반응형 화면

디자인 높이는 854로 고정하고, 폭은 기기 화면 비율에 맞춰 게임 시작 시
[balance.ts](src/game/config/balance.ts)의 `configureDesign()`이 계산한다(400~1100).
덕분에 폰·태블릿·데스크톱 어디서든 밤하늘 배경이 화면을 꽉 채우고,
첫 블록을 받치는 석재 바닥도 화면 전체 폭으로 이어진다.

## 온라인 랭킹 (Firebase) 설정

랭킹 UI는 이미 들어 있고, Firebase 설정만 넣으면 즉시 활성화된다.
설정 전에는 랭킹 화면에 안내 문구만 표시되고 게임은 정상 동작한다.

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성
2. **빌드 → Firestore Database → 데이터베이스 만들기** (프로덕션 모드 권장)
3. 프로젝트 설정(톱니바퀴) → 일반 → **내 앱**에서 웹 앱(`</>`) 추가
4. 프로젝트 루트의 `.env.example`을 복사해 `.env.local` 파일을 만들기
5. "SDK 설정 및 구성"에서 **[구성]** 을 선택한 뒤 표시되는 값을 `.env.local`의
   각 항목에 넣기 (`VITE_FIREBASE_API_KEY=표시된 apiKey` 형식)
6. 개발 서버가 실행 중이었다면 껐다가 `npm run dev`로 다시 시작하기
7. Firestore **규칙** 탭에 아래 예시를 붙여넣어 쓰기 검증을 걸어두기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{doc} {
      allow get: if true;
      allow list: if request.query.limit != null && request.query.limit <= 10;
      allow create: if
        request.resource.data.keys().hasOnly(['name','score','floor','maxRisk','createdAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() >= 1
        && request.resource.data.name.size() <= 12
        && request.resource.data.score is int
        && request.resource.data.score >= 0
        && request.resource.data.score < 1000000
        && request.resource.data.floor is int
        && request.resource.data.floor >= 0
        && request.resource.data.floor < 1000
        && request.resource.data.maxRisk is int
        && request.resource.data.maxRisk >= 0
        && request.resource.data.maxRisk <= 100
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }
  }
}
```

- 데이터는 `scores` 컬렉션에 저장된다 (첫 등록 시 자동 생성):
  `{ name, score, floor, maxRisk, createdAt }`
- 조회는 점수 내림차순 상위 10개이며, 같은 브라우저에서는 10분 동안 캐시해
  랭킹 화면을 반복해서 열어도 추가 읽기가 발생하지 않는다. 점수 등록 화면은 등록 전
  랭킹을 읽지 않고, 등록이 끝난 뒤에만 최신 목록을 한 번 가져온다.
- Firebase 콘솔의 **Firestore → 사용량**에서 실제 읽기/쓰기 추이를 확인할 수 있다.
- Firebase SDK는 동적 import라 설정 전에는 로드조차 되지 않는다.

기술 스택: Vite · React 18 · TypeScript · Phaser 3 · Web Audio API · Firebase(선택)
