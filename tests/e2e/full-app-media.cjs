'use strict';
// Registration only. The parent runner owns launch/reset/serialization; never run Electron here.
const fs = require('fs');
const path = require('path');
const FIXTURES = path.resolve(__dirname, '../../../installed-audit/fixtures');
const ZOOMS = [25,33,50,67,75,90,100,110,125,150,175,200,250,300,400];
const PDF_PRESETS = ['width','fit',50,75,100,125,150,200,300];
const RATES = [0.5,0.75,1,1.25,1.5,2];
const LABELS = ['Fără','Idee','Personaj','Loc'];
const STATUSES = ['Fără','De făcut','Prima ciornă','Revizuit','Final'];
const KINDS = ['image','pdf','audio','video','web'];
const SP_NOTES = [
  {id:'sp-a',title:'Nota neutră A',html:'<p>Alpha neutru</p>',updated:100},
  {id:'sp-b',title:'Nota neutră B',html:'<p>Beta neutru</p>',updated:90},
];
const LIMITS = [
  {name:'shell-adapter',reason:'openExternal/openPath/showItemInFolder sunt capturate de harness; se verifică URL/cale exacte, nu efectul live al shell-ului.'},
  {name:'image-context-options-absent',reason:'ImageViewer nu definește meniu contextual; handlerul Electron setupSpelling nu adaugă opțiuni pentru o imagine fără selecție. Nu există opțiuni image save/copy/rotate enumerate în source; testul de absență NU pretinde acoperirea lor.'},
  {name:'pdf-plugin-internals',reason:'Selecția/Ctrl+C are un caz cu text PDF real. Inventarul complet al toolbar-ului/meniurilor pluginului Chromium (thumbnails, bookmarks, rotate, print, download, fit, more, prezentare, selecție mouse) nu este definit de source și rămâne neacoperit; doar bara PdfViewer și fragmentele trimise pluginului au acoperire exhaustivă.'},
  {name:'native-media-overflow',reason:'Se acționează play, timeline, mute, volume, overflow-download și video fullscreen/PiP prin DOM CDP al UA shadow tree, cu aserțiuni reale. Opțiunile dinamice Chromium din overflow (viteze proprii, cast, subtitrări/tracks) și meniul OS al PiP nu au inventar stabil în source și rămân neacoperite. Un widget lipsă/ascuns este FAIL cu limită, niciodată pass prin fallback.'},
  {name:'dictation-no-recording',reason:'Nu se pornește microfonul: start/stop/pause/resume/cancel dictare, meter, cronometru, clipping și descărcări de motor nu se pot traversa fără înregistrare reală sau mock; interzise în această sarcină. Se verifică numai starea sigură idle.'},
  {name:'tts-providers',reason:'Citire/pauză/reluare/stop folosesc doar o voce de sistem și text neutru; dacă nu există voce de sistem cazul e FAIL explicit. Sinteza Mihai/download, Speechify și alte servicii cu chei reale nu sunt executate. Selectarea tuturor opțiunilor vocilor prezente se verifică separat, fără sinteză.'},
  {name:'speech-startup-prelaunch',reason:'Modulul poate seta speechAutoInstall:false numai după H.launch. Pentru a preveni descărcările automate pornite de aplicație la startup, părintele trebuie să seed-uiască speechAutoInstall:false în profil înainte de lansare; nu modific harness din acest domeniu.'},
  {name:'global-shortcut',reason:'Ctrl+Alt+Shift+N global (în afara aplicației) nu este acționat; focusul OS, coliziunile cu alte aplicații și înregistrarea după restart rămân neacoperite. Deschiderea/reutilizarea reală a Scratchpad standalone prin UI este acoperită.'},
  {name:'secondary-physical-display',reason:'Full-screen/minimize/maximize/close sunt verificate pe BrowserWindow real; bara nativă Windows, Snap, system menu, mutarea pe monitoare fizice și accesibilitatea OS nu sunt automatizate.'},
  {name:'scratchpad-native-context',reason:'Meniurile contextuale native de editare/spellcheck ale contentEditable din Scratchpad/Notes/QuickRef sunt în domeniul editorului, nu au adapter popup în H.native (care vede doar application menu); nu se pretinde verificare completă a acestor popup-uri.'},
  {name:'web-live-source',reason:'Arhiva HTML este numai locală/sandboxed și sursa example.invalid este capturată de shell. Descărcarea/arhivarea unei pagini live și conținutul site-ului extern nu sunt executate.'},
];

// A small valid three-page PDF with deterministic text, no external dependency or personal input.
function neutralPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>',
  ];
  for (let i=1;i<=3;i++) {
    const stream = `BT /F1 18 Tf 72 720 Td (Neutral PDF page ${i}) Tj 0 -36 Td (Text for selection and notes.) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents ${2*i+2} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let out='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((v,i)=>{offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${v}\nendobj\n`;});
  const xref=Buffer.byteLength(out);
  out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  out+=offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
  out+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

