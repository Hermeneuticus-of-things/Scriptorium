import React, { useEffect, useRef, useState } from 'react';
import { lineTops } from '../lib/lineNumbers.js';

// Line numbers in a gutter left of the text (View › Line Numbers). Every visual line is
// numbered, counted from the top of the document; only on screen, never printed or compiled.
export default function LineNumbers({ editor, mode = 'lines' }) {
  const box = useRef(null);
  const [nums, setNums] = useState([]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return undefined;
    let timer = null;
    const measure = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (editor.isDestroyed || !box.current) return;
        const origin = box.current.getBoundingClientRect().top;
        const blocks = [...editor.view.dom.children].slice(0, 20000).map((el) => {
          const r = el.getBoundingClientRect();
          let tops = [];
          if (mode === 'lines') {
            const range = document.createRange();
            range.selectNodeContents(el);
            tops = [...range.getClientRects()].map((x) => x.top);
          }
          return { top: r.top, height: r.height, tops };
        });
        setNums(lineTops(blocks, origin, mode));
      }, 60);
    };
    measure();
    editor.on('update', measure);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(editor.view.dom);
    return () => {
      clearTimeout(timer);
      editor.off('update', measure);
      ro?.disconnect();
    };
  }, [editor, mode]);
  return (
    <div className="line-numbers-gutter" ref={box} aria-hidden="true">
      {nums.map((x) => <span key={x.n} className="line-no" style={{ top: x.top }}>{x.n}</span>)}
    </div>
  );
}
