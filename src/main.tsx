import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Phaser 캔버스 텍스트가 폴백 폰트로 그려지지 않도록 미리 로드해 둔다
if (document.fonts?.load) {
  void document.fonts.load('20px Jua');
  void document.fonts.load('20px "Black Han Sans"');
  void document.fonts.load('20px "Gowun Dodum"');
}

createRoot(document.getElementById('root')!).render(<App />);

// 설치형 웹앱(PWA): 프로덕션에서만 서비스 워커 등록
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* 등록 실패해도 게임은 정상 동작 */
    });
  });
}