module.exports = async function fullAppMedia(H) {
  let S = {};
  LIMITS.forEach(l=>H.limit(l.name,l.reason));
  const b=(root,name)=>root.getByRole('button',{name,exact:true});
  const mv=()=>H.p.locator('.media-view').first();
  const iv=()=>H.p.locator('.image-viewer').first();
  const pv=()=>H.p.locator('.pdf-viewer').first();
  const player=()=>H.p.locator('.player-view').first();
  const mediaEl=()=>player().locator(S.kind==='video'?'video':'audio');
  const notesFile=id=>path.join(H.dir,'notes',id+'.html');
  const readNotes=id=>fs.existsSync(notesFile(id))?fs.readFileSync(notesFile(id),'utf8'):'';
  const settings=()=>H.p.evaluate(()=>window.api.getSettings());
  const save=async()=>{await H.save();};
  const focusWithin=async(root)=>root.evaluate(e=>e.contains(document.activeElement));
  const proof=async(p,suffix)=>{
    if(p===H.p||p.isClosed())return;
    await p.screenshot({path:path.join(H.W,'screens','secondary-'+H.currentCase+'-'+suffix+'.png')});
  };
  const cleanSecondary=async()=>{
    for(const p of await H.app.windows())if(p!==H.p&&!p.isClosed()){
      const handle=await H.app.browserWindow(p);
      await handle.evaluate(w=>w.destroy());
    }
  };
  const initialFor=(id,surface)=>{
    let state='doc-a conține Capitol verificat/Prima frază, doc-b conține Text separat; media nu redă automat; fără fișiere personale.';
    if(id.startsWith('image.step.'))state='Imagine PNG neutră încărcată; zoom inițial '+id.split('.')[2]+'%; fără modificări ale bytes.';
    else if(id.startsWith('pdf.step.'))state='PDF neutru valid, 3 pagini; pagina 1; zoom inițial '+id.split('.')[2]+'%; adnotări goale.';
    else if(surface.startsWith('Pdf'))state='PDF neutru valid, 3 pagini; pagina 1/zoom pe lățime, exceptând pagina 2 și adnotarea fixture p.3 pregătite de setup pentru comenzile respective.';
    else if(surface.includes('Scratchpad'))state='Două note neutre independente de proiect: sp-a/Alpha și sp-b/Beta, dosar neales; cazurile empty/last/add-empty folosesc zero sau o notă. '+(surface.includes('standalone')?'Fereastră BrowserWindow Scratchpad reală, mereu deasupra, proiectul principal este singura țintă.':'Panou embedded, doc-a selectat; lista completă de dosare fixture disponibilă.');
    else if(surface==='QuickRef')state='Referință la doc-a/Capitol verificat, doc-a activ pentru read-only; cazurile edit/close mută documentul principal la doc-b, locked/trash/file folosesc protecția fixture indicată în ID.';
    else if(surface==='FloatingInspector')state='Mod compunere, doc-a, Sinopsis A, Note verificate; toate etichetele și statusurile implicite disponibile; inspector plutitor deschis de setup.';
    else if(surface==='Secondary BrowserWindow')state='O fereastră principală deține proiectul fixture; fereastra secundară deschide copia neutră separată (exceptând welcome/existing-project); autosave 120 sec în cazurile de închidere nesalvată.';
    else if(surface==='MiniPlayer')state='Mini-player idle, rate 1×, dictare oprită, instalare automată speech dezactivată; read-empty folosește document gol, system-read folosește numai text neutru repetat și voce de sistem.';
    else if(surface==='Copyholder')state='Referință secundară doc-a readonly; documentul principal doc-b, fișierele proiectului încă nemodificate.';
    return surface+': '+state+' Caz/control: '+id+' / '+surface+'.';
  };
  const add=(id,surface,control,setup,act,verify,extra={})=>H.test('media.'+id,{
    surface,control,commands:extra.commands||[],routes:extra.routes||[],
    initial:extra.initial||initialFor(id,surface),
    expected:extra.expected||control+': valoarea/conținutul/poziția finală cerută de control este comparată cu rezultatul specific fixture în HTML, project.json, settings sau media runtime; nici deschiderea și nici închiderea singură nu constituie succes.',
    ...extra,setup:async h=>{S={};await cleanSecondary();if(setup)await setup(h);},act,verify,
  });
  const media=async(kind,patch={})=>{
    S.kind=kind; S.id='media-'+kind;
    const spec={image:['png','image/png','image.png'],pdf:['pdf','application/pdf'],audio:['wav','audio/wav','silence.wav'],video:['webm','video/webm','neutral.webm'],web:['html','text/html']}[kind];
    S.file='qa-'+kind+'.'+spec[0];
    const bytes=spec[2]?fs.readFileSync(path.join(FIXTURES,spec[2])):kind==='pdf'?neutralPdf():Buffer.from('<!doctype html><html><head><title>Arhivă neutră</title></head><body><h1>Arhivă neutră locală</h1><p id="offline">Conținut offline verificat</p><a href="#offline">Înapoi la conținut</a><script>document.body.dataset.scriptRan="yes"</script></body></html>');
    S.bytes=bytes;
    await H.fixture(async(pj,files)=>{
      pj.tree.find(n=>n.root==='research').children.push({id:S.id,title:'Media neutră '+kind,type:'file',media:{file:S.file,name:S.file,mime:spec[1],...patch}});
      files['media/'+S.file]=bytes;
      files['notes/'+S.id+'.html']='<p>Note media inițiale.</p>';
    });
    await H.select(S.id);
    await H.wait(async()=>await mv().locator('h2').textContent()==='Media neutră '+kind);
    if(kind==='image')await H.wait(()=>iv().locator('img').evaluate(e=>e.complete&&e.naturalWidth>0));
    if(kind==='pdf')await H.wait(async()=>Boolean(await pv().locator('iframe').getAttribute('src')));
    if(kind==='audio'||kind==='video')await H.wait(()=>mediaEl().evaluate(e=>Number.isFinite(e.duration)&&e.duration>0));
    if(kind==='web')await H.wait(async()=>await H.p.frameLocator('.web-frame').locator('h1').textContent()==='Arhivă neutră locală');
  };
  const persistMedia=async(key,value)=>{await save();await H.wait(()=>H.node(S.id)?.media?.[key]===value);};
  const drag=async(locator,dx=100,dy=60)=>{
    const r=await locator.boundingBox();H.assert(r&&r.width>0,'Drag target rendered');
    await H.p.mouse.move(r.x+20,r.y+12);await H.p.mouse.down();await H.p.mouse.move(r.x+20+dx,r.y+12+dy,{steps:8});await H.p.mouse.up();
  };
  const download=async(p,act)=>{
    const pending=p.waitForEvent('download');await act();const d=await pending;
    S.downloadName=d.suggestedFilename(); S.downloadPath=path.join(H.W,'download-'+H.currentCase+'-'+S.downloadName);
    await d.saveAs(S.downloadPath); S.downloadBytes=fs.readFileSync(S.downloadPath);
  };
  const range=async(p,locator,value)=>{
    const info=await locator.evaluate(e=>({min:Number(e.min)||0,step:Number(e.step)||1}));
    await locator.focus();await p.keyboard.press('Home');
    const steps=Math.round((value-info.min)/info.step);
    for(let i=0;i<steps;i++)await p.keyboard.press('ArrowRight');
  };
  const mediaState=()=>mediaEl().evaluate(e=>({time:e.currentTime,paused:e.paused,rate:e.playbackRate,volume:e.volume,muted:e.muted,duration:e.duration,ended:e.ended}));
  // Inspect and physically click Chromium's real UA widgets, never call .play()/.pause() as the action.
  const uaTree=async()=>{
    const cdp=await H.p.context().newCDPSession(H.p);
    const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
    const walk=n=>[n,...(n.children||[]).flatMap(walk),...(n.shadowRoots||[]).flatMap(walk),...(n.contentDocument?walk(n.contentDocument):[])];
    const nodes=walk(root);const tag=S.kind==='video'?'VIDEO':'AUDIO';
    const m=nodes.find(n=>n.nodeName===tag);H.assert(m,'UA media root exists');
    return {cdp,nodes:walk(m),all:nodes};
  };
  const attrs=n=>Object.fromEntries((n.attributes||[]).reduce((a,x,i,all)=>i%2?a:[...a,[x,all[i+1]]],[]));
  const uaClick=async(pattern,ratio=0.5,hover=true)=>{
    if(hover)await mediaEl().hover();
    const {cdp,nodes}=await uaTree();
    const node=nodes.find(n=>pattern.test(attrs(n).pseudo||''));
    if(!node){await cdp.detach();H.limit('ua-widget-'+String(pattern),'Widget UA negăsit în buildul executat; cazul eșuează, fără substituirea logicii.');throw Error('UA widget unavailable '+pattern);}
    let box;
    try{box=(await cdp.send('DOM.getBoxModel',{nodeId:node.nodeId})).model;}catch(e){await cdp.detach();throw Error('UA widget not rendered '+pattern+': '+e.message);}
    H.assert(box.width>0&&box.height>0,'UA control visible '+pattern);
    const q=box.content;await H.p.mouse.click(q[0]+(q[2]-q[0])*ratio,(q[1]+q[5])/2);await cdp.detach();
  };
  const playKey=async()=>{await H.p.keyboard.press('Control+Alt+p');};
  const pdfPage=()=>pv().getByRole('spinbutton',{name:'Pagina',exact:true});
  const pdfSrc=()=>pv().locator('iframe').getAttribute('src');
  const annotation={id:'ann-fixture',page:3,kind:'highlight',text:'Citat neutru',note:'Notă neutră',color:'#ffe066',created:'2026-01-01T00:00:00.000Z'};

  // Shared media header, bytes, navigation, actual shell IPC (captured only), downloads, split lifecycle.
  for(const kind of KINDS){
    add(kind+'.content','MediaView '+kind,'titlu/MIME/conținut/focus',()=>media(kind),async()=>{await mv().click({position:{x:5,y:5}});},async()=>{
      H.assert(await mv().getAttribute('data-kind')===kind,'Correct viewer kind');
      H.assert((await mv().locator('.media-head').textContent()).includes(S.file),'Filename in heading');
      H.assert(await focusWithin(mv()),'Real focus belongs to media surface');
      H.assert(fs.readFileSync(path.join(H.dir,'media',S.file)).equals(S.bytes),'Fixture bytes unchanged');
      if(kind==='image'){H.assert(await iv().locator('img').getAttribute('alt')==='Media neutră image','Image alt context');const size=await iv().locator('img').evaluate(e=>({w:e.naturalWidth,h:e.naturalHeight}));H.assert((await iv().locator('.viewer-bar .muted').textContent())===size.w+' × '+size.h,'Natural dimensions displayed');H.assert(await b(iv(),'Potrivește în panou').getAttribute('aria-pressed')==='true','Initial image fit mode');}
      if(kind==='pdf'){H.assert((await pdfSrc()).includes('#page=1&view=FitH'),'PDF initial page/fit width');H.assert((await pv().locator('.viewer-page .muted').textContent()).trim()==='/ 3','PDF total page count displayed');}
      if(kind==='audio'||kind==='video'){H.assert((await mediaState()).paused,'No autoplay');H.assert(await mediaEl().evaluate(e=>e.controls&&e.getAttribute('aria-label')===('Media neutră '+e.tagName.toLowerCase())),'Native controls and media label');}
      if(kind==='web')H.assert(await H.p.frameLocator('.web-frame').locator('#offline').textContent()==='Conținut offline verificat','Offline content');
    });
    add(kind+'.save-copy','MediaView '+kind,'Salvează o copie',()=>media(kind),async()=>download(H.p,()=>mv().getByRole('link',{name:'Salvează o copie',exact:true}).click()),async()=>{
      H.assert(S.downloadName===S.file,'Exact exported name');H.assert(S.downloadBytes.equals(S.bytes),'Exact exported media bytes');
    },{expected:'Fișierul descărcat are numele și bytes identice fixture-ului, nu doar un dialog închis.'});
    for(const route of ['command','native'])add(kind+'.external.'+route,'MediaView '+kind,'Deschide în editor extern/'+route,()=>media(kind),async()=>{
      if(route==='native')await H.native(['Documente','Deschide în editor extern']);else await H.command('openExternal');
    },async()=>{const e=await H.effects();H.assert(e.some(x=>x.kind==='external-file'&&path.resolve(x.file)===path.resolve(H.dir,'media',S.file)),'Exact captured shell path');H.assert(await mv().getAttribute('data-kind')===kind,'External handoff preserves current context');},{commands:['openExternal'],routes:route==='native'?[['Documente','Deschide în editor extern']]:[]});
    for(const close of ['button','escape'])add(kind+'.beside.'+close,'Split MediaView '+kind,'Deschide alături / închidere '+close,()=>media(kind),async()=>{
      await b(mv(),'Deschide alături de text').click();await H.select('doc-a');
      await H.wait(async()=>await H.p.locator('.pane.second .media-view h2').textContent()==='Media neutră '+kind);
      H.assert((await H.editor().textContent()).includes('Prima frază'),'Main text unchanged beside media');
      const split=H.p.locator('.pane.second .media-view');await split.click({position:{x:5,y:5}});
      H.assert(await focusWithin(split),'Split viewer receives focus');
      if(close==='escape')await H.p.keyboard.press('Escape');else await b(H.p.locator('.pane.second .pane-head'),'Închide').click();
    },async()=>{await H.wait(async()=>await H.p.locator('.pane.second').count()===0);H.assert((await H.editor().textContent()).includes('Prima frază'),'Return path main document');H.assert(H.node(S.id).media.file===S.file,'Closing split does not delete media');});
    add(kind+'.return-navigation','MediaView '+kind,'Binder înapoi/înainte',()=>media(kind),async()=>{await H.select('doc-b');await H.command('back');},async()=>{
      await H.wait(async()=>await mv().getAttribute('data-kind')===kind);H.assert(await mv().locator('h2').textContent()==='Media neutră '+kind,'Back restores selected media context');await H.command('forward');await H.wait(async()=>(await H.editor().textContent()).includes('Text separat'));H.assert(await mv().count()===0,'Forward unmounts media surface');
    },{commands:['back','forward']});
  }

  // Image toolbar and every possible step, including clamped limits.
  for(const [i,z] of ZOOMS.entries())for(const direction of [-1,1]){
    const next=ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,i+direction))];
    add('image.step.'+z+'.'+(direction>0?'in':'out'),'ImageViewer','zoom '+z+' → '+next,()=>media('image',{zoom:z}),async()=>b(iv(),direction>0?'Mărește':'Micșorează').click(),async()=>{
      await persistMedia('zoom',next);H.assert(await iv().locator('.viewer-zoom').textContent()===next+'%','Displayed zoom step');
      const dims=await iv().locator('img').evaluate(e=>({actual:e.width,natural:e.naturalWidth}));H.assert(dims.actual===Math.round(dims.natural*next/100),'Image pixel width reflects zoom');
    });
  }
  for(const [label,z] of [['Potrivește în panou','fit'],['Mărime reală (100%)',100]])add('image.mode.'+z,'ImageViewer',label,()=>media('image',{zoom:300}),async()=>b(iv(),label).click(),async()=>{
    await persistMedia('zoom',z);H.assert(await b(iv(),label).getAttribute('aria-pressed')==='true','Active zoom mode');
    const size=await iv().locator('img').evaluate(e=>({w:e.width,nw:e.naturalWidth,h:e.height,nh:e.naturalHeight,bw:e.parentElement.clientWidth,bh:e.parentElement.clientHeight}));
    H.assert(z===100?size.w===size.nw:size.w<=size.bw&&size.h<=size.bh,'Actual/fit rendered dimensions');
    await H.select('doc-a');await H.select(S.id);await H.wait(async()=>await b(iv(),label).getAttribute('aria-pressed')==='true');
  });
  for(const direction of [-1,1])add('image.wheel.'+direction,'ImageViewer','Ctrl+rotiță',()=>media('image',{zoom:100}),async()=>{
    await iv().locator('.image-stage').hover();await H.p.keyboard.down('Control');await H.p.mouse.wheel(0,direction>0?-120:120);await H.p.keyboard.up('Control');
  },async()=>persistMedia('zoom',direction>0?110:90));
  add('image.pan','ImageViewer','drag/pan, mouseup oprește',()=>media('image',{zoom:400}),async()=>{
    const stage=iv().locator('.image-stage');await drag(stage,-150,-100);S.pan=await stage.evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));await stage.hover({position:{x:40,y:40}});
  },async()=>{const p=await iv().locator('.image-stage').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));H.assert(S.pan.x>0||S.pan.y>0,'Dragging changes image scroll');H.assert(p.x===S.pan.x&&p.y===S.pan.y,'Mouseup stops pan');});
  add('image.wheel-noctrl','ImageViewer','rotiță fără Ctrl nu modifică zoom',()=>media('image',{zoom:400}),async()=>{await iv().locator('.image-stage').hover();await H.p.mouse.wheel(0,120);},async()=>{H.assert(H.node(S.id).media.zoom===400,'Ordinary wheel preserves zoom');H.assert(await iv().locator('.viewer-zoom').textContent()==='400%','Zoom label unchanged');});
  add('image.pan-leave','ImageViewer','drag / mouseleave oprește pan',()=>media('image',{zoom:400}),async()=>{
    const stage=iv().locator('.image-stage'),r=await stage.boundingBox();await H.p.mouse.move(r.x+r.width/2,r.y+r.height/2);await H.p.mouse.down();await H.p.mouse.move(r.x+r.width/2-100,r.y+r.height/2-50,{steps:6});await H.p.mouse.move(r.x+5,r.y-15,{steps:3});S.pan=await stage.evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));await H.p.mouse.move(r.x+r.width/2,r.y+r.height/2);await H.p.mouse.up();
  },async()=>{const p=await iv().locator('.image-stage').evaluate(e=>({x:e.scrollLeft,y:e.scrollTop}));H.assert(S.pan.x>0||S.pan.y>0,'Initial drag actually pans');H.assert(p.x===S.pan.x&&p.y===S.pan.y,'Reentry after mouseleave does not continue drag');});
  for(const route of ['command','native'])for(const direction of [-1,1])add('image.focus-zoom.'+route+'.'+direction,'ImageViewer','comandă zoom pe focus media',()=>media('image',{zoom:100}),async()=>{
    await mv().click({position:{x:5,y:5}});const id=direction>0?'zoomIn':'zoomOut';
    if(route==='command')await H.command(id);else await H.native(['Vizualizare','Zoom',direction>0?'Mărește textul':'Micșorează textul']);
  },async()=>persistMedia('zoom',direction>0?110:90),{commands:[direction>0?'zoomIn':'zoomOut'],routes:route==='native'?[['Vizualizare','Zoom',direction>0?'Mărește textul':'Micșorează textul']]:[]});
  add('image.context-absence','ImageViewer','click dreapta / absența opțiunilor',()=>media('image',{zoom:100}),async()=>{await iv().locator('img').click({button:'right'});await H.p.keyboard.press('Escape');},async()=>{
    H.assert(await H.p.locator('.ctx-menu-root').count()===0,'No app image context menu is implemented');H.assert(await iv().locator('img').evaluate(e=>e.complete&&e.width>0),'Image survives right click');H.assert(H.node(S.id).media.zoom===100,'Right click does not mutate zoom');
  },{expected:'Absența meniului aplicației este verificată; opțiunile save/copy/rotate dintr-un meniu de imagine NU sunt declarate acoperite.'});

  // PDF page navigation: all pages and numeric clamps, buttons, both fit modes and all zoom steps.
  for(const [input,want] of [[1,1],[2,2],[3,3],[0,1],[-2,1],[99,3],[2.8,2]])add('pdf.page-input.'+input,'PdfViewer','Pagina '+input,()=>media('pdf',{page:want===1?2:1}),async()=>pdfPage().fill(String(input)),async()=>{
    await persistMedia('page',want);H.assert(await pdfPage().inputValue()===String(want),'Numeric page normalized');H.assert((await pdfSrc()).includes('#page='+want+'&'),'Iframe page fragment');H.assert(await b(pv(),'Pagina anterioară').isDisabled()===(want===1),'Previous boundary');H.assert(await b(pv(),'Pagina următoare').isDisabled()===(want===3),'Next boundary');
  });
  for(const direction of [-1,1])add('pdf.page-button.'+direction,'PdfViewer','Pagina '+(direction>0?'următoare':'anterioară'),()=>media('pdf',{page:2}),async()=>b(pv(),direction>0?'Pagina următoare':'Pagina anterioară').click(),async()=>{await persistMedia('page',direction>0?3:1);H.assert((await pdfSrc()).includes('#page='+(direction>0?3:1)),'Button navigates real iframe URL');});
  for(const z of PDF_PRESETS)add('pdf.preset.'+z,'PdfViewer','Zoom preset '+z,()=>media('pdf'),async()=>pv().getByRole('combobox',{name:'Mărire',exact:true}).selectOption(String(z)),async()=>{
    await persistMedia('zoom',z);const fragment=z==='fit'?'view=Fit':z==='width'?'view=FitH':'zoom='+z;H.assert((await pdfSrc()).includes(fragment),'Exact PDF zoom fragment');H.assert(await pv().getByRole('combobox',{name:'Mărire',exact:true}).inputValue()===String(z),'Selected preset');
  });
  for(const [i,z] of ZOOMS.entries())for(const direction of [-1,1]){
    const next=ZOOMS[Math.max(0,Math.min(ZOOMS.length-1,i+direction))];
    add('pdf.step.'+z+'.'+direction,'PdfViewer','zoom step '+z+' → '+next,()=>media('pdf',{zoom:z}),async()=>b(pv(),direction>0?'Mărește':'Micșorează').click(),async()=>{
      await persistMedia('zoom',next);H.assert((await pdfSrc()).includes('zoom='+next),'PDF step fragment');H.assert(await pv().getByRole('combobox',{name:'Mărire',exact:true}).inputValue()===String(next),'Dynamic zoom option inserted');
    });
  }
  for(const q of ['Neutral PDF','', '  selection  '])add('pdf.search.'+(q.trim()||'clear').replace(/ /g,'-'),'PdfViewer','Caută în PDF / submit / clear',()=>media('pdf'),async()=>{
    if(!q){await pv().getByRole('searchbox').fill('Neutral');await b(pv(),'Caută').click();}
    await pv().getByRole('searchbox').fill(q);await b(pv(),'Caută').click();
  },async()=>{const src=await pdfSrc();H.assert(q.trim()?src.includes('search='+encodeURIComponent(q.trim())):!src.includes('search='),'Search term normalized/cleared in actual PDF address');H.assert(src.includes('#page=1'),'Search preserves page context');});
  for(const show of [false,true])add('pdf.annotations-panel.'+show,'PdfViewer','Arată/ascunde adnotările',()=>media('pdf',{showAnnotations:!show}),async()=>pv().getByRole('button',{name:/^Adnotări \(/}).click(),async()=>{
    await persistMedia('showAnnotations',show);H.assert(await pv().locator('.pdf-notes').count()===(show?1:0),'Panel visibility equals persisted state');H.assert(await pv().getByRole('button',{name:/^Adnotări \(/}).getAttribute('aria-pressed')===String(show),'Toggle pressed state');
  });
  add('pdf.note-add','PdfViewer','Textul notei / Adaugă nota',()=>media('pdf',{page:2}),async()=>{
    H.assert(await b(pv(),'Adaugă nota').isDisabled(),'Empty note cannot add');await pv().getByRole('textbox',{name:'Textul notei',exact:true}).fill('Notă PDF verificată <neutru>');await b(pv(),'Adaugă nota').click();
  },async()=>{await save();const a=H.node(S.id).media.annotations;H.assert(a.length===1&&a[0].kind==='note'&&a[0].page===2&&a[0].note==='Notă PDF verificată <neutru>','Exact note persisted with page/kind/text');H.assert((await pv().locator('.pdf-ann').textContent()).includes('<neutru>'),'Note rendered as text');H.assert(await pv().getByRole('textbox',{name:'Textul notei',exact:true}).inputValue()==='','Note draft cleared');});
  add('pdf.highlight-empty','PdfViewer','Evidențiază / clipboard gol',()=>media('pdf'),async()=>{
    await H.app.evaluate(({clipboard})=>clipboard.writeText(''));await b(pv(),'Evidențiază selecția copiată').click();
  },async()=>{await H.wait(async()=>(await pv().getByRole('status').textContent()).includes('Nu există text copiat'));H.assert(!(H.node(S.id).media.annotations||[]).length,'Empty clipboard creates no annotation');});
  add('pdf.highlight-copied','PdfViewer','Evidențiază selecția copiată / notă',()=>media('pdf',{page:2}),async()=>{
    await H.app.evaluate(({clipboard})=>clipboard.writeText('Citat PDF neutru <safe>'));await pv().getByRole('textbox',{name:'Textul notei',exact:true}).fill('Explicație neutră');await b(pv(),'Evidențiază selecția copiată').click();
  },async()=>{await save();const a=H.node(S.id).media.annotations;H.assert(a.length===1&&a[0].kind==='highlight'&&a[0].page===2&&a[0].text==='Citat PDF neutru <safe>'&&a[0].note==='Explicație neutră','Highlight payload persisted');H.assert(await pv().locator('.pdf-ann q').textContent()==='Citat PDF neutru <safe>','Quote rendered safely');});
  add('pdf.native-select-copy','PDF Chromium','selecție Ctrl+A / Ctrl+C în PDF real',()=>media('pdf'),async()=>{
    await H.app.evaluate(({clipboard})=>clipboard.writeText('clipboard-fixture-before'));const r=await pv().locator('iframe').boundingBox();H.assert(r,'PDF frame rendered');await H.p.mouse.click(r.x+r.width/2,r.y+r.height/2);await H.p.keyboard.press('Control+a');await H.p.keyboard.press('Control+c');
  },async()=>{await H.wait(async()=>/Neutral PDF page/.test(await H.app.evaluate(({clipboard})=>clipboard.readText())));H.assert((await pdfSrc()).includes('#page=1'),'Selection keeps PDF context');},{expected:'Clipboard-ul real conține textul PDF neutru, nu markerul anterior. Dacă pluginul nu expune selecție, cazul eșuează explicit.'});
  add('pdf.annotation-go-page','PdfViewer','Mergi la pagina adnotării',()=>media('pdf',{annotations:[annotation]}),async()=>b(pv(),'p. 3').click(),async()=>{await persistMedia('page',3);H.assert((await pdfSrc()).includes('#page=3'),'Annotation opens associated page');H.assert((await pv().locator('.pdf-ann').textContent()).includes('Notă neutră'),'Annotation remains after navigation');});
  add('pdf.annotation-delete','PdfViewer','Șterge adnotarea',()=>media('pdf',{annotations:[annotation]}),async()=>b(pv(),'Șterge').click(),async()=>{await save();H.assert(H.node(S.id).media.annotations.length===0,'Annotation removed from project');H.assert(await pv().locator('.pdf-ann').count()===0,'Annotation removed from list');H.assert(!(await readNotes(S.id)).includes('Citat neutru'),'Deleting does not silently append notes');});
  add('pdf.annotation-copy-notes','PdfViewer','Copiază adnotările în notele documentului',()=>media('pdf',{annotations:[annotation]}),async()=>b(pv(),'Copiază adnotările în notele documentului').click(),async()=>{
    await H.wait(()=>readNotes(S.id).includes('<blockquote><p>Citat neutru</p></blockquote>'));const h=readNotes(S.id);H.assert(h.includes('Note media inițiale.')&&h.includes('Notă neutră')&&h.includes('Media neutră pdf, p. 3'),'Append preserves old notes and exact citation/page');H.assert(H.node(S.id).media.annotations.length===1,'Copy is non-destructive');
  });

  // Audio/video: every application rate, all transcription buttons/keys, and real native controls.
  for(const kind of ['audio','video']){
    for(const rate of RATES)add(kind+'.rate.'+rate,'MediaPlayerView '+kind,'Viteză '+rate+'×',()=>media(kind),async()=>player().getByRole('combobox').selectOption(String(rate)),async()=>{
      await persistMedia('rate',rate);H.assert((await mediaState()).rate===rate,'HTML media playbackRate changed');await H.select('doc-a');await H.select(S.id);await H.wait(async()=>(await mediaState()).rate===rate);
    });
    for(const method of ['keyboard','native-widget'])add(kind+'.play-pause.'+method,'MediaPlayerView '+kind,'play/pause/'+method,()=>media(kind),async()=>{
      S.before=await mediaState();if(method==='keyboard')await playKey();else await uaClick(/media-controls-play-button$/);
      await H.wait(async()=>!(await mediaState()).paused);await H.wait(async()=>(await mediaState()).time>S.before.time+0.1);
      if(method==='keyboard')await playKey();else await uaClick(/media-controls-play-button$/);
    },async()=>{const s=await mediaState();H.assert(s.paused&&!s.ended,'Playback paused rather than ended');S.paused=s.time;await H.sleep(200);H.assert(Math.abs((await mediaState()).time-S.paused)<0.05,'Pause stops actual clock');},{expected:'Clock-ul media real avansează la play și se stabilizează la pause; nu se apelează .play() ca substitut de control.'});
    for(const direction of [-1,1])for(const method of ['button','keyboard'])add(kind+'.skip.'+direction+'.'+method,'MediaPlayerView '+kind,'seek ±5 sec/'+method,async()=>{await media(kind,{time:6});S.before=await mediaState();},async()=>{
      if(method==='button')await b(player(),direction>0?'Înainte 5 secunde':'Înapoi 5 secunde').click();else await H.p.keyboard.press(direction>0?'Control+Alt+ArrowRight':'Control+Alt+ArrowLeft');
    },async()=>{const target=Math.max(0,Math.min(S.before.duration,S.before.time+direction*5));await H.wait(async()=>Math.abs((await mediaState()).time-target)<0.15);await save();H.assert(Math.abs((H.node(S.id).media.time||0)-Math.floor(target))<=1,'Seek position persisted to media node');});
    for(const ratio of [0,0.5,0.9])add(kind+'.native-timeline.'+ratio,'Chromium '+kind,'timeline seek '+ratio,()=>media(kind),async()=>{S.before=await mediaState();await uaClick(/media-controls-timeline$/,ratio===0?0.01:ratio);},async()=>{
      const s=await mediaState();H.assert(ratio===0?s.time<1:s.time>0&&s.time<s.duration,'Native timeline changes currentTime');if(ratio>0)H.assert(Math.abs(s.time/s.duration-ratio)<0.2,'Timeline seeks intended fraction');await save();H.assert(Math.abs((H.node(S.id).media.time||0)-Math.floor(s.time))<=1,'Native seek persisted');
    });
    add(kind+'.native-mute','Chromium '+kind,'mute/unmute',()=>media(kind),async()=>{
      S.before=await mediaState();await uaClick(/media-controls-mute-button$/);await H.wait(async()=>(await mediaState()).muted!==S.before.muted);await uaClick(/media-controls-mute-button$/);
    },async()=>H.assert((await mediaState()).muted===S.before.muted,'Unmute restores actual muted property'));
    for(const ratio of [0,0.5,1])add(kind+'.native-volume.'+ratio,'Chromium '+kind,'volume '+ratio,()=>media(kind),async()=>{
      await mediaEl().hover();const {cdp,nodes}=await uaTree();const node=nodes.find(n=>/media-controls-mute-button$/.test(attrs(n).pseudo||''));H.assert(node,'Mute handle exists to reveal volume');const q=(await cdp.send('DOM.getBoxModel',{nodeId:node.nodeId})).model.content;await H.p.mouse.move((q[0]+q[2])/2,(q[1]+q[5])/2);await cdp.detach();await uaClick(/media-controls-volume-slider$/,ratio===0?0.01:ratio===1?0.99:ratio,false);
    },async()=>{const s=await mediaState();H.assert(Math.abs(s.volume-ratio)<0.15,'Actual volume reflects UI slider');});
    add(kind+'.native-download','Chromium '+kind,'overflow / download',()=>media(kind),async()=>{
      await uaClick(/media-controls-overflow-menu-button$/);await H.shot(kind+'-native-overflow-open');await download(H.p,()=>uaClick(/media-controls-download-button$/,0.5,false));
    },async()=>H.assert(S.downloadBytes.equals(S.bytes),'Native download contains exact neutral media bytes'));
    for(const method of ['button','keyboard'])for(const destination of ['notes','text'])add(kind+'.timestamp.'+method+'.'+destination,'MediaPlayerView '+kind,'Inserează momentul în '+destination,async()=>{
      await media(kind,{time:6});if(destination==='text'){await b(mv(),'Deschide alături de text').click();await H.select('doc-a');}
      S.time=(await mediaState()).time;S.stamp='['+String(Math.floor(S.time/60)).padStart(2,'0')+':'+String(Math.floor(S.time)%60).padStart(2,'0')+']';
    },async()=>{if(method==='button')await player().locator('.insert-time').click();else{if(destination==='text')await H.editor().click();await H.p.keyboard.press('Control+Alt+t');}},async()=>{
      await save();if(destination==='notes'){await H.wait(()=>readNotes(S.id).includes(S.stamp));H.assert(readNotes(S.id).includes('Note media inițiale.'),'Timestamp preserves original media notes');}else{await H.wait(()=>H.doc('doc-a').includes(S.stamp));H.assert(!readNotes(S.id).includes(S.stamp),'Timestamp goes to adjacent text, not media notes');}
    });
    add(kind+'.resume-position','MediaPlayerView '+kind,'memorare poziție după navigare',()=>media(kind,{time:6}),async()=>{
      await b(player(),'Înainte 5 secunde').click();S.time=(await mediaState()).time;await H.select('doc-a');await save();await H.select(S.id);
    },async()=>{await H.wait(async()=>Math.abs((await mediaState()).time-Math.floor(S.time))<1.2);H.assert((await mediaState()).paused,'Position resumes without autoplay');H.assert(Math.abs(H.node(S.id).media.time-Math.floor(S.time))<=1,'Saved position matches resumed clock');});
  }
  add('video.fullscreen','Chromium video','full-screen și revenire',()=>media('video'),async()=>{
    await uaClick(/media-controls-fullscreen-button$/);await H.wait(()=>H.p.evaluate(()=>Boolean(document.fullscreenElement)));await H.p.keyboard.press('Escape');
  },async()=>{await H.wait(()=>H.p.evaluate(()=>!document.fullscreenElement));H.assert(await mv().getAttribute('data-kind')==='video','Fullscreen exit returns same video');});
  add('video.picture-in-picture','Chromium video','overflow / Picture-in-Picture / revenire',()=>media('video'),async()=>{
    await uaClick(/media-controls-overflow-menu-button$/);await uaClick(/media-controls-picture-in-picture-button$/);await H.wait(()=>H.p.evaluate(()=>Boolean(document.pictureInPictureElement)));
    await uaClick(/media-controls-overflow-menu-button$/);await uaClick(/media-controls-picture-in-picture-button$/);
  },async()=>{await H.wait(()=>H.p.evaluate(()=>!document.pictureInPictureElement));H.assert(await mediaEl().getAttribute('src')!==null,'PiP exit preserves video source');});

  // Web archive safety/content and source handoff, with no network or credentials.
  add('web.sandbox','WebArchiveView','sandbox, script blocat, link intern',()=>media('web'),async()=>H.p.frameLocator('.web-frame').getByRole('link',{name:'Înapoi la conținut',exact:true}).click(),async()=>{
    H.assert(await H.p.locator('.web-frame').getAttribute('sandbox')==='','Archive has maximally restrictive sandbox');H.assert(await H.p.frameLocator('.web-frame').locator('body').getAttribute('data-script-ran')===null,'Archive script was not executed');H.assert(await H.p.frameLocator('.web-frame').locator('#offline').textContent()==='Conținut offline verificat','Internal navigation retains content');H.assert(await mv().locator('h2').textContent()==='Media neutră web','Archive cannot navigate app');
  });
  for(const source of ['https://example.invalid/source','http://example.invalid/source','file:///C:/private.html','javascript:alert(1)',''])add('web.source.'+(source.startsWith('https')?'https':source.startsWith('http:')?'http':source.startsWith('file:')?'file':source.startsWith('javascript')?'javascript':'none'),'WebArchiveView','Adresa originală / URL eligibility',()=>media('web',{source}),async()=>{
    const link=H.p.locator('.web-archive').getByRole('link',{name:'Adresa originală',exact:true});if(/^https?:/.test(source))await link.click();else H.assert(await link.count()===0,'Unsafe/non-http source is not a control');
  },async()=>{const e=await H.effects();H.assert(/^https?:/.test(source)?e.some(x=>x.kind==='external-url'&&x.url===source):!e.some(x=>x.kind==='external-url'),'Only exact safe original URL handed to captured shell');H.assert(await H.p.frameLocator('.web-frame').locator('h1').textContent()==='Arhivă neutră locală','Source action preserves offline view');});

  // Quick Reference: opens read-only for main doc, editable elsewhere, tracks focus and lifecycle.
  const qr=()=>H.p.locator('.quickref').first();
  const openQr=async(id='doc-a',route='command')=>{
    await H.select(id);if(route==='native')await H.native(['Vizualizare','Quick Reference pentru documentul curent']);else if(route==='context'){
      await H.row(id).click({button:'right'});await H.shot('quickref-context-root');await H.p.locator('[data-group-id="binder.open"]').hover();await H.shot('quickref-context-open-submenu');await H.p.locator('.ctx-menu [data-command-id="quickRef"]').click();
    }else await H.command('quickRef');await H.wait(async()=>await qr().count()===1);
  };
  for(const route of ['command','native','context','shortcut'])add('quickref.open.'+route,'QuickRef','Deschide '+route,null,async()=>{
    if(route==='shortcut'){await H.p.keyboard.press('Control+Shift+r');await H.wait(async()=>await qr().count()===1);}else await openQr('doc-a',route);
  },async()=>{H.assert(await qr().getAttribute('aria-label')==='Quick Reference: Capitol verificat','QuickRef title owns correct document');H.assert((await qr().locator('.ProseMirror').textContent()).includes('Prima frază'),'QuickRef actual content');H.assert(await qr().locator('.ProseMirror').getAttribute('contenteditable')==='false','Main document reference read-only');H.assert(await focusWithin(qr()),'QuickRef receives focus');},{commands:['quickRef'],routes:route==='native'?[['Vizualizare','Quick Reference pentru documentul curent']]:[]});
  add('quickref.edit-save','QuickRef','editează document neactiv',async()=>{await openQr();await H.select('doc-b');},async()=>{
    await qr().locator('.ProseMirror').fill('Text QuickRef verificat');await save();
  },async()=>{await H.wait(()=>H.doc('doc-a').includes('Text QuickRef verificat'));H.assert(H.doc('doc-b').includes('Text separat'),'QuickRef writes its document, not main document');H.assert(await focusWithin(qr()),'Typing keeps QuickRef focus');});
  for(const state of ['main','locked','trash','file'])add('quickref.readonly.'+state,'QuickRef','protecție '+state,async()=>{
    if(state==='locked')await H.fixture(async pj=>{H.flat(pj.tree).find(n=>n.id==='doc-a').locked=true;});
    if(state==='file'){await media('image');await H.command('quickRef');await H.wait(async()=>await qr().count()===1);await H.select('doc-b');}
    else {await openQr(state==='trash'?'trashed-a':'doc-a');if(state!=='main')await H.select('doc-b');}
  },async()=>{S.before=H.doc(state==='trash'?'trashed-a':state==='file'?S.id:'doc-a');await qr().locator('.ProseMirror').click();await H.p.keyboard.type('NU TREBUIE SCRIS');await save();},async()=>{H.assert(await qr().locator('.ProseMirror').getAttribute('contenteditable')==='false','Protected reference not editable');H.assert(H.doc(state==='trash'?'trashed-a':state==='file'?S.id:'doc-a')===S.before,'Protected file unchanged');});
  for(const close of ['button','escape','open'])add('quickref.close.'+close,'QuickRef','Închide / Escape / Deschide',async()=>{await openQr();await H.select('doc-b');},async()=>{
    await qr().locator('.ProseMirror').click();if(close==='open')await b(qr(),'Deschide').click();else if(close==='escape')await H.p.keyboard.press('Escape');else await b(qr(),'Închide').click();
  },async()=>{await H.wait(async()=>await qr().count()===0);const text=await H.editor().textContent();H.assert(text.includes(close==='open'?'Prima frază':'Text separat'),'Close/open return correct main document');await H.editor().click();H.assert(await focusWithin(H.editor()),'Main editor can regain focus');});
  add('quickref.drag','QuickRef','trage titlul',()=>openQr(),async()=>{S.before=await qr().boundingBox();await drag(qr().locator('.quickref-head'));},async()=>{const r=await qr().boundingBox();H.assert(r.x>S.before.x&&r.y>S.before.y,'Panel position changes');H.assert((await qr().locator('.ProseMirror').textContent()).includes('Prima frază'),'Dragging preserves content');});
  add('quickref.multiple-deduplicate','QuickRef','mai multe documente / nu dublează',()=>openQr(),async()=>{await H.command('quickRef');H.assert(await H.p.locator('.quickref').count()===1,'Repeated command does not duplicate panel');await H.select('doc-b');await H.command('quickRef');},async()=>{H.assert(await H.p.locator('.quickref').count()===2,'Two distinct references');const labels=await H.p.locator('.quickref').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));H.assert(labels.includes('Quick Reference: Capitol verificat')&&labels.includes('Quick Reference: Al doilea document'),'Each panel owns its document');});

  // Floating Inspector: every default label/status, synopsis onBlur, rich notes, drag and exit.
  const fi=()=>H.p.locator('.floating-inspector');
  const openFi=async()=>{await H.command('composition');await H.command('floatInspector');await H.wait(async()=>await fi().count()===1);};
  for(const [key,values,index] of [['label',LABELS,0],['status',STATUSES,1]])for(const value of values)add('inspector.'+key+'.'+values.indexOf(value),'FloatingInspector',key+' '+value,openFi,async()=>fi().locator('select').nth(index).selectOption(value),async()=>{await save();H.assert(H.node('doc-a')[key]===value,'Exact inspector metadata persisted');H.assert(await fi().locator('select').nth(index).inputValue()===value,'Selected metadata rendered');H.assert((await fi().locator('.fi-head').textContent()).includes('Capitol verificat'),'Inspector keeps document context');});
  add('inspector.synopsis','FloatingInspector','Sinopsis / onBlur',openFi,async()=>{await fi().locator('textarea').fill('Sinopsis plutitor verificat');await fi().locator('select').first().focus();await save();},async()=>{H.assert(H.node('doc-a').synopsis==='Sinopsis plutitor verificat','Synopsis onBlur persisted');H.assert(H.doc('doc-a').includes('Prima frază'),'Synopsis does not replace document');});
  for(const format of ['plain','bold','italic','underline'])add('inspector.notes.'+format,'FloatingInspector','note document '+format,openFi,async()=>{
    const ed=fi().locator('.notes .ProseMirror');await ed.fill('Notă plutitoare '+format);if(format!=='plain'){await ed.click();await H.p.keyboard.press('Control+a');await H.p.keyboard.press('Control+'+({bold:'b',italic:'i',underline:'u'}[format]));}await save();
  },async()=>{await H.wait(()=>readNotes('doc-a').includes('Notă plutitoare '+format));const h=readNotes('doc-a');if(format!=='plain')H.assert(new RegExp({bold:'<(strong|b)',italic:'<(em|i)',underline:'<u'}[format]).test(h),'Notes formatting persisted');H.assert(H.doc('doc-a').includes('Prima frază'),'Note edits separate from document');});
  add('inspector.drag','FloatingInspector','trage / limite ecran',openFi,async()=>{S.before=await fi().boundingBox();await drag(fi().locator('.fi-head'),120,60);},async()=>{const r=await fi().boundingBox();H.assert(r.x>S.before.x&&r.y>S.before.y&&r.x>=0&&r.y>=0,'Inspector position changed within bounds');H.assert((await fi().locator('textarea').inputValue())==='Sinopsis A','Drag preserves synopsis');});
  for(const close of ['button','command','composition-exit'])add('inspector.close.'+close,'FloatingInspector','Închide '+close,openFi,async()=>{if(close==='button')await b(fi(),'Închide').click();else await H.command(close==='command'?'floatInspector':'composition');},async()=>{await H.wait(async()=>await fi().count()===0);H.assert((await H.editor().textContent()).includes('Prima frază'),'Closing inspector leaves document intact');if(close==='composition-exit')H.assert(!await H.p.locator('.app').evaluate(e=>e.classList.contains('composition')),'Composition exit restores normal app');},{commands:close==='command'?['floatInspector']:close==='composition-exit'?['composition']:[]});
  add('inspector.native','FloatingInspector','rută nativă',async()=>H.command('composition'),async()=>H.native(['Vizualizare','Inspector plutitor (compoziție)']),async()=>{H.assert((await fi().locator('.fi-head').textContent()).includes('Capitol verificat'),'Native callback opens current inspector');H.assert(await fi().locator('textarea').inputValue()==='Sinopsis A','Native inspector has real synopsis');},{commands:['floatInspector'],routes:[['Vizualizare','Inspector plutitor (compoziție)']]});

  // Scratchpad: the same controls are exercised separately in embedded and real standalone windows.
  const sp=()=>S.sp.locator('.scratchpad');
  const spSettings=async()=>settings();
  const openSp=async(mode,notes=SP_NOTES)=>{
    await H.settingsFixture({scratchFolder:'',scratchpad:JSON.parse(JSON.stringify(notes)),scratchOnTop:true,speechAutoInstall:false});
    await H.command('scratchpad');S.sp=H.p;await H.wait(async()=>await sp().count()===1&&await sp().locator('.sp-note').count()===notes.length);
    if(mode==='standalone'){const w=H.app.waitForEvent('window');await sp().locator('.sp-window').click();S.sp=await w;S.sp.setDefaultTimeout(5000);S.sp.on('dialog',d=>d.accept().catch(()=>{}));await S.sp.waitForSelector('.scratchpad.standalone');await H.wait(async()=>await sp().locator('.sp-note').count()===notes.length);await proof(S.sp,'before');}
  };
  const savedSp=async predicate=>H.wait(async()=>predicate((await spSettings()).scratchpad||[]));
  for(const mode of ['embedded','standalone']){
    const setup=()=>openSp(mode);
    add('scratch.'+mode+'.select','Scratchpad '+mode,'listă / selectare notă',setup,async()=>sp().locator('.sp-note').filter({hasText:'Nota neutră B'}).click(),async()=>{H.assert(await sp().locator('.sp-title').inputValue()==='Nota neutră B','Selected title');H.assert(await sp().locator('.sp-body').textContent()==='Beta neutru','Selected note content');H.assert((await spSettings()).scratchpad.length===2,'Selection not destructive');await proof(S.sp,'after');});
    for(const entry of ['plus','empty-button'])add('scratch.'+mode+'.add.'+entry,'Scratchpad '+mode,'Notă nouă '+entry,()=>openSp(mode,entry==='plus'?SP_NOTES:[]),async()=>{if(entry==='plus')await sp().locator('.sp-add').click();else await b(sp(),'Notă nouă').click();},async()=>{await savedSp(ns=>ns.length===(entry==='plus'?3:1));H.assert(await sp().locator('.sp-title').inputValue()==='Notă nouă','New note default title');H.assert(await sp().locator('.sp-body').textContent()==='','New note body empty');await proof(S.sp,'after');});
    add('scratch.'+mode+'.rename-body','Scratchpad '+mode,'Titlu / body / persistență',setup,async()=>{await sp().locator('.sp-title').fill('Notă editată verificată');await sp().locator('.sp-body').fill('Conținut Scratchpad verificat');},async()=>{
      await savedSp(ns=>ns.some(n=>n.id==='sp-a'&&n.title==='Notă editată verificată'&&n.html.includes('Conținut Scratchpad verificat')));H.assert(!H.doc('doc-a').includes('Conținut Scratchpad verificat'),'Scratch note independent of project');await sp().locator('.sp-note').filter({hasText:'Nota neutră B'}).click();await sp().locator('.sp-note').filter({hasText:'Notă editată verificată'}).click();H.assert((await sp().locator('.sp-body').textContent()).includes('Conținut Scratchpad verificat'),'Reselect reloads edited body');await proof(S.sp,'after');
    });
    for(const format of ['bold','italic','underline'])for(const route of ['button','shortcut'])add('scratch.'+mode+'.format.'+format+'.'+route,'Scratchpad '+mode,'Formatare '+format+'/'+route,setup,async()=>{
      await sp().locator('.sp-body').click();await S.sp.keyboard.press('Control+a');if(route==='button')await sp().locator('.sp-'+format).click();else await S.sp.keyboard.press('Control+'+({bold:'b',italic:'i',underline:'u'}[format]));
    },async()=>{const pattern=new RegExp({bold:'<(b|strong)(?:>| )',italic:'<(i|em)(?:>| )',underline:'<u(?:>| )'}[format]);await savedSp(ns=>pattern.test(ns.find(n=>n.id==='sp-a').html));H.assert(pattern.test(await sp().locator('.sp-body').innerHTML()),'Rich formatting in actual contentEditable HTML');await proof(S.sp,'after');});
    for(const format of ['bold','italic','underline'])for(const route of ['button','shortcut'])add('scratch.'+mode+'.format-off.'+format+'.'+route,'Scratchpad '+mode,'Elimină formatare '+format+'/'+route,()=>{
      const tag={bold:'b',italic:'i',underline:'u'}[format];return openSp(mode,[{...SP_NOTES[0],html:'<p><'+tag+'>Alpha neutru</'+tag+'></p>'},SP_NOTES[1]]);
    },async()=>{await sp().locator('.sp-body').click();await S.sp.keyboard.press('Control+a');if(route==='button')await sp().locator('.sp-'+format).click();else await S.sp.keyboard.press('Control+'+({bold:'b',italic:'i',underline:'u'}[format]));},async()=>{
      const pattern=new RegExp({bold:'<(b|strong)(?:>| )',italic:'<(i|em)(?:>| )',underline:'<u(?:>| )'}[format]);await savedSp(ns=>!pattern.test(ns.find(n=>n.id==='sp-a').html));H.assert(await sp().locator('.sp-body').textContent()==='Alpha neutru','Removing format preserves note text');H.assert(!pattern.test(await sp().locator('.sp-body').innerHTML()),'Formatting removed from editable body');await proof(S.sp,'after');
    });
    add('scratch.'+mode+'.delete','Scratchpad '+mode,'Șterge notă / confirm fixture',setup,async()=>sp().locator('.sp-note').filter({hasText:'Nota neutră A'}).getByRole('button').click(),async()=>{await savedSp(ns=>ns.length===1&&ns[0].id==='sp-b');H.assert(await sp().locator('.sp-title').inputValue()==='Nota neutră B','Delete selects surviving note');H.assert(await sp().locator('.sp-note').count()===1,'Removed from rendered list');await proof(S.sp,'after');});
    add('scratch.'+mode+'.delete-cancel','Scratchpad '+mode,'Șterge / Anulează confirm',setup,async()=>{
      const listeners=S.sp.listeners('dialog');S.sp.removeAllListeners('dialog');const cancel=d=>d.dismiss();S.sp.on('dialog',cancel);
      try{await sp().locator('.sp-note').filter({hasText:'Nota neutră A'}).getByRole('button').click();}finally{S.sp.removeListener('dialog',cancel);listeners.forEach(fn=>S.sp.on('dialog',fn));}
    },async()=>{H.assert((await spSettings()).scratchpad.length===2,'Cancel leaves persisted notes intact');H.assert(await sp().locator('.sp-note').count()===2,'Cancel leaves rendered notes intact');H.assert(await sp().locator('.sp-title').inputValue()==='Nota neutră A','Cancel leaves selection intact');await proof(S.sp,'after');});
    add('scratch.'+mode+'.delete-last','Scratchpad '+mode,'Șterge ultima notă / stare goală',()=>openSp(mode,[SP_NOTES[0]]),async()=>sp().locator('.sp-note').getByRole('button').click(),async()=>{await savedSp(ns=>ns.length===0);H.assert(await sp().locator('.sp-title').count()===0&&await sp().locator('.sp-body').count()===0,'Last note deletion removes editable body');H.assert(await b(sp(),'Notă nouă').isVisible(),'Empty state offers new note');await proof(S.sp,'after');});
    add('scratch.'+mode+'.empty-export-disabled','Scratchpad '+mode,'Exportă toate opțiunile disabled fără note',()=>openSp(mode,[]),async()=>sp().locator('.sp-export').focus(),async()=>{const opts=await sp().locator('.sp-export option').evaluateAll(es=>es.map(e=>({value:e.value,disabled:e.disabled})));H.assert(opts.filter(e=>e.value).length===3&&opts.filter(e=>e.value).every(e=>e.disabled),'HTML/TXT/all export unavailable when empty');H.assert(await sp().locator('.sp-import').isEnabled(),'Import remains available');H.assert((await spSettings()).scratchpad.length===0,'Opening empty export does not manufacture note');await proof(S.sp,'after');});
    for(const ext of ['txt','md','html','htm'])add('scratch.'+mode+'.import.'+ext,'Scratchpad '+mode,'Importă '+ext,setup,async()=>{
      const file=path.join(H.W,'Import-neutru-'+ext+'.'+ext);fs.writeFileSync(file,ext==='html'||ext==='htm'?'<html><body><p>Import neutru <strong>formatat</strong></p><script>BAD</script></body></html>':'Import neutru\nA doua linie');const choose=S.sp.waitForEvent('filechooser');await sp().locator('.sp-import').click();await (await choose).setFiles(file);
    },async()=>{await savedSp(ns=>ns.length===3&&ns[0].title==='Import-neutru-'+ext&&ns[0].html.includes('Import neutru'));H.assert((await sp().locator('.sp-body').textContent()).includes('Import neutru'),'Imported content visible');const ns=(await spSettings()).scratchpad;H.assert(!/<script/i.test(ns[0].html),'Imported HTML sanitized');await proof(S.sp,'after');});
    add('scratch.'+mode+'.import-multiple','Scratchpad '+mode,'import multiple fișiere',setup,async()=>{
      const files=['one','two'].map(n=>{const f=path.join(H.W,'neutru-'+n+'.txt');fs.writeFileSync(f,'Fișier '+n);return f;});const choose=S.sp.waitForEvent('filechooser');await sp().locator('.sp-import').click();await (await choose).setFiles(files);
    },async()=>{await savedSp(ns=>ns.length===4&&ns[0].title==='neutru-one'&&ns[1].title==='neutru-two');H.assert(await sp().locator('.sp-title').inputValue()==='neutru-one','Multiple import selects first input');await proof(S.sp,'after');});
    add('scratch.'+mode+'.import-cancel','Scratchpad '+mode,'Importă / selecție goală',setup,async()=>{const choose=S.sp.waitForEvent('filechooser');await sp().locator('.sp-import').click();await (await choose).setFiles([]);},async()=>{H.assert((await spSettings()).scratchpad.length===2,'Empty file selection imports nothing');H.assert(await sp().locator('.sp-title').inputValue()==='Nota neutră A','Cancelled import retains selected note');H.assert(await sp().locator('.sp-body').textContent()==='Alpha neutru','Cancelled import retains body');await proof(S.sp,'after');});
    add('scratch.'+mode+'.append-no-document','Scratchpad '+mode,'append fără document selectat',setup,async()=>{
      await H.select('folder-a');if(mode==='standalone'){await sp().locator('.sp-mode').selectOption('append');await sp().locator('.sp-send-btn').click();}else await sp().locator('.sp-mode').focus();
    },async()=>{if(mode==='embedded')H.assert(await sp().locator('.sp-mode option[value=append]').evaluate(e=>e.disabled),'Append option disabled for folder selection');else await H.wait(async()=>await H.p.getByText('Selectează întâi un document.',{exact:true}).count()>0);H.assert(!H.doc('doc-a').includes('Alpha neutru')&&!H.doc('doc-b').includes('Alpha neutru'),'No-document append changes neither fixture doc');H.assert(H.node('folder-a').children.length===2,'No-document append does not create a new document');await proof(S.sp,'after');});
    for(const kind of ['html','txt','all'])add('scratch.'+mode+'.export.'+kind,'Scratchpad '+mode,'Exportă '+kind,setup,async()=>download(S.sp,()=>sp().locator('.sp-export').selectOption(kind)),async()=>{
      const text=S.downloadBytes.toString('utf8');H.assert(text.includes('Alpha neutru'),'Export contains chosen note content');H.assert(kind==='all'?text.includes('Beta neutru')&&!/script/i.test(text):!text.includes('Beta neutru'),'Selected/all export scope');if(kind==='txt')H.assert(!/<p|<html/.test(text),'TXT contains plain text');else H.assert(/<p/.test(text),'HTML contains formatted body');H.assert(S.downloadName.endsWith(kind==='txt'?'.txt':'.html'),'Export extension');await proof(S.sp,'after');
    });
    for(const sendMode of ['new','append'])add('scratch.'+mode+'.send.'+sendMode,'Scratchpad '+mode,'În proiect / '+sendMode,setup,async()=>{
      await sp().locator('.sp-mode').selectOption(sendMode);if(mode==='embedded'&&sendMode==='new')await sp().locator('.sp-dest').selectOption('folder-a');
      if(mode==='standalone'){const target=sp().locator('.sp-send select').first();const targets=await target.locator('option').allTextContents();H.assert(targets.length===1&&targets[0]===path.basename(H.dir).replace(/\.scribner$/i,''),'Exact fixture project title is destination');const wc=await H.app.evaluate(({BrowserWindow},id)=>BrowserWindow.fromId(id).webContents.id,H.windowId);H.assert(await target.inputValue()===String(wc),'Exact primary webContents target');}
      await sp().locator('.sp-send-btn').click();await save();
    },async()=>{
      if(sendMode==='append'){await H.wait(()=>H.doc('doc-a').includes('Alpha neutru'));H.assert(H.doc('doc-a').includes('Prima frază'),'Append preserves old doc');}
      else{await H.wait(()=>H.flat(H.project().tree).some(n=>n.title==='Nota neutră A'));const pj=H.project(),n=H.flat(pj.tree).find(n=>n.title==='Nota neutră A');H.assert(H.doc(n.id).includes('Alpha neutru'),'New project doc contains note HTML');if(mode==='embedded')H.assert(H.node('folder-a',pj).children.some(c=>c.id===n.id),'Exact selected destination folder');else H.assert(pj.tree.find(n=>n.root==='research').children.some(c=>c.id===n.id),'Standalone new doc reaches Research fallback');}
      H.assert((await spSettings()).scratchpad.some(n=>n.id==='sp-a'),'Send does not delete scratch note');await proof(S.sp,'after');
    });
    add('scratch.'+mode+'.folder-choose-clear','Scratchpad '+mode,'Dosar / transfer / clear',setup,async()=>{
      S.folder=path.join(H.W,'scratch-folder-'+H.currentCase);fs.mkdirSync(S.folder,{recursive:true});fs.writeFileSync(path.join(S.folder,'Existenta.html'),'<html><body><p>Existent neutru</p></body></html>');fs.writeFileSync(path.join(S.folder,'keep.txt'),'Fișier neutru neadministrat');await H.answer(S.folder);await sp().locator('.sp-folder').click();await H.wait(()=>fs.existsSync(path.join(S.folder,'Nota neutră A.html')));H.assert(fs.readFileSync(path.join(S.folder,'Existenta.html'),'utf8').includes('Existent neutru'),'Existing folder note merged');await sp().locator('.sp-folder').click();
    },async()=>{H.assert((await spSettings()).scratchFolder==='','Clear removes settings folder binding');const ns=(await spSettings()).scratchpad;H.assert(ns.some(n=>n.html.includes('Existent neutru'))&&ns.some(n=>n.title==='Nota neutră A'),'Clear keeps merged notes in settings');H.assert(fs.readFileSync(path.join(S.folder,'keep.txt'),'utf8')==='Fișier neutru neadministrat','Unmanaged file preserved');await proof(S.sp,'after');});
    add('scratch.'+mode+'.folder-cancel','Scratchpad '+mode,'Dosar / anulare dialog',setup,async()=>sp().locator('.sp-folder').click(),async()=>{H.assert((await spSettings()).scratchFolder==='','Cancelled folder dialog changes no binding');H.assert((await spSettings()).scratchpad.length===2,'Cancelled dialog preserves notes');const e=await H.effects();H.assert(e.some(x=>x.kind==='open-dialog'&&!x.answered),'Dialog cancellation passed through native adapter');await proof(S.sp,'after');});
    add('scratch.'+mode+'.folder-rename-delete','Scratchpad '+mode,'fișiere dosar / redenumire / ștergere',setup,async()=>{
      S.folder=path.join(H.W,'scratch-delete-'+H.currentCase);fs.mkdirSync(S.folder,{recursive:true});await H.answer(S.folder);await sp().locator('.sp-folder').click();await H.wait(()=>fs.existsSync(path.join(S.folder,'Nota neutră A.html')));await sp().locator('.sp-title').fill('Redenumită neutră');await H.wait(()=>fs.existsSync(path.join(S.folder,'Redenumită neutră.html'))&&!fs.existsSync(path.join(S.folder,'Nota neutră A.html')));await sp().locator('.sp-note').filter({hasText:'Redenumită neutră'}).getByRole('button').click();
    },async()=>{await H.wait(()=>!fs.existsSync(path.join(S.folder,'Redenumită neutră.html')));H.assert(fs.readFileSync(path.join(S.folder,'Nota neutră B.html'),'utf8').includes('Beta neutru'),'Delete removes only selected managed file');H.assert(await sp().locator('.sp-note').count()===1,'Folder deletion reflected in list');await proof(S.sp,'after');});
    add('scratch.'+mode+'.folder-duplicate-names','Scratchpad '+mode,'coliziuni nume fișiere',()=>openSp(mode,[SP_NOTES[0],{...SP_NOTES[1],title:SP_NOTES[0].title}]),async()=>{
      S.folder=path.join(H.W,'scratch-duplicates-'+H.currentCase);fs.mkdirSync(S.folder,{recursive:true});await H.answer(S.folder);await sp().locator('.sp-folder').click();
    },async()=>{await H.wait(()=>fs.existsSync(path.join(S.folder,'Nota neutră A 2.html')));H.assert(fs.readFileSync(path.join(S.folder,'Nota neutră A.html'),'utf8').includes('Alpha neutru'),'First colliding note survives');H.assert(fs.readFileSync(path.join(S.folder,'Nota neutră A 2.html'),'utf8').includes('Beta neutru'),'Second note gets unique filename');await proof(S.sp,'after');});
  }
  // All destination folders in this deterministic fixture, including trash, are actionable UI choices.
  for(const dest of ['draft','folder-a','research','template-folder','trash'])add('scratch.destination.'+dest,'Scratchpad embedded','Dosarul de destinație '+dest,()=>openSp('embedded'),async()=>{
    const id={draft:H.roots.draft,research:H.roots.research,trash:H.roots.trash}[dest]||dest;S.dest=id;await sp().locator('.sp-dest').selectOption(id);await sp().locator('.sp-send-btn').click();await save();
  },async()=>{const n=H.node(S.dest).children.find(n=>n.title==='Nota neutră A');H.assert(n&&H.doc(n.id).includes('Alpha neutru'),'Note created inside exact enumerable destination');});
  add('scratch.embedded.drag-close','Scratchpad embedded','trage / Închide',()=>openSp('embedded'),async()=>{S.before=await sp().boundingBox();await drag(sp().locator(':scope > div').first(),80,40);S.after=await sp().boundingBox();await b(sp(),'Închide').click();},async()=>{H.assert(S.after.x>S.before.x&&S.after.y>S.before.y,'Embedded scratch drag changes position');H.assert(await H.p.locator('.scratchpad').count()===0,'Close removes panel');H.assert((await spSettings()).scratchpad.length===2,'Close preserves notes');});
  add('scratch.embedded.reopen-persistence','Scratchpad embedded','închide/redeschide reîncarcă setările salvate',()=>openSp('embedded'),async()=>{
    await sp().locator('.sp-title').fill('Notă persistentă embedded');await sp().locator('.sp-body').fill('Conținut persistent embedded');await savedSp(ns=>ns[0].title==='Notă persistentă embedded'&&ns[0].html.includes('Conținut persistent embedded'));await b(sp(),'Închide').click();await H.command('scratchpad');await H.wait(async()=>await sp().locator('.sp-title').count()===1);
  },async()=>{H.assert(await sp().locator('.sp-title').inputValue()==='Notă persistentă embedded','Reopened embedded pad uses saved title, not stale props');H.assert((await sp().locator('.sp-body').textContent()).includes('Conținut persistent embedded'),'Reopened embedded pad uses saved HTML');H.assert(H.doc('doc-a').includes('Prima frază'),'Pad persistence independent of project document');});
  add('scratch.native','Scratchpad embedded','Ciorne (Scratchpad) / rută nativă',async()=>H.settingsFixture({scratchFolder:'',scratchpad:SP_NOTES}),async()=>H.native(['Unelte','Ciorne (Scratchpad)']),async()=>{H.assert(await H.p.locator('.scratchpad .sp-title').inputValue()==='Nota neutră A','Native route selects persisted note');H.assert(await H.p.locator('.scratchpad .sp-body').textContent()==='Alpha neutru','Native route loads real settings content');},{commands:['scratchpad'],routes:[['Unelte','Ciorne (Scratchpad)']]});
  for(const on of [false,true])add('scratch.standalone.ontop.'+on,'Scratchpad standalone','Mereu deasupra '+on,()=>openSp('standalone'),async()=>{if(on){await sp().getByRole('checkbox').uncheck();await H.wait(async()=>!(await spSettings()).scratchOnTop);}await sp().getByRole('checkbox').setChecked(on);},async()=>{H.assert((await spSettings()).scratchOnTop===on,'Always-on-top preference persisted');const w=await H.app.browserWindow(S.sp);H.assert(await w.evaluate(w=>w.isAlwaysOnTop())===on,'Real native window topmost flag');await proof(S.sp,'after');});
  add('scratch.standalone.reuse','Scratchpad standalone','⧉ / reutilizare / focus',()=>openSp('standalone'),async()=>{
    S.count=(await H.app.windows()).length;await H.command('scratchpad');await H.p.locator('.scratchpad .sp-window').click();
  },async()=>{H.assert((await H.app.windows()).length===S.count,'Opening again reuses same scratch window');const w=await H.app.browserWindow(S.sp);H.assert(await w.evaluate(w=>w.isFocused()),'Existing scratch window focused');H.assert(await H.p.locator('.scratchpad').count()===0,'Embedded panel closed after successful handoff');await proof(S.sp,'after');});
  add('scratch.standalone.close-reopen','Scratchpad standalone','închidere OS / reopen păstrează notele',()=>openSp('standalone'),async()=>{
    await sp().locator('.sp-body').fill('Notă standalone păstrată');await savedSp(ns=>ns[0].html.includes('Notă standalone păstrată'));const w=await H.app.browserWindow(S.sp);await w.evaluate(w=>w.close());await H.wait(()=>S.sp.isClosed());await H.command('scratchpad');const next=H.app.waitForEvent('window');await H.p.locator('.scratchpad .sp-window').click();S.sp=await next;await S.sp.waitForSelector('.sp-body');
  },async()=>{H.assert((await sp().locator('.sp-body').textContent()).includes('Notă standalone păstrată'),'Native window reopen restores saved body');H.assert(H.doc('doc-a').includes('Prima frază'),'Scratch lifecycle leaves project untouched');await proof(S.sp,'after');});

  // Copyholder as a secondary in-app editor surface.
  const copy=()=>H.p.locator('.copyholder');
  const openCopy=async()=>{await H.command('copyholder');await H.select('doc-b');await H.wait(async()=>await copy().count()===1);};
  add('copyholder.readonly','Copyholder','referință readonly',openCopy,async()=>{S.before=H.doc('doc-a');await copy().locator('.ProseMirror').click();await H.p.keyboard.type('NEPERMIS');await save();},async()=>{H.assert(await copy().locator('.ProseMirror').getAttribute('contenteditable')==='false','Default copyholder readonly');H.assert(H.doc('doc-a')===S.before,'Read-only target unchanged');H.assert((await copy().locator('.pane-head').textContent()).includes('Capitol verificat'),'Copyholder target title');},{commands:['copyholder']});
  add('copyholder.editable','Copyholder','Editabil / sincronizare',openCopy,async()=>{await copy().getByRole('checkbox').check();await copy().locator('.ProseMirror').fill('Editare referință verificată');await save();},async()=>{await H.wait(()=>H.doc('doc-a').includes('Editare referință verificată'));H.assert(H.doc('doc-b').includes('Text separat'),'Copyholder writes correct non-main document');await copy().getByRole('checkbox').uncheck();H.assert(await copy().locator('.ProseMirror').getAttribute('contenteditable')==='false','Can restore read-only');});
  for(const close of ['button','command','open-main'])add('copyholder.close.'+close,'Copyholder','Închide / Deschide în principal '+close,openCopy,async()=>{
    if(close==='command')await H.command('copyholderClose');else await b(copy(),close==='button'?'Închide':'Deschide în principal').click();
  },async()=>{if(close!=='open-main')H.assert(await copy().count()===0,'Copyholder closed');H.assert((await H.editor().textContent()).includes(close==='open-main'?'Prima frază':'Text separat'),'Return context correct');},{commands:close==='command'?['copyholderClose']:[]});

  // Real secondary BrowserWindow, separate fixture project, native callbacks and unsaved handshake.
  const winId=async p=>(await H.app.browserWindow(p)).evaluate(w=>w.id);
  const nativeAt=async(p,route)=>{
    const id=await winId(p);const result=await H.app.evaluate(({BrowserWindow},{id,route})=>{
      let m=global.__qaMenus.get(id),it;for(const label of route){it=m?.items.find(x=>x.label===label);if(!it)return false;m=it.submenu;}if(!it.enabled)return false;it.click(undefined,BrowserWindow.fromId(id));return true;
    },{id,route});H.assert(result,'Secondary native route '+route.join(' > '));
  };
  const openWindow=async(withProject=true,route='command')=>{
    const next=H.app.waitForEvent('window');if(route==='native')await H.native(['Fereastră','Fereastră nouă']);else await H.command('newWindow');S.window=await next;S.window.setDefaultTimeout(5000);await S.window.waitForSelector('text=Proiect nou');
    if(withProject){S.projectDir=path.join(H.W,'secondary-'+H.currentCase+'.scribner');fs.mkdirSync(path.join(S.projectDir,'docs'),{recursive:true});fs.mkdirSync(path.join(S.projectDir,'notes'),{recursive:true});const pj=JSON.parse(JSON.stringify(H.project()));pj.title='Proiect media secundar';fs.writeFileSync(path.join(S.projectDir,'project.json'),JSON.stringify(pj,null,2));for(const [rel,text]of Object.entries(H.files)){const f=path.join(S.projectDir,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,text);}await H.answer(S.projectDir);await S.window.getByRole('button',{name:/^Deschide un proiect/}).first().click();await S.window.waitForSelector('.binder');await S.window.locator('.binder [data-node-id="doc-a"]').click();await S.window.waitForSelector('.pane .ProseMirror');}
    await proof(S.window,'before');
  };
  for(const route of ['command','native'])add('window.new.'+route,'Secondary BrowserWindow','Fereastră nouă/'+route,null,async()=>openWindow(true,route),async()=>{
    H.assert((await S.window.locator('.pane .ProseMirror').first().textContent()).includes('Prima frază'),'Secondary project content');H.assert((await S.window.evaluate(()=>window.api.getSettings())).recent.some(x=>path.resolve(x.dir)===path.resolve(S.projectDir)),'Secondary exact project path in settings');H.assert(H.doc('doc-a').includes('Prima frază'),'Main project remains intact');H.assert((await H.app.windows()).length===2,'Real separate native window');await proof(S.window,'after');
  },{commands:['newWindow'],routes:route==='native'?[['Fereastră','Fereastră nouă']]:[]});
  add('window.existing-project-focus','Secondary BrowserWindow','Deschide proiect deja deschis',()=>openWindow(false),async()=>{await H.answer(H.dir);await S.window.getByRole('button',{name:/^Deschide un proiect/}).first().click();},async()=>{
    H.assert(await S.window.locator('.binder').count()===0,'Existing project not opened twice');H.assert(await S.window.getByRole('button',{name:/^Deschide un proiect/}).count()>0,'Secondary stays welcome screen');const w=await H.app.browserWindow(H.p);await H.wait(()=>w.evaluate(w=>w.isFocused()));H.assert(H.doc('doc-a').includes('Prima frază'),'Existing owner project unchanged');await proof(S.window,'after');
  });
  add('window.independent-save','Secondary BrowserWindow','editează / Ctrl+S',()=>openWindow(),async()=>{await S.window.locator('.pane .ProseMirror').first().fill('Document secundar salvat');await S.window.keyboard.press('Control+s');},async()=>{
    await H.wait(()=>fs.readFileSync(path.join(S.projectDir,'docs','doc-a.html'),'utf8').includes('Document secundar salvat'));H.assert(!H.doc('doc-a').includes('Document secundar salvat'),'Secondary save never overwrites main project');await proof(S.window,'after');},{commands:['save']});
  for(const action of ['minimize','maximize','fullScreen'])add('window.'+action,'Secondary BrowserWindow','control nativ '+action,()=>openWindow(),async()=>{
    const w=await H.app.browserWindow(S.window);S.windowHandle=w;
    if(action==='fullScreen'){await nativeAt(S.window,['Fereastră','Ecran complet']);await H.wait(()=>w.evaluate(w=>w.isFullScreen()));await nativeAt(S.window,['Fereastră','Ecran complet']);}
    else if(action==='maximize'){S.max=await w.evaluate(w=>w.isMaximized());await nativeAt(S.window,['Fereastră','Mărește / Restaurează']);await H.wait(()=>w.evaluate(w=>w.isMaximized()).then(v=>v!==S.max));await nativeAt(S.window,['Fereastră','Mărește / Restaurează']);}
    else{await nativeAt(S.window,['Fereastră','Minimizează']);await H.wait(()=>w.evaluate(w=>w.isMinimized()));await w.evaluate(w=>w.restore());}
  },async()=>{H.assert(await S.windowHandle.evaluate(w=>w.isMinimized())===false,'Window restored/not minimized');if(action==='fullScreen')await H.wait(()=>S.windowHandle.evaluate(w=>!w.isFullScreen()));if(action==='maximize')H.assert(await S.windowHandle.evaluate(w=>w.isMaximized())===S.max,'Maximize restored initial state');H.assert((await S.window.locator('.pane .ProseMirror').first().textContent()).includes('Prima frază'),'Window transitions preserve content');await proof(S.window,'after');},{commands:action==='fullScreen'?['fullScreen']:[],routes:[['Fereastră',action==='minimize'?'Minimizează':action==='maximize'?'Mărește / Restaurează':'Ecran complet']]});
  for(const choice of ['Anulează','Renunță','Salvează'])add('window.unsaved.'+choice,'Secondary BrowserWindow','închidere OS / '+choice,async()=>{await H.settingsFixture({autosaveSec:120});await openWindow();},async()=>{
    S.old=fs.readFileSync(path.join(S.projectDir,'docs','doc-a.html'),'utf8');await S.window.locator('.pane .ProseMirror').first().fill('MODIFICARE SECUNDARĂ NEUTRĂ');const w=await H.app.browserWindow(S.window);await w.evaluate(w=>w.close());await S.window.waitForSelector('.unsaved-dialog');await proof(S.window,'prompt');await b(S.window.locator('.unsaved-dialog'),choice).click();
  },async()=>{
    if(choice==='Anulează'){H.assert(!S.window.isClosed(),'Cancel keeps native window open');H.assert((await S.window.locator('.pane .ProseMirror').first().textContent()).includes('MODIFICARE SECUNDARĂ NEUTRĂ'),'Cancel keeps unsaved buffer');H.assert(fs.readFileSync(path.join(S.projectDir,'docs','doc-a.html'),'utf8')===S.old,'Cancel has not persisted buffer');await proof(S.window,'after');}
    else{await H.wait(()=>S.window.isClosed());const text=fs.readFileSync(path.join(S.projectDir,'docs','doc-a.html'),'utf8');H.assert(choice==='Salvează'?text.includes('MODIFICARE SECUNDARĂ NEUTRĂ'):text===S.old,'Save/discard exact file result');}
    H.assert(!H.doc('doc-a').includes('MODIFICARE SECUNDARĂ NEUTRĂ'),'Main project unaffected by secondary close');
  });

  // MiniPlayer: safe idle, every range value and all live voice choices; system reading only.
  const mini=()=>H.p.locator('.mini-player');
  const openMini=async()=>{await H.settingsFixture({speechAutoInstall:false});await H.command('speech');await H.wait(async()=>await mini().count()===1);};
  add('mini.idle','MiniPlayer','controale inactive / fără înregistrare',openMini,async()=>{await mini().click({position:{x:5,y:5}});},async()=>{
    H.assert(await b(mini(),'Pauză').isDisabled(),'Read pause disabled while idle');H.assert(await b(mini(),'Oprește').isDisabled(),'Read stop disabled while idle');H.assert(await H.p.evaluate(()=>!window.__dictationActive()),'No actual microphone recording');H.assert(await mini().locator('meter').count()===0,'No meter/timer without recording');H.assert(await mini().locator('.mini-mic').count()===1,'Mic control present but not invoked');
  },{expected:'Stare idle sigură, fără microfon pornit; controalele dictării active rămân explicit neacoperite.'});
  for(const rate of [0.6,0.7,0.8,0.9,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8])add('mini.rate.'+rate,'MiniPlayer','Viteză '+rate,openMini,async()=>range(H.p,mini().getByRole('slider',{name:'Viteză',exact:true}),rate),async()=>{
    const slider=mini().getByRole('slider',{name:'Viteză',exact:true});H.assert(Math.abs(Number(await slider.inputValue())-rate)<0.01,'Exact speed range value');H.assert((await slider.getAttribute('title')).includes(rate.toFixed(1)+'×'),'Speed title displays chosen multiplier');H.assert(await b(mini(),'Oprește').isDisabled(),'Changing speed does not start reading');
  });
  add('mini.voices-all','MiniPlayer','toate opțiunile vocilor prezente',openMini,async()=>{
    S.voiceOptions=await mini().getByRole('combobox',{name:'Voce',exact:true}).locator('option').evaluateAll(es=>es.map(e=>({value:e.value,label:e.textContent})));H.assert(S.voiceOptions.length>0,'At least one runtime voice option (otherwise explicit failure)');
    for(const [i,v]of S.voiceOptions.entries()){await mini().getByRole('combobox',{name:'Voce',exact:true}).selectOption(v.value);H.assert(await mini().getByRole('combobox',{name:'Voce',exact:true}).inputValue()===v.value,'Every voice option selected: '+v.label);H.assert(await b(mini(),'Oprește').isDisabled(),'Voice switch resets reader: '+v.label);await H.shot('mini-voice-'+i);}
  },async()=>{H.assert(S.voiceOptions.length>0,'All enumerated runtime voice choices exercised individually');H.assert(await H.p.evaluate(()=>!window.__dictationActive()),'No recording during voice traversal');},{expected:'Fiecare voce disponibilă este selectată și asertată individual, cu screenshot per opțiune. Numărul este dependent de sistem, nu cazuri statice inventate.'});
  add('mini.read-empty','MiniPlayer','Citește / document gol',async()=>{await H.fixture(async(pj,files)=>{files['docs/doc-a.html']='<p></p>';});await H.command('speech');},async()=>b(mini(),'Citește').click(),async()=>{
    await H.wait(async()=>(await mini().locator('.mini-msg').textContent()).includes('Nu există text de citit'));H.assert(await b(mini(),'Oprește').isDisabled(),'Empty text does not start synthesis');H.assert(!await H.p.evaluate(()=>speechSynthesis.speaking),'System engine not speaking');
  });
  add('mini.system-read-pause-resume-stop','MiniPlayer','Citește / Pauză / reia / Oprește',async()=>{
    await H.settingsFixture({speechAutoInstall:false});await H.fixture(async(pj,files)=>{files['docs/doc-a.html']='<p>'+Array(80).fill('Acesta este un text neutru pentru verificarea citirii.').join(' ')+'</p>';});await H.command('speech');
  },async()=>{
    const voice=mini().getByRole('combobox',{name:'Voce',exact:true});await H.wait(async()=>await voice.locator('option').count()>0);const options=await voice.locator('option').evaluateAll(es=>es.map(e=>e.value));const system=options.find(v=>v&&v!=='speechify');if(!system){H.limit('system-voice-unavailable','Nu există voce de sistem: citirea/pauza/reluarea/stop nu pot fi verificate fără instalare sau servicii.');throw Error('No system TTS voice available');}await voice.selectOption(system);await b(mini(),'Citește').click();await H.wait(()=>H.p.evaluate(()=>speechSynthesis.speaking));await H.wait(async()=>!(await b(mini(),'Pauză').isDisabled()));await b(mini(),'Pauză').click();await H.wait(()=>H.p.evaluate(()=>speechSynthesis.paused));await b(mini(),'Citește').click();await H.wait(()=>H.p.evaluate(()=>speechSynthesis.speaking&&!speechSynthesis.paused));await b(mini(),'Oprește').click();
  },async()=>{await H.wait(()=>H.p.evaluate(()=>!speechSynthesis.speaking));H.assert(await b(mini(),'Pauză').isDisabled()&&await b(mini(),'Oprește').isDisabled(),'Stop returns UI and actual system engine to idle');H.assert(!await H.p.evaluate(()=>window.__dictationActive()),'Reading never starts microphone');},{expected:'Stările reale speechSynthesis.speaking/paused urmăresc play/pause/resume/stop. Numai text neutru și voce de sistem, fără cloud/Mihai/download.'});
  add('mini.drag-position','MiniPlayer','trage / memorie poziție',openMini,async()=>{S.before=await mini().boundingBox();await drag(mini().locator('.mini-head'),-120,-80);S.after=await mini().boundingBox();await b(mini(),'Închide').click();await H.command('speech');},async()=>{
    const r=await mini().boundingBox();H.assert(S.after.x!==S.before.x||S.after.y!==S.before.y,'Mini drag changes position');const pos=await H.p.evaluate(()=>JSON.parse(localStorage.getItem('pneuma-miniplayer-pos')));H.assert(pos&&Math.abs(r.x-pos.x)<2&&Math.abs(r.y-pos.y)<2,'Reopen uses persisted dragged position');H.assert(await b(mini(),'Oprește').isDisabled(),'Reopened player is idle');
  });
  for(const close of ['button','command'])add('mini.close.'+close,'MiniPlayer','închide '+close,openMini,async()=>{if(close==='button')await b(mini(),'Închide').click();else await H.command('speech');},async()=>{H.assert(await mini().count()===0,'Mini closed/unmounted');H.assert(!await H.p.evaluate(()=>speechSynthesis.speaking),'Unmount stops actual system reading');H.assert((await H.editor().textContent()).includes('Prima frază'),'Close preserves main document');},{commands:close==='command'?['speech']:[]});
  add('mini.native','MiniPlayer','rută nativă voce',async()=>H.settingsFixture({speechAutoInstall:false}),async()=>H.native(['Unelte','Mini-player voce: dictare și citire']),async()=>{H.assert(await mini().getAttribute('aria-label')==='Voce','Native callback opens voice surface');H.assert(await b(mini(),'Oprește').isDisabled(),'Native-opened voice reader idle');},{commands:['speech'],routes:[['Unelte','Mini-player voce: dictare și citire']]});
};

