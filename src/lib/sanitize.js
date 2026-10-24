// HTML from documents shown outside the editor (previews, notes, snapshots) may come from another
// computer, an import or a bundle: only text formatting survives, never scripts, forms or
// navigation to other pages.
const DROP = 'script,style,iframe,object,embed,form,input,button,textarea,select,meta,link,base,frame,frameset,svg,math,template';
const SAFE_URL = /^(https?:|mailto:|scribner:|#)/i;
const SAFE_SRC = /^(data:image\/|blob:|scribner:|media:)/i;

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  doc.querySelectorAll(DROP).forEach((n) => n.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      const name = a.name.toLowerCase();
      const v = a.value.trim();
      if (name.startsWith('on') || name === 'srcdoc' || name === 'formaction' || name === 'action' || name === 'style' && /url\s*\(|expression/i.test(v)) el.removeAttribute(a.name);
      else if ((name === 'href' || name === 'xlink:href') && !SAFE_URL.test(v)) el.removeAttribute(a.name);
      else if ((name === 'src' || name === 'srcset') && !SAFE_SRC.test(v)) el.removeAttribute(a.name);
    }
    if (el.tagName === 'A') {
      el.setAttribute('target', '_blank'); // opened by the window-open handler (browser), never in the app window
      el.setAttribute('rel', 'noopener noreferrer');
    }
  });
  return doc.body.innerHTML;
}
