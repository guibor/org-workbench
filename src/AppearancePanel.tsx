import { useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { profiles, type Appearance, type Profile } from './appearance';

export function AppearancePanel({ value, change, close }: { value: Appearance; change: (value: Appearance) => void; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    element?.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog className="appearance-panel" ref={dialog} aria-labelledby="appearance-title" onCancel={e => { e.preventDefault(); close(); }} onClick={e => { if (e.target === dialog.current) { const r = dialog.current!.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); } }}>
    <header><h2 id="appearance-title">Reading appearance</h2><button className="icon-button" aria-label="Close appearance" title="Close" onClick={close}><X size={18} /></button></header>
    <div className="appearance-field"><label htmlFor="reading-profile">Profile</label><select id="reading-profile" value={value.profile} onChange={e => change({ ...profiles[e.target.value as Profile] })}>
      <option value="reading">MDF Reading</option><option value="nano">Nano-inspired</option><option value="plain">Plain</option>
    </select></div>
    <label className="appearance-field" htmlFor="reading-size"><span>Text size <output>{value.fontSize} px</output></span><input id="reading-size" type="range" min="14" max="24" step="1" value={value.fontSize} onChange={e => change({ ...value, fontSize: Number(e.target.value) })} /></label>
    <label className="appearance-field" htmlFor="reading-height"><span>Line height <output>{value.lineHeight.toFixed(2)}</output></span><input id="reading-height" type="range" min="1.35" max="2" step="0.05" value={value.lineHeight} onChange={e => change({ ...value, lineHeight: Number(e.target.value) })} /></label>
    <label className="appearance-field" htmlFor="reading-width"><span>Page width <output>{value.width} px</output></span><input id="reading-width" type="range" min="640" max="1100" step="20" value={value.width} onChange={e => change({ ...value, width: Number(e.target.value) })} /></label>
    <div className="appearance-field"><label htmlFor="reading-density">Table density</label><select id="reading-density" value={value.tableDensity} onChange={e => change({ ...value, tableDensity: e.target.value as Appearance['tableDensity'] })}><option value="compact">Compact</option><option value="comfortable">Comfortable</option></select></div>
    <footer><button className="appearance-reset" onClick={() => change({ ...profiles[value.profile] })}><RotateCcw size={14} /> Reset profile</button><button className="save-button" onClick={close}>Done</button></footer>
  </dialog>;
}
