export const firebaseConfig = {
  apiKey: "AIzaSyBvTBuX_pBCCbvIHbPYgn9mzLPQWDaluY0",
  authDomain: "toweroffate.firebaseapp.com",
  projectId: "toweroffate",
  storageBucket: "toweroffate.firebasestorage.app",
  messagingSenderId: "145262737875",
  appId: "1:145262737875:web:e4e3dcadda9334ecf3d726",
  measurementId: "G-FRKFMJMVZE"
};

/** 설정이 채워졌는지 — 랭킹 UI가 이 값으로 활성/안내 상태를 결정한다 */
export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}
