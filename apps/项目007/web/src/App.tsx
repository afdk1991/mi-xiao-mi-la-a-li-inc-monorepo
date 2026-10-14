import { useEffect, useState } from 'react';
import Home from './pages/Home';
import SeriesPage from './pages/Series';
import Watch from './pages/Watch';
import { ExternalIndex, ExternalList, ExtWatch } from './pages/External';

function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

/** 解码路由分段，畸形 % 编码时回退原串而非抛出（否则会白屏整个应用）。 */
function safeDecode(seg: string): string {
  try {
    return decodeURIComponent(seg);
  } catch {
    return seg;
  }
}

export default function App() {
  const hash = useHash();
  const go = (h: string) => { window.location.hash = h; };

  useEffect(() => { window.scrollTo(0, 0); }, [hash]);

  const path = hash.replace(/^#/, '') || '/';
  const seg = path.split('/').filter(Boolean);

  let body: JSX.Element;
  if (seg.length === 0) body = <Home go={go} />;
  else if (seg[0] === 'series' && seg[1]) body = <SeriesPage id={safeDecode(seg[1])} go={go} />;
  else if (seg[0] === 'watch' && seg[1]) body = <Watch epId={safeDecode(seg[1])} go={go} />;
  else if (seg[0] === 'external' && seg[1]) body = <ExternalList cat={safeDecode(seg[1])} go={go} />;
  else if (seg[0] === 'external') body = <ExternalIndex go={go} />;
  else if (seg[0] === 'ext' && seg[1] && seg[2])
    body = <ExtWatch cat={safeDecode(seg[1])} id={safeDecode(seg[2])} go={go} />;
  else body = <Home go={go} />;

  return (
    <>
      <header className="top">
        <div className="brand" onClick={() => go('#/')} style={{ cursor: 'pointer' }}>
          漫剧 Manju<span>在线观影</span>
        </div>
        <nav>
          <a href="#/">首页</a>
          <a href="#/external">外部片单</a>
        </nav>
      </header>
      <div className="wrap">{body}</div>
    </>
  );
}
