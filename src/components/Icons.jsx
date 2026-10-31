// Original, simple SVG icons for the "Clasic Scrivener" UI. 16x16 grid, currentColor strokes.
import React from 'react';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function Svg({ size = 16, className = '', title, children, ...rest }) {
  return (
    <svg
      viewBox="0 0 16 16" width={size} height={size} className={`sc-icon ${className}`}
      aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...rest}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

const paths = {
  binder: (<><rect x="1.5" y="2.5" width="13" height="11" rx="1" {...S} /><path d="M5.5 2.5v11M2.8 5h1.5M2.8 7h1.5M2.8 9h1.5" {...S} /></>),
  corkboard: (<><rect x="1.5" y="1.5" width="5.5" height="5.5" {...S} /><rect x="9" y="1.5" width="5.5" height="5.5" {...S} /><rect x="1.5" y="9" width="5.5" height="5.5" {...S} /><rect x="9" y="9" width="5.5" height="5.5" {...S} /><path d="M2.5 3h3.5M10 3h3.5M2.5 10.5h3.5M10 10.5h3.5" stroke="#d9534f" strokeWidth="1" /></>),
  outline: (<path d="M2 3h1M5 3h9M4 6.3h1M7 6.3h7M4 9.6h1M7 9.6h7M2 13h1M5 13h9" {...S} />),
  scrivenings: (<><path d="M3 1.5h7l3 3v4H3z" {...S} /><path d="M3 10.5h10v4H3z" {...S} /><path d="M5 4.5h4M5 6.5h6M5 12.5h6" {...S} /></>),
  compose: (<><path d="M1.5 3.5h13M1.5 12.5h13" {...S} /><path d="M4 1.5 1.5 3.5 4 5.5M12 10.5l2.5 2-2.5 2" {...S} /><rect x="5" y="6" width="6" height="4" {...S} /></>),
  compile: (<><path d="M3 1.5h10v5H3z" {...S} /><path d="M5 3.5h6" {...S} /><path d="M8 6.5v5M5.5 9 8 11.5 10.5 9" {...S} /><path d="M2 13.5h12" {...S} /></>),
  inspector: (<><circle cx="8" cy="8" r="6.5" {...S} /><path d="M8 7v4.5" {...S} /><circle cx="8" cy="4.8" r=".8" fill="currentColor" /></>),
  folder: (<path d="M1.5 4V13a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V5.5a.5.5 0 0 0-.5-.5H7.5L6 3H2a.5.5 0 0 0-.5.5z" fill="#e8c35a" stroke="#a8862a" strokeWidth="1" strokeLinejoin="round" />),
  document: (<><path d="M3.5 1.5h6l3 3v10h-9z" fill="#fff" stroke="#7b8796" strokeWidth="1" strokeLinejoin="round" /><path d="M9.5 1.5v3h3M5.5 7.5h5M5.5 9.5h5M5.5 11.5h3.5" stroke="#9aa6b4" strokeWidth="1" fill="none" /></>),
  draft: (<><path d="M2.5 1.5h9l2 2v11h-11z" fill="#fdfdfd" stroke="#4a6fa5" strokeWidth="1" strokeLinejoin="round" /><path d="M4 1.5v13" stroke="#4a6fa5" strokeWidth="1.6" /><path d="M6 5.5h5M6 7.5h5M6 9.5h3" stroke="#4a6fa5" strokeWidth="1" /></>),
  research: (<><path d="M1.5 4V13a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V5.5a.5.5 0 0 0-.5-.5H7.5L6 3H2a.5.5 0 0 0-.5.5z" fill="#cfe0f2" stroke="#5b84b1" strokeWidth="1" strokeLinejoin="round" /><circle cx="7.5" cy="9" r="2" fill="none" stroke="#2f5d8f" strokeWidth="1.1" /><path d="m9 10.5 2 2" stroke="#2f5d8f" strokeWidth="1.2" strokeLinecap="round" /></>),
  // Document Templates folder (Scrivener 3 §7.5): folder with a "T".
  templates: (<><path d="M1.5 4V13a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5V5.5a.5.5 0 0 0-.5-.5H7.5L6 3H2a.5.5 0 0 0-.5.5z" fill="#e8e2d4" stroke="#8f8878" strokeWidth="1" strokeLinejoin="round" /><path d="M5.6 6.2h4.8M8 6.2v4.6" stroke="#6b6455" strokeWidth="1.3" strokeLinecap="round" /></>),
  trash: (<><path d="M2.5 4h11M6 4V2.5h4V4" {...S} /><path d="M3.8 4l.8 10h6.8l.8-10" {...S} /><path d="M6.5 6.5v5M9.5 6.5v5" {...S} /></>),
  back: (<path d="M10 3 5 8l5 5" {...S} strokeWidth="1.6" />),
  forward: (<path d="m6 3 5 5-5 5" {...S} strokeWidth="1.6" />),
  split: (<><rect x="1.5" y="2.5" width="13" height="11" rx="1" {...S} /><path d="M8 2.5v11" {...S} /></>),
  splitH: (<><rect x="1.5" y="2.5" width="13" height="11" rx="1" {...S} /><path d="M1.5 8h13" {...S} /></>),
  unlock: (<><rect x="3" y="7" width="10" height="7" rx="1" {...S} /><path d="M5.5 7V5a2.5 2.5 0 0 1 4.9-.7" {...S} /></>),
  lock: (<><rect x="3" y="7" width="10" height="7" rx="1" {...S} /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" {...S} /></>),
  notes: (<><path d="M3 1.5h10v13H3z" {...S} /><path d="M5 4.5h6M5 7h6M5 9.5h6M5 12h3" {...S} /></>),
  bookmark: (<path d="M4 1.5h8v13L8 11l-4 3.5z" {...S} />),
  meta: (<><path d="M1.5 8.5 8.5 1.5h6v6l-7 7z" {...S} /><circle cx="11.5" cy="4.5" r="1.1" {...S} /></>),
  snapshot: (<><path d="M1.5 5h3l1.2-2h4.6L11.5 5h3v8.5h-13z" {...S} /><circle cx="8" cy="9" r="2.6" {...S} /></>),
  comment: (<path d="M2 2.5h12v8H7l-3.5 3v-3H2z" {...S} />),
  search: (<><circle cx="6.8" cy="6.8" r="4.3" {...S} /><path d="m10 10 4.3 4.3" {...S} strokeWidth="1.5" /></>),
  add: (<path d="M8 2.5v11M2.5 8h11" {...S} strokeWidth="1.5" />),
};

export function Icon({ name, ...rest }) {
  const p = paths[name];
  if (!p) return null;
  return <Svg {...rest}>{p}</Svg>;
}

const make = (name) => {
  const C = (props) => <Icon name={name} {...props} />;
  C.displayName = `Icon(${name})`;
  return C;
};

export const BinderIcon = make('binder');
export const CorkboardIcon = make('corkboard');
export const OutlineIcon = make('outline');
export const ScriveningsIcon = make('scrivenings');
export const ComposeIcon = make('compose');
export const CompileIcon = make('compile');
export const InspectorIcon = make('inspector');
export const FolderIcon = make('folder');
export const DocumentIcon = make('document');
export const DraftIcon = make('draft');
export const ResearchIcon = make('research');
export const TemplatesIcon = make('templates');
export const TrashIcon = make('trash');
export const BackIcon = make('back');
export const ForwardIcon = make('forward');
export const SplitIcon = make('split');
export const SplitHIcon = make('splitH');
export const LockIcon = make('lock');
export const UnlockIcon = make('unlock');
export const NotesIcon = make('notes');
export const BookmarkIcon = make('bookmark');
export const MetaIcon = make('meta');
export const SnapshotIcon = make('snapshot');
export const CommentIcon = make('comment');
export const SearchIcon = make('search');
export const AddIcon = make('add');

export const iconNames = Object.keys(paths);
export default Icon;
