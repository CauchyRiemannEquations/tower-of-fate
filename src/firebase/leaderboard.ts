import { firebaseConfig, isFirebaseConfigured } from './config';

/**
 * Firestore 랭킹 서비스.
 * - Firestore의 `scores` 컬렉션을 사용한다 (첫 등록 시 자동 생성).
 * - Firebase SDK는 동적 import라 설정 전에는 번들에 로드되지 않는다.
 */

export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
  floor: number;
  maxRisk: number;
}

export const NICKNAME_MAX = 12;
export const LEADERBOARD_LIMIT = 10;

const CACHE_KEY = 'tower-of-fate:leaderboard:v1';
const CACHE_TTL_MS = 10 * 60 * 1000;

interface ScoreCache {
  savedAt: number;
  entries: ScoreEntry[];
}

let memoryCache: ScoreCache | null = null;

let dbPromise: Promise<import('firebase/firestore').Firestore> | null = null;

async function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore } = await import('firebase/firestore');
      const app = getApps()[0] ?? initializeApp(firebaseConfig);
      return getFirestore(app);
    })();
  }
  return dbPromise;
}

function readCache(): ScoreCache | null {
  if (memoryCache && Date.now() - memoryCache.savedAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as ScoreCache | null;
    if (
      parsed &&
      typeof parsed.savedAt === 'number' &&
      Array.isArray(parsed.entries) &&
      Date.now() - parsed.savedAt < CACHE_TTL_MS
    ) {
      memoryCache = parsed;
      return parsed;
    }
  } catch {
    /* 캐시를 못 읽으면 Firestore에서 새로 가져온다. */
  }
  return null;
}

function writeCache(entries: ScoreEntry[]) {
  memoryCache = { savedAt: Date.now(), entries };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    /* 저장 공간이 막혀 있어도 랭킹 조회는 계속 동작한다. */
  }
}

/** 상위 점수 목록 (점수 내림차순). 10분 캐시로 반복 읽기를 줄인다. */
export async function fetchTopScores(
  max = LEADERBOARD_LIMIT,
  forceRefresh = false,
): Promise<ScoreEntry[]> {
  if (!isFirebaseConfigured()) throw new Error('firebase-not-configured');
  if (!forceRefresh) {
    const cached = readCache();
    if (cached) return cached.entries.slice(0, max);
  }
  const db = await getDb();
  const { collection, getDocs, limit, orderBy, query } = await import(
    'firebase/firestore'
  );
  const snap = await getDocs(
    query(collection(db, 'scores'), orderBy('score', 'desc'), limit(max)),
  );
  const entries = snap.docs.map((d) => {
    const data = d.data() as Omit<ScoreEntry, 'id'>;
    return {
      id: d.id,
      name: String(data.name ?? '???'),
      score: Number(data.score ?? 0),
      floor: Number(data.floor ?? 0),
      maxRisk: Number(data.maxRisk ?? 0),
    };
  });
  writeCache(entries);
  return entries;
}

/** 점수 등록 */
export async function submitScore(
  name: string,
  score: number,
  floor: number,
  maxRisk: number,
): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('firebase-not-configured');
  const trimmed = name.trim().slice(0, NICKNAME_MAX);
  if (!trimmed) throw new Error('empty-name');
  const db = await getDb();
  const { addDoc, collection, serverTimestamp } = await import(
    'firebase/firestore'
  );
  await addDoc(collection(db, 'scores'), {
    name: trimmed,
    score: Math.round(score),
    floor: Math.round(floor),
    maxRisk: Math.round(maxRisk),
    createdAt: serverTimestamp(),
  });
}