// Source inventory + limitations reused by the static registration-only catalog builder.
module.exports.catalog = {
  domain:'Media și ferestre secundare',
  method:'H.test registration; isolated neutral project -> real renderer/native callback -> exact assertions -> screenshots. No run performed by this module.',
  sources:['AGENTS.md','src/components/ImageViewer.jsx','src/components/PdfViewer.jsx','src/components/MediaView.jsx','src/components/MediaPlayerView.jsx','src/components/WebArchiveView.jsx','src/components/QuickRef.jsx','src/components/FloatingInspector.jsx','src/components/Scratchpad.jsx','src/components/MiniPlayer.jsx','src/components/Inspector.jsx','src/components/Editor.jsx','src/components/ContextMenu.jsx','src/App.jsx','src/main.jsx','src/lib/commands.js','src/lib/menuLayout.js','src/lib/binderContextMenu.js','src/lib/researchMedia.js','src/lib/editorMenus.js','lib/store.cjs','electron/main.cjs','electron/smallWindowHandlers.cjs','tests/e2e/full-app-harness.cjs'],
  fixture_inputs:['image.png','neutral.webm','silence.wav','generated in-memory valid 3-page PDF','generated local sandbox HTML','neutral scratch notes and temporary secondary project'],
  inventory:[
    {surface:'MediaView each image/pdf/audio/video/web',controls:['title','filename/MIME','viewer content','focus','save-copy download','openExternal command/native','openBeside','split close/Escape','binder back/forward'],case_prefixes:KINDS.map(k=>'media.'+k+'.'),limits:['shell-adapter']},
    {surface:'ImageViewer',controls:['zoom-out','zoom-in','25/33/50/67/75/90/100/110/125/150/175/200/250/300/400 steps and clamps','fit','actual 100%','natural dimensions','Ctrl+wheel both directions','pan/drag/mouseup','focused IPC/native zoom','right-click absence'],case_prefixes:['media.image.'],limits:['image-context-options-absent']},
    {surface:'PdfViewer app-owned toolbar and annotations',controls:['previous','next','page numeric input 1/2/3/0/-2/99/2.8','page count and boundary disabled','zoom width/fit/50/75/100/125/150/200/300','all 15 zoom steps and dynamic options/clamps','search-submit/trim/clear','annotations toggle both states','note body/empty disabled/add','clipboard highlight empty/text+note','annotation quote/note/page link/delete','copy annotations into actual document notes','native PDF Ctrl+A/Ctrl+C'],case_prefixes:['media.pdf.'],limits:['pdf-plugin-internals']},
    {surface:'MediaPlayerView audio/video',controls:['no autoplay','rates 0.5/0.75/1/1.25/1.5/2','play/pause Ctrl+Alt+P and UA button','seek +/-5 toolbar/keyboard','timeline 0/50/90%','mute/unmute','volume 0/50/100%','overflow/download','timestamp button/shortcut to notes/text','saved time/resume','video fullscreen/Escape','video PiP entry/exit'],case_prefixes:['media.audio.','media.video.'],limits:['native-media-overflow','secondary-physical-display']},
    {surface:'WebArchiveView',controls:['offline title/text','sandbox','blocked script','internal anchor/back','original URL https/http/file/javascript/absent'],case_prefixes:['media.web.'],limits:['web-live-source','shell-adapter']},
    {surface:'QuickRef',controls:['command/native/context/shortcut open','title/body/focus','edit/save correct doc','main/locked/trash/file read-only','open in main','close button/Escape','drag','multiple/deduplicate'],case_prefixes:['media.quickref.'],limits:['scratchpad-native-context']},
    {surface:'FloatingInspector',controls:['composition-only open/native','all 4 labels','all 5 statuses','synopsis onBlur','plain/bold/italic/underline document notes','drag/bounds','close button/command/composition exit'],case_prefixes:['media.inspector.'],limits:['scratchpad-native-context']},
    {surface:'Scratchpad embedded and standalone (each)',controls:['note list/select','plus and empty new note button','title/body persistence','bold/italic/underline button and Ctrl+B/I/U','delete/confirm','import txt/md/html/htm/multiple','export current html/txt/all html','send new/append exact project doc','all fixture destination folders','choose folder/merge/clear/cancel','managed filename rename/delete','duplicate filenames','embedded drag/close/native open','standalone open/onTop false+true/reuse/focus/OS close/reopen'],case_prefixes:['media.scratch.'],limits:['global-shortcut','scratchpad-native-context']},
    {surface:'Copyholder',controls:['read-only default','editable checkbox on/off','write correct document','close button/command','open-main return context'],case_prefixes:['media.copyholder.'],limits:['scratchpad-native-context']},
    {surface:'Secondary BrowserWindow',controls:['new command/native','welcome','open independent fixture exact path/content','existing-project focus/no duplicate claim','independent Ctrl+S','native minimize/restore/maximize/restore/fullscreen/exit','OS close unsaved cancel/discard/save exact disk outcomes'],case_prefixes:['media.window.'],limits:['secondary-physical-display']},
    {surface:'MiniPlayer',controls:['safe idle mic presence (not active dictation)','idle pause/stop disabled','rate every 0.1 step 0.6–1.8','all runtime voice options individually with assertions/screens','read empty error','system read/pause/resume/stop','drag/persist/reopen','close button/command stops reading','native open'],case_prefixes:['media.mini.'],limits:['dictation-no-recording','tts-providers']},
  ],
  uncovered:LIMITS,
  status:'authored-not-executed; parent runs real installed app serially; syntax/registration checks only',
};
