'use strict';
// Real Electron/renderer contract. This module registers tests only; it never launches an app.
// No window.api mocking. Reads are observation; settingsFixture is the authorized isolated fixture.
const PLAN = {
  "tabs":["general","appearance","behaviors","corrections","editing","editorial","sharing","backup","keyboard","services","accounts","language"],
  "sections":["general","editor","binder","corkboard","outliner","composition","script","inspector","scrivenings","annotations"],
  "fonts":["Georgia, serif","'Times New Roman', serif","'Palatino Linotype', Palatino, serif","Garamond, serif","Arial, sans-serif","'Segoe UI', system-ui, sans-serif","'Courier New', monospace"],
  "dfpFonts":["","Georgia, serif","'Times New Roman', serif","'Palatino Linotype', Palatino, serif","Garamond, serif","Arial, sans-serif","Helvetica, Arial, sans-serif","'Courier New', monospace"],
  "langCodes":["ro","en","fr","de","it","es","pt","hu","ru","uk","pl","nl"],
  "grammarCodes":["auto","ro-RO","en-US","en-GB","fr","de-DE","es","it","pt-PT","hu-HU"],
  "dictationCodes":["ro","en","fr","de","es","it","hu"],
  "fields":[
    ["general","reopenLastProject","checkbox",0,[false,true]],
    ["general","autoUpdateCheck","checkbox",1,[false,true]],
    ["general","scratchShortcut","checkbox",2,[false,true]],
    ["general","scratchOnTop","checkbox",3,[false,true]],
    ["general","autosaveSec","number",0,[1,7,120]],
    ["general","authorName","text",0,["","Autor QA fictiv"]],
    ["behaviors","binderEnter","select",0,["edit","newDoc"]],
    ["behaviors","binderDoubleClick","select",1,["rename","openQuickRef"]],
    ["behaviors","typewriter","checkbox",0,[false,true]],
    ["corrections","smartQuotes","checkbox",0,[false,true]],
    ["corrections","smartDashes","checkbox",1,[false,true]],
    ["corrections","smartEllipsis","checkbox",2,[false,true]],
    ["corrections","smartFractions","checkbox",3,[false,true]],
    ["corrections","autoCapitalize","checkbox",4,[false,true]],
    ["corrections","learnCorrections","checkbox",5,[false,true]],
    ["corrections","spellLanguages","spell",0,[[],["ro","en-US","fr"]]],
    ["corrections","grammarLanguage","grammar",0,"grammarCodes"],
    ["editing","paragraphIndent","number",0,[0,1.5,5]],
    ["editing","paragraphSpacing","number",1,[0,0.9,3]],
    ["editing","defaultView","select",0,["editor","corkboard","outline"]],
    ["editing","showInvisibles","checkbox",0,[false,true]],
    ["editing","autoBacklinks","checkbox",1,[false,true]],
    ["sharing","team.name","text",0,["","Echipa QA fictivă"]],
    ["sharing","team.color","plainColor",0,["#123456",""]],
    ["sharing","sharingSync.format","select",0,["rtf","txt","md"]],
    ["sharing","sharingSync.notesFormat","select",1,["same","rtf","txt","md"]],
    ["sharing","sharingExport.format","select",2,["docx","rtf","md","txt","html"]],
    ["sharing","sharingSync.includeNotes","checkbox",0,[false,true]],
    ["sharing","sharingSync.syncOnOpen","checkbox",1,[false,true]],
    ["sharing","sharingSync.syncOnClose","checkbox",2,[false,true]],
    ["sharing","sharingExport.keepFolders","checkbox",3,[false,true]],
    ["sharing","sharingExport.includeNotes","checkbox",4,[false,true]],
    ["sharing","sharingExport.includeMeta","checkbox",5,[false,true]],
    ["backup","backupOnClose","checkbox",0,[false,true]],
    ["backup","backupOnOpen","checkbox",1,[false,true]],
    ["backup","backupOnSave","checkbox",2,[false,true]],
    ["backup","snapshotOnSave","checkbox",3,[false,true]],
    ["backup","backupZip","checkbox",4,[false,true]],
    ["backup","backupDateName","checkbox",5,[false,true]],
    ["backup","backupEveryMin","number",0,[0,5,15]],
    ["backup","backupKeep","number",1,[1,6,100]],
    ["services","speechAutoInstall","checkbox",0,[false,true]],
    ["services","dtedLanguage","dtedLanguage",0,"dictationCodes"],
    ["services","dtedTerms","terms",0,["","Ilinca QA, Apuseni QA"]],
    ["services","dtedTimestamps","checkbox",1,[false,true]],
    ["services","dtedAutoUpdate","checkbox",2,[false,true]],
    ["services","translateFrom","select",0,"fromCodes"],
    ["services","translateTo","select",1,"langCodes"],
    ["language","language","select",0,["ro","en"]],
    ["ai","aiEnabled","checkbox",0,[false,true]],
    ["ai","aiTimeoutSec","number",0,[10,320,3600]],
    ["ai","notebookLmUrl","url",0,["","https://notebooklm.google.com/notebook/qa-fixture"]],
    ["ai","notebookLmNotebook","notebook",0,["","notebook-qa-fixture"]],
    ["ai","notebookLmServer","notebook",1,["","qa-notebook-mcp"]]
  ],
  "looks":[
    ["general","theme","select",0,["system","light","dark","sepia"]],
    ["general","uiStyle","select",1,["classic","modern"]],
    ["general","editorFont","select",2,"fonts"],
    ["general","fontSize","number",0,[12,21,32]],
    ["general","lineHeight","number",1,[1,1.9,3]],
    ["general","pageWidth","number",2,[25,62,120]],
    ["general","toolbarIconSize","select",3,["small","medium","large"]],
    ["general","uiDensity","select",4,["normal","compact"]],
    ["general","accentColor","color",0,["#123456",""]],
    ["general","commentColor","color",1,["#123456",""]],
    ["editor","curLine","checkbox",0,[false,true]],
    ["editor","curLineOpacity","number",0,[5,55,100]],
    ["editor","typewriter","checkbox",1,[false,true]],
    ["editor","typewriterPos","range",0,[10,55,90]],
    ["binder","binderFont","select",0,"optionalFonts"],
    ["binder","binderFontSize","number",0,[10,17,22]],
    ["binder","binderAltRows","checkbox",0,[false,true]],
    ["binder","binderLabelMode","select",1,["dot","row","none"]],
    ["binder","binderContainerStyle","select",2,["normal","bold","italic","bolditalic"]],
    ["corkboard","corkBg","select",0,["default","cork","wood","linen","color","image"]],
    ["corkboard","cardTitleFont","select",1,"optionalFonts"],
    ["corkboard","cardSynopsisFont","select",2,"optionalFonts"],
    ["outliner","outAltRows","checkbox",0,[false,true]],
    ["outliner","outTitleFont","select",0,"optionalFonts"],
    ["outliner","outSynopsisFont","select",1,"optionalFonts"],
    ["composition","compBg","plainColor",0,["#123456"]],
    ["composition","compWidth","number",0,[25,48,80]],
    ["composition","compFade","number",1,[0,55,100]],
    ["composition","compPaper","checkbox",0,[false,true]],
    ["composition","compShowTargets","checkbox",1,[false,true]],
    ["composition","compBarAutoHide","checkbox",2,[false,true]],
    ["composition","compBarDelay","number",2,[0,700,5000]],
    ["composition","compZoom","select",0,[0,75,100,125,150,175,200,250,300]],
    ["composition","compAlign","select",1,["left","center","right"]],
    ["composition","compPadY","number",3,[0,64,300]],
    ["composition","compPadX","number",4,[0,68,300]],
    ["composition","compTypewriter","checkbox",3,[false,true]],
    ["composition","compScrollbar","checkbox",4,[false,true]],
    ["composition","compHideCursor","checkbox",5,[false,true]],
    ["composition","compInspOpacity","number",5,[20,65,100]],
    ["composition","compInspSynopsis","checkbox",6,[false,true]],
    ["composition","compInspMeta","checkbox",7,[false,true]],
    ["composition","compInspNotes","checkbox",8,[false,true]],
    ["inspector","inspNotesFont","select",0,"optionalFonts"],
    ["inspector","inspSynopsisFont","select",1,"optionalFonts"],
    ["scrivenings","scrivTitleFont","select",0,"optionalFonts"],
    ["scrivenings","scrivSepStyle","select",1,["dashed","solid","dotted","double","none"]],
    ["annotations","annotFont","select",0,"optionalFonts"],
    ["annotations","annotSize","number",0,[0,16,30]]
  ],
  "colors":{
    "editor":["edBg","edText","edSel","edCaret","pageViewPaper","pageViewSurround","linkInternal","linkExternal","keepFormatColor","searchHitColor","curLineColor"],
    "binder":["binderBg","binderText","binderAltColor"],
    "corkboard":["corkBgColor","cardColor","cardTitleColor"],
    "outliner":["outAltColor","outGridColor","outFolderColor"],
    "composition":["compTextColor","compPageColor","compBarColor"],
    "inspector":["inspNotesBg"],
    "scrivenings":["scrivSepColor"]
  },
  "scriptElements":["scene-heading","action","character","parenthetical","dialogue","transition","shot","general"],
  "builtins":["bannedAcademic","bannedTransitions","selfReference","llmResidue","passive","teleology"],
  "dfpNumbers":[["size",0,[8,22,48]],["firstIndent",1,[-5,1.25,8]],["indentLeft",2,[0,1.25,8]],["indentRight",3,[0,1.25,8]],["lineHeight",4,[1,1.8,3]],["spaceBefore",5,[0,0.8,3]],["spaceAfter",6,[0,0.8,3]],["notesSize",7,[8,16,32]],["footnoteSize",8,[8,14,32]]],
  "services":[["deepl",["apiKey"]],["googleTranslate",["apiKey","refreshToken"]],["languagetool",["username","apiKey"]],["speechify",["apiKey","voiceId"]],["zotero",["userId","apiKey"]],["github",["token"]]],
  "topIds":["home","back","forward","title","views","binder","compile","inspector","composition","splitEditor","findProject","newText","snapshot","bookmarks","projectNotes","targets","voice","settings","help","update"],
  "formatIds":["block","font","bui","textfx","color","highlight","align","spacing","paraSpace","lists","dialogue","notes","internalLink","insert","paragraph","bookmarks","image","table","chars","transform","style","revision","view","copySpecial","undo"],
  "topDefault":["home","back","forward","title","space","views","voice","compile","inspector"],
  "formatDefault":["block","font","bui","color","highlight","align","spacing","paraSpace","lists","paragraph","image","table"],
  "geometryExtra":["ai","dfp-global","dfp-custom","toolbar-top","toolbar-format","shortcuts","layouts-empty","layouts-full","account-form","services-dted","cork-color"],
  "fixedIds":["settings-native","ai-native","shortcuts-native","toolbar-native","layouts-native","settings-keyboard-door","settings-project-door-general","settings-project-door-editorial","ai-project-door","program-ai-separation","settings-cancel","settings-escape-dirty","settings-backdrop-dirty","settings-close-x","settings-tab-return","general-update-door","scratch-folder-choose","scratch-folder-clear","scratch-folder-cancel","backup-dir-choose","backup-dir-reset","backup-dir-cancel","backup-open-shell","backup-readonly-paths","team-machine-readonly","replacement-add-save","replacement-edit-save","replacement-delete-save","replacement-empty-filter","dictionary-filter-delete","theme-save-load","theme-overwrite-delete","theme-empty-name","theme-reset-all","theme-export","theme-import","theme-invalid-import","cork-image-import","composition-image-import","composition-image-remove","composition-bg-default","revision-default","speech-engine-local","speech-engine-dted","local-variant-cpu","local-variant-cuda","dted-check-invalid-rollback","dfp-use-global","dfp-cancel","dfp-new-document-effect","dfp-convert-default-effect","shortcut-conflict","shortcut-escape-recording","shortcut-cancel","shortcut-reset-all","shortcut-custom-execution","toolbar-cancel","toolbar-restore","toolbar-keyboard-order","toolbar-drag-add-order-remove","toolbar-boundary-buttons","layout-save-current","layout-rename","layout-delete","layout-import","layout-import-replace","layout-invalid-import","layout-export","layout-thumbnail","layout-apply-complex","layout-empty-return","account-add-edit-delete","account-cancel","account-validation","account-password-copy","account-site-shell","oauth-unconfigured-gate"]
};
const fs = require('fs'), path = require('path');
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const safeId = x => String(x).replace(/[^a-z0-9_-]/gi,'-');
const get = (o,k) => k.split('.').reduce((a,b)=>a?.[b],o);
function put(o,k,v) { const ks=k.split('.');let a=o;for(const x of ks.slice(0,-1))a=a[x] ||= {};a[ks.at(-1)]=v;return o; }
const FSEL={checkbox:'input[type=checkbox]',number:'input[type=number]',select:'select',color:'.look-color input[type=color]',plainColor:'input[type=color]',range:'input[type=range]',text:'input:not([type]):not([readonly]):not([disabled])',spell:'input[placeholder="ro, en-US"]',grammar:'input[list=set-grammar-langs]',dtedLanguage:'input[list=set-dted-langs]',terms:'input[placeholder="Ilinca, Apuseni, Matei"]',url:'input[type=url]',notebook:'input[type=text]'};
const TAB_NAMES=['General','Aspect','Comportament','Corecturi','Editare','Editorial (I-REP)','Partajare','Backup','Tastatură','Voce și traducere','Servicii și conturi','Limbă'];
const CSS_KEYS={editorFont:'--editor-font',fontSize:'--editor-font-size',lineHeight:'--editor-line-height',pageWidth:'--editor-page-width',binderFontSize:'--binder-font-size',paragraphIndent:'--para-indent',paragraphSpacing:'--para-spacing',accentColor:'--accent',commentColor:null,edBg:'--ed-bg',edText:'--ed-text',edSel:'--ed-sel',edCaret:'--ed-caret',pageViewPaper:'--pv-paper',pageViewSurround:'--pv-surround',curLineColor:'--cur-line-color',linkInternal:'--link-internal',linkExternal:'--link-external',keepFormatColor:'--keep-format-color',searchHitColor:'--search-hit-color',binderBg:'--binder-bg',binderText:'--binder-text',binderAltColor:'--binder-alt',corkBgColor:'--cork-bg-color',cardColor:'--card-color',cardTitleColor:'--card-title-color',outAltColor:'--out-alt',outGridColor:'--out-grid',outFolderColor:'--out-folder',compTextColor:'--comp-text',compPageColor:'--comp-page',compBarColor:'--comp-bar-bg',inspNotesBg:'--insp-notes-bg',scrivSepColor:'--scriv-sep-color',binderFont:'--binder-font',cardTitleFont:'--card-title-font',cardSynopsisFont:'--card-synopsis-font',outTitleFont:'--out-title-font',outSynopsisFont:'--out-synopsis-font',inspNotesFont:'--insp-notes-font',inspSynopsisFont:'--insp-synopsis-font',scrivTitleFont:'--scriv-title-font',annotFont:'--annot-font',annotSize:'--annot-size',compBarDelay:'--comp-bar-delay',compZoom:'--comp-zoom',compPadY:'--comp-pad-y',compPadX:'--comp-pad-x',compInspOpacity:'--comp-insp-opacity',curLineOpacity:'--cur-line-opacity',scrivSepStyle:'--scriv-sep-style'};
const DATA_KEYS={theme:'theme',uiStyle:'ui',showInvisibles:'invisibles',curLine:'curLine',binderAltRows:'binderAlt',binderLabelMode:'binderLabels',binderContainerStyle:'binderContainers',corkBg:'corkBg',outAltRows:'outAlt',toolbarIconSize:'toolbarIcons',uiDensity:'density',compBarAutoHide:'compBar',compScrollbar:'compScrollbar',compHideCursor:'compHideCursor',typewriterPos:'typewriterPos'};
const OPEN_ROUTES={settings:['Program','Setări program…'],aiSettings:['AI','Setări AI program…'],shortcuts:['Program','Scurtături de tastatură…'],customizeToolbar:['Program','Personalizează bara de instrumente…'],manageLayouts:['Fereastră','Gestionează layout-urile…']};
async function settings(H) { return H.p.evaluate(()=>window.api.getSettings()); }
async function open(H, tab='general', section) {
  await H.command(tab==='ai'?'aiSettings':'settings');await H.p.waitForSelector('.settings-dialog');
  if(tab!=='ai')await H.p.locator('.settings-dialog [role=tab]').nth(PLAN.tabs.indexOf(tab)).click();
  if(section)await H.p.locator(`[data-look-section="${section}"]`).click();
  await H.wait(()=>H.p.locator(section?`.look-section[data-section="${section}"]`:'.settings-dialog [role=tabpanel]').isVisible());
}
const body=(H,section)=>H.p.locator(section?'.look-section':'.settings-dialog [role=tabpanel]');
async function closeSave(H) { await H.modal().locator(':scope > .actions').getByRole('button',{name:/^(Salvează|Save)$/}).click();await H.wait(async()=>!await H.p.locator('.modal').count()); }
async function cancel(H) { await H.modal().getByRole('button',{name:/^(Anulează|Cancel)$/,exact:true}).last().click(); }
async function setInput(H,l,v,type) {
  await H.assert(await l.count()===1,'One unique target control required');
  if(type==='checkbox')await l.setChecked(v);
  else if(type==='select')await l.selectOption(String(v));
  else if(type==='color'||type==='plainColor') {
    H.limit('native-color-picker','OS color picker is not traversed; an actual DOM input/change event selects a deterministic fixture color.');
    await l.evaluate((e,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));},v);
  } else if(type==='range') {
    await l.focus();await l.press('Home');const min=Number(await l.getAttribute('min')),step=Number(await l.getAttribute('step'))||1;
    for(let n=min;n<v;n+=step)await l.press('ArrowRight');
  } else await l.fill(Array.isArray(v)?v.join(', '):String(v));
}
function values(row) { if(Array.isArray(row[4]))return row[4];if(row[4]==='optionalFonts')return ['',...PLAN.fonts];if(row[4]==='fromCodes')return ['auto',...PLAN.langCodes];return PLAN[row[4]]; }
function fieldLocator(H,row,look=false) { const [,,type,i]=row;return body(H,look).locator(FSEL[type]).nth(i); }
function dependent(row,look) {
  const [s,k]=row,p={speechEngine:'local',backupOnClose:false,backupOnOpen:false,backupOnSave:false,backupEveryMin:0,autoUpdateCheck:false};
  if(look&&s==='binder')p.binderAltRows=true;
  if(look&&s==='outliner')p.outAltRows=true;
  if(look&&s==='corkboard')p.corkBg='color';
  if(look&&s==='composition')p.compBarAutoHide=true;
  return p;
}
function cssExpected(k,v) {
  if(['fontSize','binderFontSize','annotSize','compPadY','compPadX'].includes(k))return k==='annotSize'&&!v?'':`${v}px`;
  if(['pageWidth','paragraphIndent','paragraphSpacing'].includes(k))return `${v}em`;
  if(k==='compBarDelay')return `${v}ms`;if(k==='compZoom')return v?String(v/100):'';
  if(k==='compInspOpacity')return String(v/100);if(k==='curLineOpacity')return `${v}%`;
  return String(v);
}
function dataExpected(k,v) {
  if(k==='compBarAutoHide')return v?'auto':'pinned';
  if(['showInvisibles','curLine','binderAltRows','outAltRows','compScrollbar','compHideCursor'].includes(k))return v?'on':'off';
  return String(v);
}
async function checkCss(H,k,v) {
  const css=CSS_KEYS[k],data=DATA_KEYS[k];
  if(css)H.assert(await H.p.evaluate(css=>document.documentElement.style.getPropertyValue(css),css)===cssExpected(k,v),`Applied CSS ${k}`);
  if(data)H.assert(await H.p.evaluate(data=>document.documentElement.dataset[data],data)===dataExpected(k,v),`Applied data ${k}`);
  if(k.startsWith('scriptColors.'))H.assert(await H.p.evaluate(k=>document.documentElement.style.getPropertyValue('--script-'+k),k.split('.')[1])===v,'Script element CSS applies');
  if(k.startsWith('revisionColors.'))H.assert(await H.p.evaluate(n=>document.documentElement.style.getPropertyValue('--rev-'+n),Number(k.split('.')[1])+1)===v,'Revision CSS applies');
}
async function fieldVerify(H,row,look,v) {
  const [s,k,type]=row;await H.wait(async()=>same(get(await settings(H),k),v));await checkCss(H,k,v);
  await open(H,look?'appearance':s,look?s:undefined);const l=fieldLocator(H,row,look);
  if(type==='checkbox')H.assert(await l.isChecked()===v,`Reopened ${k} checked state`);
  else if(type==='color'&&v==='')H.assert(await l.locator('xpath=ancestor::label[1]').getByRole('button',{name:/^(Implicit|Default)$/}).isDisabled(),'Default color stored as empty; reset unavailable');
  else if(type==='spell')H.assert(await l.inputValue()===v.join(', '),'Spelling array rehydrated');
  else H.assert(await l.inputValue()===String(v),`Reopened ${k} exact value`);
}
async function dfpOpen(H) { await H.command('projectSettings');await H.p.waitForSelector('.ps-dialog');await H.p.locator('#ps-tab-formatare').click(); }
async function customDfp(H) { await dfpOpen(H);await H.p.locator('.dfp-global').uncheck(); }
async function persistDfp(H,k,v) { await H.wait(()=>same(get(H.project(),'defaultFormatting.'+k),v));await dfpOpen(H);H.assert(!await H.p.locator('.dfp-global').isChecked(),'Project format override remains active'); }
async function openToolbar(H,bar='top') { await H.command('customizeToolbar');await H.p.waitForSelector('.tb-customize');await H.modal().getByRole('tab').nth(bar==='top'?0:1).click(); }
const av=H=>H.p.locator('[aria-labelledby=tb-av]');const cur=H=>H.p.locator('[aria-labelledby=tb-cur]');
async function openAccounts(H) { await open(H,'accounts');await H.p.waitForSelector('.service-row'); }
function serviceRow(H,id) { return H.p.locator('.service-row').filter({has:H.p.locator(`[data-hint="service-key-${id}"]`)}); }
async function addAccount(H,name='QA account') {
  await openAccounts(H);await H.p.locator('.services-panel > button').click();const form=H.p.locator('.account-form'),ins=form.locator('input');
  for(const [i,v]of ['QA account','https://example.invalid/qa','qa-user','qa-password-not-real'].entries())await ins.nth(i).fill(i===0?name:v);
  await form.getByRole('button',{name:'Salvează',exact:true}).click();await H.wait(async()=>(await H.p.evaluate(()=>window.api.servicesStatus())).accounts.some(a=>a.name===name));
}
const fixtureLayout=(name='QA layout')=>({name,view:'editor',showInspector:false,showAi:false,showEditorial:false,hideBinder:false,widths:{binder:220,side:280},editorView:{splitHorizontal:false},split:false,splitId:null,copyholder:null,outlinerColumns:['title','words'],saved:'2026-01-01T00:00:00.000Z'});
async function layoutOpen(H,populated=true) { await H.settingsFixture({layouts:populated?[fixtureLayout()]:[]});await H.command('manageLayouts');await H.p.waitForSelector('.layouts-dialog'); }
async function download(H,button,name) {
  const promise=H.p.waitForEvent('download');await button.click();const dl=await promise;const file=path.join(H.W,name||dl.suggestedFilename());await dl.saveAs(file);H.assert(fs.existsSync(file),'Actual exported file exists');return {file,name:dl.suggestedFilename(),text:fs.readFileSync(file,'utf8')};
}
const IMG={name:'qa-background.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64')};
async function geomOpen(H,surface) {
  if(surface.startsWith('look:'))return open(H,'appearance',surface.slice(5));
  if(PLAN.tabs.includes(surface)||surface==='ai')return open(H,surface);
  if(surface==='dfp-global'){await dfpOpen(H);return H.p.locator('.dfp-global').check();}
  if(surface==='dfp-custom')return customDfp(H);
  if(surface.startsWith('toolbar-'))return openToolbar(H,surface.slice(8));
  if(surface==='shortcuts'){await H.command('shortcuts');return H.p.waitForSelector('.shortcut-table');}
  if(surface.startsWith('layouts-'))return layoutOpen(H,surface==='layouts-full');
  if(surface==='account-form'){await openAccounts(H);return H.p.locator('.services-panel > button').click();}
  if(surface==='services-dted'){await open(H,'services');return H.p.locator('input[name=speechEngine]').nth(1).check();}
  if(surface==='cork-color')return open(H,'appearance','corkboard');
  throw Error('Unknown surface '+surface);
}
// Computed composited text contrast: no screenshots-only pass and no exemptions for muted text.
async function auditGeometry(H,surface) {
  const m=H.modal();await H.wait(()=>m.evaluate(e=>e.contains(document.activeElement)));
  const shell=await m.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,sw:e.scrollWidth,cw:e.clientWidth,name:e.getAttribute('aria-label')||document.getElementById(e.getAttribute('aria-labelledby'))?.textContent,role:e.getAttribute('role'),modal:e.getAttribute('aria-modal')};});
  H.assert(shell.role==='dialog'&&shell.modal==='true'&&shell.name,'Named modal ARIA');
  H.assert(shell.x>=-1&&shell.y>=-1&&shell.right<=shell.w+1&&shell.bottom<=shell.h+1,'Whole dialog fits viewport: '+JSON.stringify(shell));
  H.assert(shell.sw<=shell.cw+2,'No horizontal content overflow');
  const controls=m.locator('button,input:not([type=hidden]),select,textarea,a[href],[role=option],[role=listbox]');
  for(let i=0;i<await controls.count();i++) {
    const l=controls.nth(i);if(!await l.isVisible())continue;await l.scrollIntoViewIfNeeded();
    const st=await l.evaluate(e=>{
      const r=e.getBoundingClientRect(),s=getComputedStyle(e),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      const name=e.getAttribute('aria-label')||e.labels?.[0]?.textContent||e.textContent?.trim()||e.title||document.getElementById(e.getAttribute('aria-labelledby'))?.textContent;
      const named=Boolean(name?.trim());const focused=e===document.activeElement;
      return {tag:e.tagName,type:e.type,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height,vw:innerWidth,vh:innerHeight,hit:top===e||e.contains(top),disabled:e.disabled,named,name,focused,tab:e.tabIndex,outline:s.outlineStyle,shadow:s.boxShadow};
    });
    H.assert(st.w>0&&st.h>0&&st.x>=-1&&st.y>=-1&&st.right<=st.vw+1&&st.bottom<=st.vh+1,'Reachable un-clipped control '+surface+' '+st.name);
    H.assert(st.hit,'Control center not obscured '+surface+' '+st.name);
    H.assert(st.named,'Accessible name for each visible control '+surface+' #'+i);
    if(!st.disabled&&st.tag!=='LI'&&st.type!=='color') {
      const contrast=await l.evaluate(e=>{
        const rgba=c=>{const v=c.match(/[\d.]+/g)?.map(Number)||[];return [v[0]||0,v[1]||0,v[2]||0,v[3]??1];};
        const blend=(a,b)=>a.slice(0,3).map((c,i)=>c*a[3]+b[i]*(1-a[3]));
        const stack=[];for(let n=e;n;n=n.parentElement)stack.unshift(rgba(getComputedStyle(n).backgroundColor));
        let bg=[255,255,255];for(const a of stack)bg=blend(a,bg);const fg=blend(rgba(getComputedStyle(e).color),bg);
        const lum=a=>a.map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;}).reduce((t,x,i)=>t+x*[0.2126,0.7152,0.0722][i],0);
        const a=lum(fg),b=lum(bg),s=getComputedStyle(e);return {ratio:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),large:parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700)};
      });
      H.assert(contrast.ratio>=(contrast.large?3:4.5),'WCAG text contrast '+surface+' '+st.name+' = '+contrast.ratio.toFixed(2));
    }
  }
  // Text, including labels/help/error text, must be readable independently of form control text.
  const textContrast=await m.evaluate(m=>{
    const errors=[];for(const e of m.querySelectorAll('label,p,h2,h3,h4,legend,option,strong,span')){
      if(!e.getClientRects().length||!e.textContent.trim()||e.closest('[disabled],.look-swatch,.sc-ico,select'))continue;
      const s=getComputedStyle(e),rgb=c=>{const a=c.match(/[\d.]+/g)?.map(Number);return a?.length>=3?a:null;};const fg=rgb(s.color);let bg=null;
      for(let n=e;n&&!bg;n=n.parentElement){const c=rgb(getComputedStyle(n).backgroundColor);if(c&&(c[3]??1)>=0.99)bg=c;}
      if(!fg||!bg)continue;const lum=a=>a.slice(0,3).map(x=>{x/=255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;}).reduce((t,x,i)=>t+x*[0.2126,0.7152,0.0722][i],0);const a=lum(fg),b=lum(bg),r=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);
      if(r<(large?3:4.5))errors.push({text:e.textContent.trim().slice(0,80),ratio:r});
    }return errors;
  });
  H.assert(!textContrast.length,'Readable help/labels '+JSON.stringify(textContrast));
  // Traverse all tabbable targets, including scrollable tables. Shortcut recording consumes Tab:
  // that is tested here as a keyboard accessibility failure, not silently skipped.
  const candidates=await m.evaluate(e=>[...e.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(x=>!x.disabled&&x.tabIndex>=0&&x.getClientRects().length).length);
  const seen=new Set();
  for(let i=0;i<candidates+2;i++) {
    await H.p.keyboard.press('Tab');const active=await m.evaluate(e=>{const a=document.activeElement,s=getComputedStyle(a);return {inside:e.contains(a),index:[...e.querySelectorAll('*')].indexOf(a),outline:s.outlineStyle,shadow:s.boxShadow,visible:a.matches(':focus-visible'),disabled:a.disabled};});
    H.assert(active.inside&&!active.disabled,'Tab stays in top dialog');seen.add(active.index);
    H.assert(active.visible&&(active.outline!=='none'||active.shadow!=='none'),'Visible keyboard focus indicator');
  }
  H.assert(seen.size>=candidates,'Every tabbable control is reachable without being swallowed by recording '+surface+': '+seen.size+'/'+candidates);
  await H.p.keyboard.press('Shift+Tab');H.assert(await m.evaluate(e=>e.contains(document.activeElement)),'Reverse focus trap');
  const selected=await m.locator('[role=tab]').count();if(selected)H.assert(await m.locator('[role=tab][aria-selected=true]').count()===1,'Exactly one active tab');
}
module.exports=async function registerProgram(H) {
  const add=(id,surface,control,act,verify,setup,commands=['settings'],routes=[])=>H.test(id,{surface,control,commands,routes,initial:'Renderer proaspăt, proiect și profil QA izolate; '+surface,expected:'Efect specific verificat prin aserțiuni în UI/settings/project/HTML/fișiere; '+control,setup,act,verify});
  // Keep IDs stable and count every expanded option. The catalog mirrors these loops.
  const allFields=[...PLAN.fields.map(r=>({row:r,look:false})),...PLAN.looks.map(r=>({row:r,look:true}))];
  for(const [section,keys]of Object.entries(PLAN.colors))for(const [i,k]of keys.entries())allFields.push({row:[section,k,'color',i,['#123456','']],look:true});
  for(const [i,el]of PLAN.scriptElements.entries())allFields.push({row:['script','scriptColors.'+el,'color',i,['#123456','']],look:true});
  for(let i=0;i<5;i++)allFields.push({row:['general','revisionColors.'+i,'plainColor',i+2,['#123456']],look:true});
  for(const {row,look}of allFields)for(const [n,v]of values(row).entries()) {
    // team.color has no Default button; its empty value is an explicitly uncovered option, not a fabricated pass.
    if(row[1]==='team.color'&&v==='')continue;
    add(`field-${look?'look':'set'}-${safeId(row[1])}-${n}`,look?'AppearancePane/'+row[0]:'SettingsDialog/'+row[0],row[1]+' = '+JSON.stringify(v),async H=>{
      const l=fieldLocator(H,row,look);
      if(row[2]==='color'&&v==='')await l.locator('xpath=ancestor::label[1]').getByRole('button',{name:/^(Implicit|Default)$/}).click();
      else await setInput(H,l,v,row[2]);await closeSave(H);
    },async H=>fieldVerify(H,row,look,v),async H=>{
      const p=dependent(row,look);if(row[2]==='color')put(p,row[1],v===''?'#654321':'');
      await H.settingsFixture(p);await open(H,look?'appearance':row[0],look?row[0]:undefined);
    },[row[0]==='ai'&&!look?'aiSettings':'settings']);
  }
  // Editorial profiles: every built-in toggle, every parsed list and each profile independently.
  for(const profile of ['ro','generic']) {
    for(const [i,key]of PLAN.builtins.entries())for(const v of [false,true])add(`editorial-${profile}-${key}-${v}`,'SettingsDialog/editorial',key,async H=>{await H.p.locator('.settings-dialog [role=tabpanel] input[type=checkbox]').nth(i).setChecked(v);await closeSave(H);},async H=>{
      await H.wait(async()=>get(await settings(H),`editorialLists.${profile}.builtins.${key}`)===v);await open(H,'editorial');await body(H).locator('select').selectOption(profile);H.assert(await body(H).locator('input[type=checkbox]').nth(i).isChecked()===v,'Reopened editorial toggle');
    },async H=>{await open(H,'editorial');await body(H).locator('select').selectOption(profile);});
    const lists=[['forbidden','textarea',0,'gest => faptă # nota QA',[{word:'gest',replacement:'faptă',note:'nota QA'}]],['preferred','textarea',1,'rânduială <= logică # nota QA',[{word:'rânduială',replacement:'logică',note:'nota QA'}]],['disabledWords','input[placeholder="astfel, mai sus"]',0,'astfel, mai sus',['astfel','mai sus']],['custom','textarea',2,'Clișee QA: fascinant, călătorie; peisaj',[{name:'Clișee QA',words:['fascinant','călătorie','peisaj']}]]];
    for(const [k,sel,i,text,expected]of lists)add(`editorial-${profile}-${k}`,'SettingsDialog/editorial',k,async H=>{await body(H).locator(sel).nth(i).fill(text);await closeSave(H);},async H=>{await H.wait(async()=>same(get(await settings(H),`editorialLists.${profile}.${k}`),expected));await open(H,'editorial');await body(H).locator('select').selectOption(profile);H.assert((await body(H).locator(sel).nth(i).inputValue()).includes(text.split(' ')[0]),'Saved list shown in selected profile');},async H=>{await open(H,'editorial');await body(H).locator('select').selectOption(profile);});
  }
  // Every AI provider: save a dummy model, check fixed/editable base URL and secret masking, reopen.
  const presets=JSON.parse(fs.readFileSync(path.join(H.ROOT,'lib/aiPresets.json'),'utf8'));
  for(const [id,preset]of Object.entries(presets))add('provider-'+id,'SettingsDialog/ai','provider/model/base URL/password',async H=>{
    await body(H).locator('select').selectOption(id);const ins=body(H).locator('fieldset').first().locator('input');await ins.first().fill('qa-model-not-real');
    if(['ollama','lmstudio','custom'].includes(id))await ins.nth(1).fill('http://127.0.0.1:1/v1');
    else if(id!=='anthropic')H.assert(await ins.nth(1).getAttribute('readonly')!==null&&await ins.nth(1).inputValue()===preset.baseUrl,'Cloud URL fixed to preset');
    const secret=body(H).locator('input[type=password]');H.assert(await secret.getAttribute('autocomplete')==='off','AI credential entry never auto-completed');await closeSave(H);
  },async H=>{await H.wait(async()=>{const s=await settings(H);return s.aiProvider===id&&s.aiModel==='qa-model-not-real'&&s.aiBaseUrl===(['ollama','lmstudio','custom'].includes(id)?'http://127.0.0.1:1/v1':'');});await open(H,'ai');H.assert(await body(H).locator('select').inputValue()===id&&await body(H).locator('input[type=password]').inputValue()==='','Provider persisted and secret not exposed');},async H=>open(H,'ai'),['aiSettings']);
  for(const fit of ['cover','contain','tile','center'])add('composition-fit-'+fit,'AppearancePane/composition','image fit '+fit,async H=>{await body(H,true).locator('.comp-bg-image select').selectOption(fit);await closeSave(H);await H.command('composition');},async H=>{await H.wait(async()=>(await settings(H)).compBgImageFit===fit);H.assert(await H.p.locator('.app.composition').getAttribute('data-fit')===fit,'Composition image fit applied');H.assert(await H.p.locator('.app.composition.has-bg-image').count()===1,'Composition image active');},async H=>{await H.settingsFixture({compBgImage:'data:image/png;base64,'+IMG.buffer.toString('base64')});await open(H,'appearance','composition');});
  // Every display returned by the real OS; registration includes the current monitor and slots present.
  // Actual dynamic monitor list is enumerated within one case, not guessed or replaced by mock displays.
  add('composition-displays','AppearancePane/composition','current + every actual monitor',async H=>{
    const ds=await H.p.evaluate(()=>window.api.listDisplays());const sel=body(H,true).locator('select').filter({has:H.p.locator('option[value="-1"]')});await H.wait(async()=>await sel.locator('option').count()===ds.length+1);
    H._programDisplays=[];for(const index of [-1,...ds.map(d=>d.index)]){await sel.selectOption(String(index));await closeSave(H);await H.wait(async()=>(await settings(H)).compDisplay===index);H._programDisplays.push(index);await open(H,'appearance','composition');}
  },async H=>{H.assert(H._programDisplays.length>=2,'Current monitor and actual hardware display visited');const options=await body(H,true).locator('select').filter({has:H.p.locator('option[value="-1"]')}).locator('option').evaluateAll(es=>es.map(e=>Number(e.value)));H.assert(same(options,H._programDisplays),'All enumerated monitor values covered');H.limit('composition-monitor-relocation','All real monitor settings persisted, but physical fullscreen movement cannot be asserted solely through renderer geometry; no hardware fabrication.');},async H=>open(H,'appearance','composition'));
  // Default-formatting: all fonts, alignments and numerical boundaries, saved in project.json.
  for(const [key,i]of [['font',0],['notesFont',2],['footnoteFont',3]])for(const [n,v]of PLAN.dfpFonts.entries())add(`dfp-${key}-${n}`,'DefaultFormatPane',key+' = '+v,async H=>{await H.p.locator('.dfp select').nth(i).selectOption(v);await closeSave(H);},async H=>{await persistDfp(H,key,v===''?undefined:v);H.assert(await H.p.locator('.dfp select').nth(i).inputValue()===v,'Font selection survives reopening');},async H=>{await H.fixture(async p=>{p.defaultFormatting={size:18};});await customDfp(H);},['projectSettings']);
  for(const [n,v]of ['','left','center','right','justify'].entries())add('dfp-align-'+n,'DefaultFormatPane','alignment '+v,async H=>{await H.p.locator('.dfp select').nth(1).selectOption(v);await closeSave(H);},async H=>{await persistDfp(H,'align',v===''?undefined:v);H.assert(await H.p.locator('.dfp select').nth(1).inputValue()===v,'Alignment saved and rehydrated');},async H=>{await H.fixture(async p=>{p.defaultFormatting={size:18};});await customDfp(H);},['projectSettings']);
  for(const [key,i,vs]of PLAN.dfpNumbers)for(const [n,v]of vs.entries())add(`dfp-${key}-${n}`,'DefaultFormatPane',key,async H=>{await H.p.locator('.dfp input[type=number]').nth(i).fill(String(v));await closeSave(H);},async H=>{await persistDfp(H,key,v);H.assert(await H.p.locator('.dfp input[type=number]').nth(i).inputValue()===String(v),'Format number rehydrated');},async H=>customDfp(H),['projectSettings']);
  for(const [mark,key,sign]of [['first','firstIndent',1],['left','indentLeft',1],['right','indentRight',-1]])for(const mode of ['keyboard','pointer'])add(`dfp-ruler-${mark}-${mode}`,'DefaultFormatPane/ruler',key+' '+mode,async H=>{
    const l=H.p.locator('.dfp-mark.'+mark);await l.scrollIntoViewIfNeeded();if(mode==='keyboard'){await l.focus();await l.press('ArrowRight');H._rulerValue=1+sign*0.25;}
    else {const box=await H.p.locator('.dfp-ruler').boundingBox(),b=await l.boundingBox();await H.p.mouse.move(b.x+b.width/2,b.y+b.height/2);await H.p.mouse.down();await H.p.mouse.move(box.x+box.width*0.5,b.y+b.height/2,{steps:8});await H.p.mouse.up();H._rulerValue=mark==='first'?3:4;}
    await closeSave(H);
  },async H=>{await persistDfp(H,key,H._rulerValue);H.assert(await H.p.locator('.dfp-mark.'+mark).getAttribute('aria-label'),'Ruler mark is named');},async H=>{await H.fixture(async p=>{p.defaultFormatting={size:18,firstIndent:1,indentLeft:1,indentRight:1};});await customDfp(H);},['projectSettings']);
  // Real services: every field, save, update, explicit delete, encrypted-secret separation.
  const defs=require(path.join(H.ROOT,'lib/services.cjs')).SERVICES;
  for(const [id,fields]of PLAN.services)for(const field of fields)add(`service-${id}-${field}`,'ServicesPanel/'+id,field+' save/update/delete',async H=>{
    const row=serviceRow(H,id),index=fields.indexOf(field),l=row.locator(`[data-hint="service-key-${id}"]`).nth(index);const secret=defs[id].fields[index].secret;const value=secret?'qa-secret-never-real':field==='username'?'qa@example.invalid':'qa-fixture-value';
    H._serviceValue=value;await l.fill(value);await row.locator('.actions-inline').first().getByRole('button',{name:'Salvează',exact:true}).click();
    await H.wait(async()=>{const status=(await H.p.evaluate(()=>window.api.servicesStatus())).services[id];return status.fields[index].set&&status.configured;});
    H.assert(await l.inputValue()===(secret?'':value),'Saved secret cleared / nonsecret retained');
    const profile=path.join(H.W,'profile','settings.json'),raw=fs.readFileSync(profile,'utf8');if(secret){const stored=JSON.parse(raw).services[id][field];H.assert(stored.enc&&!raw.includes(value),'Secret stored sealed, not plaintext');}
    await l.fill(value+'-updated');await row.locator('.actions-inline').first().getByRole('button',{name:'Salvează',exact:true}).click();await H.wait(async()=>(await H.p.evaluate(()=>window.api.servicesStatus())).services[id].fields[index].set);
    await row.locator('.actions-inline').first().getByRole('button',{name:'Șterge',exact:true}).click();
  },async H=>{await H.wait(async()=>!(await H.p.evaluate(()=>window.api.servicesStatus())).services[id].fields.some(f=>f.set));H.assert(!JSON.parse(fs.readFileSync(path.join(H.W,'profile','settings.json'),'utf8')).services?.[id],'Delete removes all fixture service fields from settings file');H.assert(await serviceRow(H,id).locator('.actions-inline').first().getByRole('button',{name:'Salvează',exact:true}).isDisabled(),'Clean service save disabled');},async H=>{await H.settingsFixture({services:{},accounts:[]});await openAccounts(H);});
  for(const [id]of PLAN.services)for(const kind of ['about','key'])add(`service-link-${id}-${kind}`,'ServicesPanel/'+id,'external '+kind,async H=>{const links=serviceRow(H,id).locator('a');const href=await links.nth(kind==='about'?0:1).getAttribute('href');H._url=href;await links.nth(kind==='about'?0:1).click();},async H=>{await H.wait(async()=>(await H.effects()).some(e=>e.kind==='external-url'&&e.url===H._url));H.assert(await H.p.locator('.settings-dialog').isVisible(),'Settings context remains after link');H.limit('shell-external-links','shell.openExternal is captured by harness, so URL dispatch is verified, not live browser content or login.');},async H=>openAccounts(H));
  // Toolbar configuration covers every item including separator and flexible space, not its unrelated business command.
  for(const bar of ['top','format'])for(const id of [...PLAN[bar+'Ids'],'sep','space'])add(`toolbar-item-${bar}-${id}`,'ToolbarCustomizeDialog/'+bar,id+' add/remove/save',async H=>{
    const all=PLAN[bar+'Ids'],idx=all.indexOf(id);const option=av(H).getByRole('option').nth(idx>=0?idx:all.length+(id==='space'?1:0));await option.click();await H.modal().locator('.tb-mid button').nth(0).click();
    H.assert(await cur(H).getByRole('option').count()===1,'Selected item added once');
    // A separator at the edge is normalized away; put one between two real items before persistence.
    if(id==='sep') {await av(H).getByRole('option').first().dblclick();await cur(H).getByRole('option').first().click();await H.modal().locator('.tb-mid button').nth(3).click();await av(H).getByRole('option').first().dblclick();}
    await closeSave(H);await openToolbar(H,bar);H.assert((await settings(H)).toolbars[bar].includes(id),'Configured item persisted');
    const list=(await settings(H)).toolbars[bar],pos=list.indexOf(id);await cur(H).getByRole('option').nth(pos).click();await H.modal().locator('.tb-mid button').nth(1).click();await closeSave(H);
  },async H=>{await H.wait(async()=>!(await settings(H)).toolbars[bar].includes(id));await openToolbar(H,bar);H.assert(await av(H).getByRole('option').count()>0,'Removed item available again');},async H=>{await H.settingsFixture({toolbars:{top:[],format:[],display:'iconText',seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H,bar);},['customizeToolbar']);
  for(const mode of ['iconText','icon','text'])add('toolbar-display-'+mode,'ToolbarCustomizeDialog/top','display '+mode,async H=>{await H.modal().locator('select').selectOption(mode);await closeSave(H);},async H=>{await H.wait(async()=>(await settings(H)).toolbars.display===mode);const l=H.p.locator('[data-tb=binder]');H.assert(await l.count()===1,'Configured toolbar item visible');H.assert(await l.locator('svg').count()===(mode==='text'?0:1),'Icon display mode applied');H.assert(await l.locator('.tb-label').count()===(mode==='icon'?0:1),'Text display mode applied');},async H=>{await H.settingsFixture({toolbars:{top:['binder','settings'],format:[],seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H);},['customizeToolbar']);
  // Each actual command row from the source registry: record, save, clear, reset and verify no command ran while recording.
  const appSource=fs.readFileSync(path.join(H.ROOT,'src/App.jsx'),'utf8');const start=appSource.indexOf('const commandList'),end=appSource.indexOf('const activeCommands',start);
  const commandRows=[...appSource.slice(start,end).matchAll(/\['(file|edit|view|nav|project|document|format|tools|window)', '([^']+)'/g)].map(m=>m[2]);
  const scriptIds=[...fs.readFileSync(path.join(H.ROOT,'src/lib/scriptFormats.js'),'utf8').matchAll(/^  id: '([^']+)'/gm)].map(m=>'script_'+m[1]);
  for(const id of [...new Set([...commandRows,...scriptIds,'layout:0'])])add('shortcut-row-'+safeId(id),'ShortcutsDialog',id+' record/save/clear/reset',async H=>{
    const label=await H.p.evaluate(id=>{return [...document.querySelectorAll('.shortcut-row')].find(r=>r.querySelector('input').getAttribute('aria-label')?.startsWith(document.querySelector('[data-command-id="'+id+'"]')?.getAttribute('aria-label')||'__absent__'))?.textContent;},id).catch(()=>null);
    // Registry labels are localized, including hidden/inapp-only commands; derive the row label from i18n, not native visibility.
    const ro=readTranslations(H);const literal=[...appSource.slice(start,end).matchAll(/\['(?:file|edit|view|nav|project|document|format|tools|window)', '([^']+)', '([^']+)'/g)].find(m=>m[1]===id)?.[2];const name=id==='layout:0'?'Layout: QA layout':id.startsWith('script_')?(ro['ui.app.mod_scenariu_x']||'Mod scenariu: {label}').replace('{label}',ro['ui.scriptFormat.'+id.slice(7)]):ro['cmd.'+id]||literal;
    const rows=H.p.locator('.shortcut-row');let row;
    if(name)row=rows.filter({has:H.p.locator('input[aria-label='+JSON.stringify(name+': '+ro['ui.stylesDialog.scurtatura'])+']')});
    else {H.assert(label,'Registry row label known for '+id);row=rows.filter({hasText:label}).first();}
    H.assert(await row.count()===1,'Every registry command has a shortcut editor row: '+id);H._shortcutRowName=await row.locator('input').getAttribute('aria-label');const before=H.project(),html=H.doc();
    await row.locator('input').focus();await row.locator('input').press('Control+Alt+Shift+F12');H.assert(await row.locator('input').inputValue()==='Ctrl+Alt+Shift+F12','Recorded normalized combo');H.assert(same(H.project(),before)&&H.doc()===html,'Recording did not execute a business command');
    await closeSave(H);await H.wait(async()=>(await settings(H)).shortcuts[id]==='Ctrl+Alt+Shift+F12');
    await H.command('shortcuts');row=H.p.locator('.shortcut-row').filter({has:H.p.locator('input[aria-label='+JSON.stringify(H._shortcutRowName)+']')});await row.locator('input').focus();await row.locator('input').press('Backspace');await closeSave(H);await H.wait(async()=>(await settings(H)).shortcuts[id]==='');
    await H.command('shortcuts');row=H.p.locator('.shortcut-row').filter({has:H.p.locator('input[aria-label='+JSON.stringify(H._shortcutRowName)+']')});await row.getByRole('button').click();await closeSave(H);
  },async H=>{await H.wait(async()=>!Object.prototype.hasOwnProperty.call((await settings(H)).shortcuts,id));await H.command('shortcuts');const l=H.p.locator('input[aria-label='+JSON.stringify(H._shortcutRowName)+']');H.assert(await l.count()===1,'Row still accessible after reset');const keysSource=fs.readFileSync(path.join(H.ROOT,'src/lib/commands.js'),'utf8');const keyBlock=keysSource.slice(keysSource.indexOf('export const DEFAULT_KEYS'),keysSource.indexOf('// Effective shortcut'));const expected=[...keyBlock.matchAll(/([A-Za-z0-9_]+): '([^']*)'/g)].find(m=>m[1]===id)?.[2]||'';H.assert(await l.inputValue()===expected,'Per-row default restored exact registry shortcut');},async H=>{await H.settingsFixture({layouts:[fixtureLayout()],shortcuts:{}});await H.command('shortcuts');await H.p.waitForSelector('.shortcut-table');},['shortcuts',id]);
  // Six viewport/theme combinations for every tab, section and dependent pane state.
  const surfaces=[...PLAN.tabs,...PLAN.sections.map(s=>'look:'+s),...PLAN.geometryExtra];
  for(const [width,height]of [[960,720],[1733,1048]])for(const theme of ['light','dark','sepia'])for(const surface of surfaces)add(`geometry-${width}x${height}-${theme}-${safeId(surface)}`,surface,'every visible control / label / Tab / reverse Tab / focus / ARIA',async H=>{},async H=>auditGeometry(H,surface),async H=>{
    await H.p.setViewportSize({width,height});await H.settingsFixture({theme,uiStyle:'classic',language:'ro',speechEngine:'local',binderAltRows:true,outAltRows:true,compBgImage:'data:image/png;base64,'+IMG.buffer.toString('base64'),compBarAutoHide:true,corkBg:surface==='cork-color'?'color':'image',accounts:[],services:{},layouts:[],shortcuts:{}});await geomOpen(H,surface);
  },surface.startsWith('dfp')?['projectSettings']:surface.startsWith('toolbar')?['customizeToolbar']:surface==='shortcuts'?['shortcuts']:surface.startsWith('layouts')?['manageLayouts']:surface==='ai'?['aiSettings']:['settings']);
  registerEffects(H,add);
  registerFixed(H,add);
};
function readTranslations(H) {
  // Parse string literals only from the local reviewed Romanian dictionaries. No product functions execute.
  const out={};for(const f of ['src/lib/i18n-ui.js','src/lib/i18n.js']){
    let text=fs.readFileSync(path.join(H.ROOT,f),'utf8');text=text.slice(0,text.indexOf(f.includes('i18n-ui')?'export const uiEn':'const en ='));
    for(const m of text.matchAll(/(?:'([^']+)'|"([^"]+)")\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)){
      const val=m[3];try{out[m[1]||m[2]]=val[0]==='"'?JSON.parse(val):val.slice(1,-1).replace(/\\'/g,"'").replace(/\\n/g,'\n').replace(/\\\\/g,'\\');}catch{}
    }
  }return out;
}
function registerFixed(H,add) {
  const t=(id,s,c,act,verify,setup,commands,routes)=>add(id,s,c,act,verify,setup,commands,routes);
  for(const [id,command,selector]of [['settings-native','settings','.settings-dialog'],['ai-native','aiSettings','.settings-dialog'],['shortcuts-native','shortcuts','.shortcut-table'],['toolbar-native','customizeToolbar','.tb-customize'],['layouts-native','manageLayouts','.layouts-dialog']])t(id,'Native menu',command,async H=>{await H.editor().focus();await H.native(OPEN_ROUTES[command]);},async H=>{H.assert(await H.p.locator(selector).isVisible(),'Native callback reached expected content');H.assert(await H.modal().evaluate(e=>e.contains(document.activeElement)),'Focus transferred to dialog');await H.p.keyboard.press('Escape');await H.wait(async()=>!await H.p.locator(selector).count());H.assert(await H.editor().evaluate(e=>e.contains(document.activeElement)),'Focus/context returns to selected document');},undefined,[command],[OPEN_ROUTES[command]]);
  t('settings-keyboard-door','SettingsDialog/keyboard','Configurează scurtăturile',async H=>{await body(H).getByRole('button').click();},async H=>{H.assert(await H.p.locator('.shortcut-table').isVisible(),'Shortcut table content reached');await cancel(H);H.assert(await H.editor().isVisible(),'Return to document, not orphaned settings');},async H=>open(H,'keyboard'),['settings','shortcuts']);
  for(const [suffix,tab,target]of [['general','general','tinte'],['editorial','editorial','editorial']])t('settings-project-door-'+suffix,'SettingsDialog/'+tab,'project settings door',async H=>{await body(H).locator('.project-door button').click();},async H=>{H.assert(await H.p.locator('#ps-tab-'+target).getAttribute('aria-selected')==='true','Project door selects exact context '+target);H.assert(await H.p.locator('#ps-pane').isVisible(),'Project content visible');await cancel(H);H.assert(await H.editor().isVisible(),'Return to editor');},async H=>open(H,tab),['settings','projectSettings']);
  t('ai-project-door','SettingsDialog/ai','project AI door',async H=>{await body(H).locator('.project-door button').click();},async H=>{H.assert(await H.modal().innerText().then(x=>/Setări AI proiect|proiect/i.test(x)),'Program door reached project-specific AI content');H.assert(!await H.p.locator('.settings-dialog').count(),'Program settings not confused with project dialog');await cancel(H);H.assert(await H.editor().isVisible(),'Project-AI cancel returns to editor');},async H=>open(H,'ai'),['aiSettings','aiProjectSettings']);
  t('program-ai-separation','SettingsDialog','tab inventories and AI isolation',async H=>{H._tabs=await H.p.locator('.settings-dialog [role=tab]').allTextContents();await cancel(H);await open(H,'ai');},async H=>{H.assert(same(H._tabs.map(x=>x.trim()),TAB_NAMES),'All 12 program tabs, AI excluded');H.assert(!await H.p.locator('.settings-dialog [role=tablist]').isVisible(),'AI-only dialog has no program tablist');H.assert(await body(H).getByText('Furnizor AI',{exact:true}).isVisible(),'AI provider content');},async H=>open(H),['settings','aiSettings']);
  for(const [id,mode]of [['settings-cancel','cancel'],['settings-escape-dirty','escape'],['settings-backdrop-dirty','backdrop'],['settings-close-x','x']])t(id,'SettingsDialog/general','discard edit '+mode,async H=>{
    H._prior=await settings(H);await body(H).locator('input[type=number]').fill('29');if(mode==='cancel')await cancel(H);else if(mode==='escape')await H.p.keyboard.press('Escape');else if(mode==='x')await H.modal().locator(':scope > .modal-x').click();else await H.p.locator('.modal-backdrop').click({position:{x:2,y:2}});
  },async H=>{await H.wait(async()=>!await H.p.locator('.settings-dialog').count());H.assert((await settings(H)).autosaveSec===H._prior.autosaveSec,'Discard does not persist typed autosave');H.assert(await H.editor().isVisible(),'Document context preserved');},async H=>open(H));
  t('settings-tab-return','SettingsDialog','every tab keeps draft and selected context',async H=>{await body(H).locator('input[type=number]').fill('11');for(let i=0;i<PLAN.tabs.length;i++){const tabs=H.p.locator('.settings-dialog [role=tab]');await tabs.nth(i).click();H.assert(await tabs.nth(i).getAttribute('aria-selected')==='true','Tab selected '+PLAN.tabs[i]);H.assert(await body(H).isVisible(),'Tab content '+PLAN.tabs[i]);}await H.p.locator('.settings-dialog [role=tab]').first().click();},async H=>{H.assert(await body(H).locator('input[type=number]').inputValue()==='11','Unsaved field survives full tab traversal');await closeSave(H);await H.wait(async()=>(await settings(H)).autosaveSec===11);},async H=>open(H));
  t('general-update-door','SettingsDialog/general','manual update door',async H=>{await body(H).locator('button').first().click();},async H=>{H.assert(await H.modal().innerText().then(x=>/actualiz/i.test(x)),'Update dialog contains update information/action');H.assert(!await H.p.locator('.settings-dialog').count(),'Settings replaced by update context');H.limit('live-update-install','Only navigation to updater is covered; actual network update/download/install is outside program-settings fixture safety.');},async H=>open(H),['settings','checkUpdates']);
  for(const mode of ['choose','clear','cancel'])t('scratch-folder-'+mode,'SettingsDialog/general','scratch folder '+mode,async H=>{
    const row=body(H).locator('input[readonly]').locator('xpath=..');H._path=path.join(H.W,'scratch-qa');fs.mkdirSync(H._path,{recursive:true});if(mode==='clear')await row.getByRole('button').last().click();else{await H.answer(mode==='cancel'?null:H._path);await row.getByRole('button').first().click();}await closeSave(H);
  },async H=>{await H.wait(async()=>(await settings(H)).scratchFolder===(mode==='clear'?'':mode==='cancel'?H.W:H._path));},async H=>{await H.settingsFixture({scratchFolder:mode==='choose'?'':H.W});await open(H);});
  for(const mode of ['choose','reset','cancel'])t('backup-dir-'+mode,'SettingsDialog/backup','backup folder '+mode,async H=>{
    H._path=path.join(H.W,'backup-program-qa');fs.mkdirSync(H._path,{recursive:true});const row=body(H).locator('input[readonly]').first().locator('xpath=..');if(mode==='reset')await row.getByRole('button',{name:'Implicit',exact:true}).click();else {await H.answer(mode==='cancel'?null:H._path);await row.getByRole('button',{name:'Alege…',exact:true}).click();}await closeSave(H);
  },async H=>{await H.wait(async()=>(await settings(H)).backupDir===(mode==='reset'?'':mode==='cancel'?H.W:H._path));},async H=>{await H.settingsFixture({backupDir:mode==='choose'?'':H.W});await open(H,'backup');});
  t('backup-open-shell','SettingsDialog/backup','open backup directory',async H=>{await body(H).getByRole('button',{name:'Deschide folderul de backup',exact:true}).click();},async H=>{await H.wait(async()=>(await H.effects()).some(e=>e.kind==='external-file'&&path.resolve(e.file)===path.resolve(H.W)));H.assert(await H.p.locator('.settings-dialog').isVisible(),'Backup pane retained');H.limit('shell-folder','shell.openPath captured: dispatch/path verified, Windows Explorer not live-traversed.');},async H=>{await H.settingsFixture({backupDir:H.W});await open(H,'backup');});
  t('backup-readonly-paths','SettingsDialog/backup','backupDir and backupToDir informational fields',async H=>{H._fields=await body(H).locator('input[readonly]').evaluateAll(es=>es.map(e=>({v:e.value,readonly:e.readOnly,disabled:e.disabled})));},async H=>{H.assert(H._fields.length===2&&H._fields.every(e=>e.readonly),'Both backup folder fields readonly');H.assert(H._fields[1].disabled&&H._fields[1].v===H.W,'Last backup-to path disabled but displayed accurately');},async H=>{await H.settingsFixture({backupToDir:H.W});await open(H,'backup');});
  t('team-machine-readonly','SettingsDialog/sharing','machine ID informational',async H=>{},async H=>{const l=body(H).locator('input[readonly][disabled]');H.assert(await l.inputValue()==='qa-machine-id','Machine ID displays exact fixture identity');H.assert(await l.isDisabled(),'Machine ID is not editable');},async H=>{await H.settingsFixture({team:{name:'QA',color:'#123456',machine:'qa-machine-id'}});await open(H,'sharing');});
  for(const mode of ['add','edit','delete','empty'])t(mode==='empty'?'replacement-empty-filter':'replacement-'+mode+'-save','SettingsDialog/corrections','replacement '+mode,async H=>{
    const f=body(H).locator('fieldset').filter({has:H.p.locator('input[aria-label="Înlocuiește"]')});
    if(mode==='add'||mode==='empty')await body(H).getByRole('button',{name:'Adaugă',exact:true}).click();
    if(mode==='delete')await f.getByRole('button',{name:'Șterge',exact:true}).click();
    else {const row=body(H).locator('input[aria-label="Înlocuiește"]').last();await row.fill(mode==='empty'?'   ':'qafrom');await body(H).locator('input[aria-label="Cu"]').last().fill('qato');}await closeSave(H);
  },async H=>{const rs=(await settings(H)).autoReplacements;H.assert((mode==='delete'||mode==='empty')?rs.length===0:rs.some(r=>r.from==='qafrom'&&r.to==='qato'&&!r.learned),'Replacement exact saved/filter/delete effect');},async H=>{await H.settingsFixture({autoReplacements:mode==='edit'||mode==='delete'?[{from:'oldqa',to:'oldvalue',learned:true}]:[]});await open(H,'corrections');});
  t('dictionary-filter-delete','SettingsDialog/corrections','personal dictionary >8 filter/remove',async H=>{
    const f=body(H).locator('fieldset').filter({hasText:'Dicționar personal'});const filter=f.locator('input');await filter.fill('qadict9');H.assert(await f.getByRole('button',{name:'Șterge',exact:true}).count()===1,'Dictionary filter reduces to exact fixture word');await f.getByRole('button',{name:'Șterge',exact:true}).click();
  },async H=>{await H.wait(async()=>!(await H.p.evaluate(()=>window.api.listDictionaryWords())).includes('qadict9'));H.assert(await body(H).locator('fieldset').filter({hasText:'Dicționar personal'}).getByRole('button',{name:'Șterge',exact:true}).count()===0,'Filtered removed word absent');},async H=>{await H.app.evaluate(({BrowserWindow},{wid})=>{const session=BrowserWindow.fromId(wid).webContents.session;for(let i=0;i<10;i++)session.addWordToSpellCheckerDictionary('qadict'+i);},{wid:H.windowId});await open(H,'corrections');});
  const themes=H=>H.p.locator('.look-themes');
  t('theme-save-load','AppearancePane/themes','name/save/select/load/save settings',async H=>{await themes(H).locator('input:not([type=file])').fill('QA theme');await body(H,true).locator('select').first().selectOption('sepia');await themes(H).getByRole('button',{name:'Salvează tema',exact:true}).click();await body(H,true).locator('select').first().selectOption('dark');await themes(H).locator('select').selectOption('QA theme');await themes(H).getByRole('button',{name:'Încarcă tema',exact:true}).click();H.assert(await body(H,true).locator('select').first().inputValue()==='sepia','Load restores theme values');await closeSave(H);},async H=>{const s=await settings(H);H.assert(s.theme==='sepia'&&s.savedThemes.find(x=>x.name==='QA theme').values.theme==='sepia','Theme object and applied settings persisted');},async H=>open(H,'appearance','general'));
  t('theme-overwrite-delete','AppearancePane/themes','overwrite same name/delete',async H=>{await themes(H).locator('input:not([type=file])').fill('QA theme');await themes(H).getByRole('button',{name:'Salvează tema',exact:true}).click();await themes(H).getByRole('button',{name:'Salvează tema',exact:true}).click();H.assert(await themes(H).locator('select option[value="QA theme"]').count()===1,'Duplicate theme name replaced, not appended');await themes(H).getByRole('button',{name:'Șterge',exact:true}).click();await closeSave(H);},async H=>{H.assert(!(await settings(H)).savedThemes.some(x=>x.name==='QA theme'),'Deleted fixture theme removed from persisted list');},async H=>open(H,'appearance','general'));
  t('theme-empty-name','AppearancePane/themes','empty name validation',async H=>{await themes(H).getByRole('button',{name:'Salvează tema',exact:true}).click();},async H=>{H.assert(await H.modal().getByRole('status').innerText().then(x=>/nume/i.test(x)),'Theme name required feedback');H.assert(await themes(H).locator('select option').count()===1,'No nameless theme added');},async H=>{await H.settingsFixture({savedThemes:[]});await open(H,'appearance','general');});
  t('theme-reset-all','AppearancePane/themes','reset colors/fonts with KEEP values',async H=>{await themes(H).getByRole('button',{name:'Toate culorile la implicit',exact:true}).click();await closeSave(H);},async H=>{const s=await settings(H);H.assert(s.edBg===''&&s.binderFont===''&&s.theme==='sepia'&&s.fontSize===23,'Reset clears colors/optional fonts but preserves selected theme and text size');await checkCss(H,'edBg','');},async H=>{await H.settingsFixture({edBg:'#123456',binderFont:'Arial, sans-serif',theme:'sepia',fontSize:23});await open(H,'appearance','general');});
  t('theme-export','AppearancePane/themes','export actual JSON',async H=>{await themes(H).locator('input:not([type=file])').fill('QA:theme');await body(H,true).locator('select').first().selectOption('sepia');H._download=await download(H,themes(H).getByRole('button',{name:'Exportă…',exact:true}),'qa-theme.scribnertheme');},async H=>{const o=JSON.parse(H._download.text);H.assert(o.format==='pneuma-theme'&&o.version===1&&o.name==='QA:theme'&&o.values.theme==='sepia','Export includes current unsaved draft, schema/version/name/value');H.assert(H._download.name==='QA_theme.scribnertheme','Unsafe filename sanitized');},async H=>open(H,'appearance','general'));
  for(const invalid of [false,true])t(invalid?'theme-invalid-import':'theme-import','AppearancePane/themes','theme import '+(invalid?'invalid':'valid'),async H=>{H._prior=await settings(H);await themes(H).locator('input[type=file]').setInputFiles({name:'qa.scribnertheme',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid?{bad:true}:{format:'pneuma-theme',version:1,name:'Imported QA',values:{theme:'dark',edBg:'#123456',authorName:'must-not-import'}}))});if(!invalid){await H.wait(async()=>await themes(H).locator('select').inputValue()==='Imported QA');await closeSave(H);}},async H=>{if(invalid){H.assert(await H.p.locator('.error,.error-banner,[role=alert]').filter({hasText:/temă|valid/i}).count()>0,'Invalid theme surfaced error');H.assert(same((await settings(H)).savedThemes,H._prior.savedThemes),'Invalid import did not mutate saved themes');}else{const s=await settings(H);H.assert(s.theme==='dark'&&s.edBg==='#123456'&&s.authorName!=='must-not-import'&&s.savedThemes.some(x=>x.name==='Imported QA'),'Valid theme applies allowlisted values, excludes behavioral key');}},async H=>open(H,'appearance','general'));
  for(const which of ['cork','composition'])t(which==='cork'?'cork-image-import':'composition-image-import','AppearancePane/'+(which==='cork'?'corkboard':'composition'),'file input image/data URL',async H=>{const l=body(H,true).locator('input[type=file]');await l.setInputFiles(IMG);await H.sleep(150);await closeSave(H);await H.select('folder-a');await H.command(which==='cork'?'viewCorkboard':'composition');},async H=>{const s=await settings(H),key=which==='cork'?'corkBgImage':'compBgImage';H.assert(s[key]==='data:image/png;base64,'+IMG.buffer.toString('base64'),'Exact imported image persists');H.assert(await H.p.locator(which==='cork'?'.corkboard':'.app.composition.has-bg-image').isVisible(),'Target surface displays image mode');},async H=>{await H.settingsFixture({corkBg:'image',compBgImage:''});await open(H,'appearance',which==='cork'?'corkboard':'composition');});
  t('composition-image-remove','AppearancePane/composition','remove image',async H=>{await body(H,true).getByRole('button',{name:'Fără imagine',exact:true}).click();await closeSave(H);await H.command('composition');},async H=>{H.assert((await settings(H)).compBgImage===''&&!await H.p.locator('.app.has-bg-image').count(),'Removed composition background and class');},async H=>{await H.settingsFixture({compBgImage:'data:image/png;base64,'+IMG.buffer.toString('base64')});await open(H,'appearance','composition');});
  t('composition-bg-default','AppearancePane/composition','background default',async H=>{await body(H,true).getByRole('button',{name:'Fundal implicit',exact:true}).click();await closeSave(H);},async H=>{await H.wait(async()=>(await settings(H)).compBg==='');},async H=>{await H.settingsFixture({compBg:'#123456'});await open(H,'appearance','composition');});
  t('revision-default','AppearancePane/general','all five revision rounds default',async H=>{await body(H,true).locator('.revision-colors').getByRole('button',{name:'Implicit',exact:true}).click();await closeSave(H);},async H=>{H.assert(same((await settings(H)).revisionColors,['#c62828','#1565c0','#2e7d32','#6a1b9a','#ef6c00']),'Five exact revision defaults persisted');},async H=>{await H.settingsFixture({revisionColors:Array(5).fill('#123456')});await open(H,'appearance','general');});
  for(const [engine,index]of [['local',0],['dted',1]])t('speech-engine-'+engine,'SettingsDialog/services','speech engine '+engine,async H=>{await body(H).locator('input[name=speechEngine]').nth(index).check();await closeSave(H);},async H=>{await H.wait(async()=>(await settings(H)).speechEngine===engine);await open(H,'services');H.assert(await body(H).locator('input[name=speechEngine]').nth(index).isChecked(),'Engine selection rehydrated');H.assert(await body(H).locator(engine==='local'?'.local-engine':'input[placeholder]').count()>0,'Selected engine controls exposed');},async H=>open(H,'services'));
  for(const [variant,index]of [['cpu',0],['cuda',1]])t('local-variant-'+variant,'LocalEngine','CPU/CUDA radio',async H=>{await H.p.locator('input[name=whisperVariant]').nth(index).check();},async H=>{H.assert(await H.p.locator('input[name=whisperVariant]').nth(index).isChecked(),'Explicit variant radio changes');H.assert(!await H.p.locator('input[name=whisperVariant]').nth(1-index).isChecked(),'Variants mutually exclusive');H.limit('local-engine-download-'+variant,'Variant selection verified. Download/install/remove uses shared external engine storage (not the project fixture), substantial network/hardware; no permission to alter user-installed engines or record live audio.');},async H=>{await H.settingsFixture({speechEngine:'local'});await open(H,'services');await H.p.waitForSelector('input[name=whisperVariant]');});
  t('dted-check-invalid-rollback','SettingsDialog/services','invalid executable check + cancel rollback',async H=>{await body(H).locator('input[placeholder]').first().fill(path.join(H.W,'nonexistent-qa-DTED.exe'));await body(H).getByRole('button',{name:'Verifică',exact:true}).click();await H.wait(async()=>await body(H).getByRole('status').count()>0);await cancel(H);},async H=>{await H.wait(async()=>(await settings(H)).dtedPath==='');H.assert(await H.editor().isVisible(),'Cancel restores stored D&TED path and returns to editor');},async H=>{await H.settingsFixture({speechEngine:'dted',dtedPath:''});await open(H,'services');});
  t('dfp-use-global','DefaultFormatPane','use global disables and drops override',async H=>{await H.p.locator('.dfp-global').check();H.assert(await H.p.locator('.dfp input:not(.dfp-global),.dfp select,.dfp-mark').evaluateAll(es=>es.every(e=>e.disabled)),'All format controls disabled under global');await closeSave(H);},async H=>{H.assert(H.project().defaultFormatting===null,'Global removes entire project formatting override');await dfpOpen(H);H.assert(await H.p.locator('.dfp-global').isChecked(),'Global checked on reopen');},async H=>{await H.fixture(async p=>{p.defaultFormatting={size:22,font:'Arial, sans-serif'};});await dfpOpen(H);},['projectSettings']);
  t('dfp-cancel','DefaultFormatPane','cancel project override',async H=>{await H.p.locator('.dfp input[type=number]').first().fill('31');await cancel(H);},async H=>{H.assert(!H.project().defaultFormatting,'Cancelled format not saved to project');},async H=>customDfp(H),['projectSettings']);
  t('dfp-new-document-effect','DefaultFormatPane','default paragraph applied to new document',async H=>{await H.p.locator('.dfp input[type=number]').first().fill('22');await H.p.locator('.dfp input[type=number]').nth(1).fill('1.25');await H.p.locator('.dfp select').nth(1).selectOption('center');await closeSave(H);await H.command('newText');await H.editor().click();await H.p.keyboard.type('Text nou QA');await H.save();},async H=>{const n=H.flat(H.project().tree).find(n=>!['doc-a','doc-b','template-a','trashed-a'].includes(n.id)&&n.type==='text');H.assert(n,'Actual new fixture document created');const html=H.doc(n.id);H.assert(html.includes('Text nou QA')&&/font-size:\s*22px/.test(html)&&/text-indent:\s*1.25em/.test(html)&&/text-align:\s*center/.test(html),'Saved new-document HTML has exact project default paragraph styles');},async H=>customDfp(H),['projectSettings','newText','save']);
  t('dfp-convert-default-effect','DefaultFormatPane','convert actual draft documents',async H=>{await H.p.locator('.dfp input[type=number]').first().fill('24');await H.p.locator('.dfp select').nth(1).selectOption('right');await closeSave(H);await H.command('convertDefaultDraft');const yes=H.modal().getByRole('button',{name:/Convertește|Aplică|Da/});if(await yes.count())await yes.first().click();await H.save();},async H=>{await H.wait(()=>/font-size:\s*24px/.test(H.doc('doc-a'))&&/text-align:\s*right/.test(H.doc('doc-a')));H.assert(H.doc('doc-b').includes('Text separat'),'Conversion preserves other draft content');H.assert(H.doc('template-a')===H.files['docs/template-a.html'],'Draft-only conversion excludes research template');},async H=>customDfp(H),['projectSettings','convertDefaultDraft','save']);
  t('shortcut-conflict','ShortcutsDialog','duplicate warnings on both rows',async H=>{const rows=H.p.locator('.shortcut-row').filter({hasText:/Salvează acum|Compilează…/});for(const row of await rows.all()){await row.locator('input').focus();await row.locator('input').press('Control+Alt+Shift+F12');}},async H=>{H.assert(await H.p.locator('.shortcut-row.conflict').count()===2,'Both conflicting shortcuts flagged');H.assert(await H.modal().locator('.warn').isVisible(),'Duplicate explanation visible');},async H=>{await H.command('shortcuts');},['shortcuts']);
  t('shortcut-escape-recording','ShortcutsDialog','Esc cancels recording not dialog',async H=>{const l=H.p.locator('.shortcut-row input').first();H._old=await l.inputValue();await l.focus();await l.press('Escape');},async H=>{H.assert(await H.p.locator('.shortcut-table').isVisible(),'Esc recording keeps dialog');H.assert(await H.p.locator('.shortcut-row input').first().inputValue()===H._old,'Esc preserves shortcut');},async H=>H.command('shortcuts'),['shortcuts']);
  t('shortcut-cancel','ShortcutsDialog','cancel shortcut draft',async H=>{await H.p.locator('.shortcut-row input').first().focus();await H.p.locator('.shortcut-row input').first().press('Control+Alt+Shift+F12');await cancel(H);},async H=>{H.assert(!same((await settings(H)).shortcuts?.save,'Ctrl+Alt+Shift+F12'),'Cancelled recording not persisted');},async H=>H.command('shortcuts'),['shortcuts']);
  t('shortcut-reset-all','ShortcutsDialog','all defaults',async H=>{await H.modal().getByRole('button',{name:'Toate la implicit',exact:true}).click();await closeSave(H);},async H=>{H.assert(same((await settings(H)).shortcuts,{}),'All custom overrides removed');},async H=>{await H.settingsFixture({shortcuts:{save:'F12',newText:'F10'}});await H.command('shortcuts');},['shortcuts']);
  t('shortcut-custom-execution','ShortcutsDialog','saved shortcut actually toggles binder',async H=>{const row=H.p.locator('.shortcut-row').filter({hasText:'Arată / ascunde binderul'});H.assert(await row.count()===1,'Canonical binder row present');await row.locator('input').focus();await row.locator('input').press('Control+Alt+Shift+F12');await closeSave(H);await H.editor().focus();await H.p.keyboard.press('Control+Alt+Shift+F12');},async H=>{await H.wait(async()=>!await H.p.locator('.binder').isVisible());H.assert((await settings(H)).shortcuts.toggleBinder==='Ctrl+Alt+Shift+F12','Saved shortcut maps to canonical command');await H.p.keyboard.press('Control+Alt+Shift+F12');await H.wait(()=>H.p.locator('.binder').isVisible());},async H=>H.command('shortcuts'),['shortcuts','toggleBinder']);
  t('toolbar-cancel','ToolbarCustomizeDialog','cancel unsaved item/display',async H=>{await av(H).getByRole('option').first().dblclick();await H.modal().locator('select').selectOption('text');await cancel(H);},async H=>{H.assert(same((await settings(H)).toolbars,H._toolbarPrior),'Toolbar cancel leaves saved preferences unchanged');},async H=>{H._toolbarPrior=(await settings(H)).toolbars;await openToolbar(H);},['customizeToolbar']);
  t('toolbar-restore','ToolbarCustomizeDialog','restore both lists/display',async H=>{await H.modal().getByRole('button',{name:'Restabilește implicit',exact:true}).click();await closeSave(H);},async H=>{const s=(await settings(H)).toolbars;H.assert(same(s.top,PLAN.topDefault)&&same(s.format,PLAN.formatDefault)&&s.display==='iconText','Exact toolbar default order for both bars');},async H=>{await H.settingsFixture({toolbars:{top:['settings'],format:['undo'],display:'text',seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H);},['customizeToolbar']);
  t('toolbar-keyboard-order','ToolbarCustomizeDialog','Enter add/arrow select/Alt arrows/Delete',async H=>{await av(H).getByRole('option').first().click();await av(H).focus();await av(H).press('Enter');H.assert(await cur(H).getByRole('option').count()===3,'Enter adds selected available item');await cur(H).getByRole('option').nth(1).click();await cur(H).focus();await cur(H).press('Alt+ArrowUp');H.assert(await cur(H).getByRole('option').first().getAttribute('aria-selected')==='true','Alt-Up moves selected item');await cur(H).press('Alt+ArrowDown');await cur(H).press('ArrowDown');await cur(H).press('Delete');await closeSave(H);},async H=>{H.assert(same((await settings(H)).toolbars.top,['settings','binder']),'Keyboard order/removal exact persisted array');},async H=>{await H.settingsFixture({toolbars:{top:['settings','binder'],format:[],seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H);},['customizeToolbar']);
  t('toolbar-drag-add-order-remove','ToolbarCustomizeDialog','drag available/current/removal',async H=>{await av(H).getByRole('option').first().dragTo(cur(H));H.assert(await cur(H).getByRole('option').count()===3,'Drag from palette adds');await cur(H).getByRole('option').last().dragTo(cur(H).getByRole('option').first());H.assert(await cur(H).getByRole('option').first().innerText().then(x=>/proiect/i.test(x)),'Drag reorders to first');await cur(H).getByRole('option').first().dragTo(av(H));await closeSave(H);},async H=>{H.assert(same((await settings(H)).toolbars.top,['settings','binder']),'Drop to available removes and preserves remaining order');},async H=>{await H.settingsFixture({toolbars:{top:['settings','binder'],format:[],seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H);},['customizeToolbar']);
  t('toolbar-boundary-buttons','ToolbarCustomizeDialog','disabled add/remove/up/down boundaries',async H=>{H._states=await H.modal().locator('.tb-mid button').evaluateAll(es=>es.map(e=>e.disabled));await cur(H).getByRole('option').first().click();},async H=>{H.assert(same(H._states,[true,true,true,true]),'No selection disables all manipulation buttons');const s=await H.modal().locator('.tb-mid button').evaluateAll(es=>es.map(e=>e.disabled));H.assert(same(s,[true,false,true,true]),'Singleton cannot move up or down but can remove');},async H=>{await H.settingsFixture({toolbars:{top:['settings'],format:[],seen:{top:PLAN.topIds,format:PLAN.formatIds}}});await openToolbar(H);},['customizeToolbar']);
  t('layout-save-current','Layouts/menu','save current arrangement',async H=>{await H.command('saveLayout');const dialog=H.modal();if(await dialog.locator('input').count()){await dialog.locator('input').fill('QA saved arrangement');await dialog.getByRole('button',{name:/OK|Salvează|Confirmă/}).click();}},async H=>{await H.wait(async()=>(await settings(H)).layouts.some(l=>l.name==='QA saved arrangement'));const l=(await settings(H)).layouts.find(l=>l.name==='QA saved arrangement');H.assert(l.view==='editor'&&!l.split&&typeof l.hideBinder==='boolean'&&l.editorView&&l.widths,'Current arrangement payload captured, not document identity');H.assert(!('selectedId'in l),'Layout excludes selected document identity');},async H=>{await H.settingsFixture({layouts:[]});},['saveLayout'],[['Fereastră','Salvează layout-ul curent…']]);
  t('layout-rename','LayoutsDialog','rename on blur',async H=>{await H.modal().locator('.layout-list input').fill('QA renamed');await H.modal().locator('h3').click();},async H=>{await H.wait(async()=>(await settings(H)).layouts[0].name==='QA renamed');H.assert(await H.modal().locator('.layout-list input').inputValue()==='QA renamed','Renamed value remains in UI');},async H=>layoutOpen(H),['manageLayouts']);
  t('layout-delete','LayoutsDialog','delete fixture arrangement',async H=>{await H.modal().locator('.layout-list').getByRole('button',{name:'Șterge',exact:true}).click();},async H=>{await H.wait(async()=>(await settings(H)).layouts.length===0);H.assert(await H.modal().locator('.layout-list li').count()===0,'Deleted row absent');},async H=>layoutOpen(H),['manageLayouts']);
  for(const [id,valid,replace]of [['layout-import',true,false],['layout-import-replace',true,true],['layout-invalid-import',false,false]])t(id,'LayoutsDialog','import JSON '+id,async H=>{H._before=(await settings(H)).layouts;await H.modal().locator('input[type=file]').setInputFiles({name:'fixture.scribner-layout.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(valid?{kind:'pneuma-layout',version:1,layout:{...fixtureLayout(replace?'QA layout':'QA imported'),hideBinder:true}}:{kind:'not-layout'}))});},async H=>{if(valid){await H.wait(async()=>(await settings(H)).layouts.some(l=>l.name===(replace?'QA layout':'QA imported')&&l.hideBinder));H.assert((await settings(H)).layouts.length===(replace?1:2),'Import adds or replaces matching name precisely');}else{H.assert(await H.p.locator('.error,.error-banner,[role=alert]').count()>0,'Invalid layout import surfaces an error');H.assert(same((await settings(H)).layouts,H._before),'Invalid layout did not change stored arrangements');}},async H=>layoutOpen(H),['manageLayouts']);
  t('layout-export','LayoutsDialog','export real JSON file',async H=>{H._download=await download(H,H.modal().locator('.ly-export'),'qa-layout.json');},async H=>{const d=JSON.parse(H._download.text);H.assert(d.kind==='pneuma-layout'&&d.version===1&&same(d.layout,fixtureLayout()),'Export exact complete saved layout payload');H.assert(H._download.name==='QA layout.scribner-layout.json','Layout file name/extension exact');},async H=>layoutOpen(H),['manageLayouts']);
  t('layout-thumbnail','LayoutsDialog','schematic has accessible name and captured panel geometry',async H=>{},async H=>{const img=H.modal().locator('svg[role=img]');H.assert((await img.getAttribute('aria-label')).includes('QA layout'),'Thumbnail named for saved layout');H.assert(await img.locator('[data-kind=binder]').count()===1&&await img.locator('[data-kind=editor]').count()===1&&!await img.locator('[data-kind=inspector]').count(),'Thumbnail matches actual saved panel state');},async H=>layoutOpen(H),['manageLayouts']);
  t('layout-apply-complex','LayoutsDialog','apply split/widths/columns/cork/editor-view arrangement',async H=>{await H.modal().getByRole('button',{name:'Aplică',exact:true}).click();await H.p.keyboard.press('Escape');await H.save();},async H=>{await H.wait(()=>H.p.locator('.workspace.split.split-h').isVisible());H.assert(await H.p.locator('.pane .ProseMirror').count()===2,'Layout restored actual split with doc-b');H.assert(await H.p.locator('.pane-title').last().innerText().then(x=>x.includes('Al doilea document')),'Split title/content uses exact fixture document');H.assert(await H.p.evaluate(()=>localStorage.getItem('pneuma-outline-columns'))==='["title","words"]','Outliner columns restored');H.assert(H.node('folder-a').cork?.mode==='freeform','Captured board settings saved into specific folder');const savedUi=await H.p.evaluate(dir=>JSON.parse(localStorage.getItem('pneuma-ui:'+dir)||'null'),H.dir);H.assert(savedUi?.splitId==='doc-b'&&savedUi.widths.binder===220,'Split and widths persisted in actual per-project localStorage UI state');},async H=>{await H.settingsFixture({layouts:[{...fixtureLayout(),split:true,splitId:'doc-b',splitHorizontal:true,editorView:{splitHorizontal:true},cork:{folderId:'folder-a',mode:'freeform'}}]});await H.command('manageLayouts');},['manageLayouts']);
  t('layout-empty-return','LayoutsDialog','empty state close/context return',async H=>{await H.modal().getByRole('button',{name:'Închide',exact:true}) .first().click();},async H=>{H.assert(await H.editor().isVisible()&&H.doc().includes('Prima frază'),'Empty layout close returns unchanged document');},async H=>{await layoutOpen(H,false);H.assert(await H.modal().getByText(/Niciun layout/).isVisible(),'Empty layout information');},['manageLayouts']);
  t('account-add-edit-delete','ServicesPanel/accounts','all form fields add/edit/delete',async H=>{await addAccount(H);let row=H.p.locator('.accounts li').filter({hasText:'QA account'});await row.getByRole('button',{name:'Editează',exact:true}).click();const ins=H.p.locator('.account-form input');H.assert(await ins.nth(3).inputValue()==='','Editing never exposes password');await ins.nth(0).fill('QA edited');await ins.nth(1).fill('https://example.invalid/edited');await ins.nth(2).fill('qa-user-edited');await H.p.locator('.account-form').getByRole('button',{name:'Salvează',exact:true}).click();await H.wait(async()=>(await H.p.evaluate(()=>window.api.servicesStatus())).accounts.some(a=>a.name==='QA edited'&&a.username==='qa-user-edited'&&a.hasPassword));row=H.p.locator('.accounts li').filter({hasText:'QA edited'});await row.getByRole('button',{name:'Șterge',exact:true}).click();},async H=>{await H.wait(async()=>(await H.p.evaluate(()=>window.api.servicesStatus())).accounts.length===0);H.assert(!JSON.parse(fs.readFileSync(path.join(H.W,'profile','settings.json'),'utf8')).accounts.length,'Fixture account actually deleted from settings file');},async H=>H.settingsFixture({accounts:[],services:{}}));
  t('account-cancel','ServicesPanel/accounts','cancel new form draft',async H=>{await H.p.locator('.services-panel > button').click();await H.p.locator('.account-form input').first().fill('QA cancelled');await H.p.locator('.account-form').getByRole('button',{name:'Anulează',exact:true}).click();},async H=>{H.assert(!await H.p.locator('.account-form').count(),'Cancelled form removed');H.assert(!(await H.p.evaluate(()=>window.api.servicesStatus())).accounts.some(a=>a.name==='QA cancelled'),'Cancelled draft never stored');},async H=>openAccounts(H));
  t('account-validation','ServicesPanel/accounts','empty name / invalid URL validation',async H=>{await H.p.locator('.services-panel > button').click();const form=H.p.locator('.account-form');await form.getByRole('button',{name:'Salvează',exact:true}).click();await H.wait(async()=>await H.p.locator('.services-panel > [role=status]').innerText().then(x=>/Numele.*lipsește/.test(x)));await form.locator('input').first().fill('QA invalid');await form.locator('input').nth(1).fill('ftp://example.invalid');await form.getByRole('button',{name:'Salvează',exact:true}).click();},async H=>{await H.wait(async()=>await H.p.locator('.services-panel > [role=status]').innerText().then(x=>/https/.test(x)));H.assert(!(await H.p.evaluate(()=>window.api.servicesStatus())).accounts.some(a=>a.name==='QA invalid'),'Invalid URL did not create account');},async H=>openAccounts(H));
  t('account-password-copy','ServicesPanel/accounts','copy dummy password through real clipboard',async H=>{await H.p.locator('.accounts li').getByRole('button',{name:'Copiază parola',exact:true}).click();},async H=>{H.assert(await H.app.evaluate(({clipboard})=>clipboard.readText())==='qa-password-not-real','Real clipboard contains exactly the dummy fixture password');const safe=await H.p.evaluate(()=>window.api.servicesStatus());H.assert(!JSON.stringify(safe).includes('qa-password-not-real'),'Secret absent from renderer status');},async H=>addAccount(H));
  t('account-site-shell','ServicesPanel/accounts','open exact fixture site',async H=>{await H.p.locator('.accounts li').getByRole('button',{name:'Deschide site-ul',exact:true}).click();},async H=>{await H.wait(async()=>(await H.effects()).some(e=>e.kind==='external-url'&&e.url==='https://example.invalid/qa'));H.limit('account-site-shell','Captured shell URL is an adapter effect; external site, credentials and browser navigation are not live verified.');},async H=>addAccount(H));
  t('oauth-unconfigured-gate','ServicesPanel/googleTranslate','OAuth Client ID and unconnected controls',async H=>{const l=serviceRow(H,'googleTranslate').locator('.oauth-block').first().locator('input');await l.fill('qa-client.apps.googleusercontent.com');},async H=>{const block=serviceRow(H,'googleTranslate').locator('.oauth-block').first();H.assert(await block.locator('input').inputValue()==='qa-client.apps.googleusercontent.com','Client ID editable draft');H.assert(await block.getByRole('button').first().isEnabled(),'Connect enabled only with Client ID');H.assert(!await block.getByRole('button',{name:/Deconect/}).count(),'No disconnect action while unconnected');H.limit('google-oauth-notebooklm-login','Connect/disconnect callback, browser sign-in/cookies, Client ID persistence through connect, refresh-token usability and NotebookLM login require real credentials/browser/network; intentionally not authenticated.');},async H=>{await H.settingsFixture({googleOAuthClientId:'',services:{},accounts:[]});await openAccounts(H);H.assert(await serviceRow(H,'googleTranslate').locator('.oauth-block').first().getByRole('button').first().isDisabled(),'Unconfigured OAuth connect disabled');});
  // Explicit domain limits apply once at registration and are persisted by the harness.
  H.limit('service-live-tests','Six Test connection buttons require actual remote service calls; dummy-credential storage/delete and UI gating covered, authenticated success/failure and live generated audio are not fabricated.');
  H.limit('dted-update-models','D&TED model options depend on an installed external engine. Runtime hardware list/model switching and update check/download/install are not mocked; unavailable/installed model variants remain explicitly uncovered.');
  H.limit('scratch-restart-global-shortcut','scratchShortcut setting persisted both values; OS registration only applies on application restart and is not proven by renderer reopening.');
}
module.exports.plan=PLAN;

// Extra observable effects. Each action remains inside the fixture/profile except documented shell adapters.
function registerEffects(H,add) {
  for(const [key,input,converted]of [['smartDashes','a--b','a—b'],['smartEllipsis','a...b','a…b'],['smartFractions','1/2 ','½ '],['autoCapitalize','salut','Salut']])for(const enabled of [false,true])add(`effect-${key}-${enabled}`,'SettingsDialog/corrections',key+' affects typed saved HTML',async H=>{
    await H.editor().click();await H.p.keyboard.press('Control+a');await H.p.keyboard.type(input,{delay:25});await H.save();
  },async H=>{H.assert(H.doc().includes(enabled?converted:input),'Specific correction result in saved document HTML');H.assert((await settings(H))[key]===enabled,'Correction result came from selected program setting');},async H=>{await H.settingsFixture({smartDashes:false,smartEllipsis:false,smartFractions:false,autoCapitalize:false,[key]:enabled});});
  for(const mode of ['edit','newDoc'])add('effect-binder-enter-'+mode,'SettingsDialog/behaviors','Enter command effect '+mode,async H=>{H._beforeIds=H.flat(H.project().tree).map(n=>n.id);await H.row('doc-a').click();await H.row('doc-a').press('Enter');if(mode==='newDoc'){await H.editor().click();await H.p.keyboard.type('Noul document din Enter QA');await H.save();}},async H=>{
    if(mode==='edit')H.assert(await H.editor().evaluate(e=>e.contains(document.activeElement)),'Enter edit focuses current document text');else{const n=H.flat(H.project().tree).find(n=>!H._beforeIds.includes(n.id));H.assert(n&&n.type==='text'&&H.doc(n.id).includes('Noul document din Enter QA'),'Enter newDoc creates and saves actual fixture document');}
  },async H=>H.settingsFixture({binderEnter:mode}),['settings','newText']);
  for(const mode of ['rename','openQuickRef'])add('effect-binder-double-'+mode,'SettingsDialog/behaviors','double-click '+mode,async H=>{await H.row('doc-a').dblclick();if(mode==='rename'){await H.row('doc-a').locator('input').fill('Redenumit prin opțiune QA');await H.row('doc-a').locator('input').press('Enter');await H.save();}},async H=>{
    if(mode==='rename')H.assert(H.node('doc-a').title==='Redenumit prin opțiune QA','Double-click rename changes exact project node');else{const q=H.p.locator('.quickref');H.assert(await q.count()===1&&(await q.innerText()).includes('Capitol verificat'),'Double-click opens correct Quick Reference title');H.assert(await q.locator('.ProseMirror').innerText().then(x=>x.includes('Prima frază')),'Quick Reference contains selected document, not just empty window');await q.getByRole('button',{name:/Închide/}).first().click();H.assert(await H.editor().isVisible(),'Quick Reference closes back to document');}
  },async H=>H.settingsFixture({binderDoubleClick:mode}),['settings','quickRef']);
  for(const zipped of [false,true])add('effect-backup-save-'+zipped,'SettingsDialog/backup','backupOnSave '+(zipped?'ZIP':'directory'),async H=>{await H.editor().click();await H.p.keyboard.press('Control+End');await H.p.keyboard.type(' Conținut nou pentru backup QA.');await H.save();},async H=>{
    await H.wait(()=>fs.readdirSync(H._backupPath).length>H._backupBefore);const names=fs.readdirSync(H._backupPath);if(zipped){const file=names.find(n=>n.endsWith('.zip'));H.assert(file,'ZIP backup exists');const zip=await require('jszip').loadAsync(fs.readFileSync(path.join(H._backupPath,file)));const entries=Object.keys(zip.files);H.assert(entries.some(n=>n.endsWith('project.json'))&&entries.some(n=>n.endsWith('docs/doc-a.html')),'ZIP includes real project and changed document');const entry=entries.find(n=>n.endsWith('docs/doc-a.html'));H.assert((await zip.file(entry).async('string')).includes('Conținut nou pentru backup QA.'),'ZIP contains saved edited text');}else{const folder=names.map(n=>path.join(H._backupPath,n)).find(n=>fs.statSync(n).isDirectory());H.assert(folder&&fs.existsSync(path.join(folder,'project.json')),'Uncompressed backup includes real project.json');H.assert(fs.readFileSync(path.join(folder,'docs/doc-a.html'),'utf8').includes('Conținut nou pentru backup QA.'),'Uncompressed backup includes changed HTML');}
  },async H=>{H._backupPath=path.join(H.W,'effect-backup-'+zipped);fs.mkdirSync(H._backupPath,{recursive:true});await H.settingsFixture({backupDir:H._backupPath,backupOnSave:true,backupOnOpen:false,backupOnClose:false,backupZip:zipped,backupKeep:5,backupEveryMin:0});H._backupBefore=fs.readdirSync(H._backupPath).length;},['settings','save']);
  for(const enabled of [false,true])add('effect-snapshot-save-'+enabled,'SettingsDialog/backup','snapshotOnSave '+enabled,async H=>{await H.editor().click();await H.p.keyboard.press('Control+End');await H.p.keyboard.type(' Snapshot manual QA.');await H.save();},async H=>{const folder=path.join(H.dir,'snapshots','doc-a');const all=fs.existsSync(folder)?fs.readdirSync(folder):[],fresh=all.filter(n=>!H._snapBefore.includes(n));if(enabled){await H.wait(()=>fs.readdirSync(folder).some(n=>!H._snapBefore.includes(n)));const actual=fs.readdirSync(folder).filter(n=>!H._snapBefore.includes(n)).map(n=>JSON.parse(fs.readFileSync(path.join(folder,n),'utf8')));H.assert(actual.some(s=>s.html.includes('Snapshot manual QA.')&&s.name),'Manual save snapshot contains exact newly saved document');}else H.assert(fresh.length===0,'Disabled snapshot setting creates no snapshot');},async H=>{await H.settingsFixture({snapshotOnSave:enabled});const folder=path.join(H.dir,'snapshots','doc-a');H._snapBefore=fs.existsSync(folder)?fs.readdirSync(folder):[];},['settings','save']);
  const presets=JSON.parse(fs.readFileSync(path.join(H.ROOT,'lib/aiPresets.json'),'utf8'));
  for(const [id,preset]of Object.entries(presets)) {
    add('provider-secret-'+id,'SettingsDialog/ai','dummy key save/masked/reopen/delete '+id,async H=>{await body(H).locator('select').selectOption(id);await body(H).locator('input[type=password]').fill('qa-api-secret-not-real-'+id);await closeSave(H);await open(H,'ai');await H.wait(async()=>await body(H).getByRole('button',{name:new RegExp('Șterge cheia')}).count()>0);H.assert(await body(H).locator('input[type=password]').inputValue()==='','Saved provider credential never read back');const raw=fs.readFileSync(path.join(H.W,'profile','settings.json'),'utf8');H.assert(!raw.includes('qa-api-secret-not-real-'+id),'No plaintext dummy provider key in settings file');await body(H).getByRole('button',{name:new RegExp('Șterge cheia')}).click();},async H=>{await H.wait(async()=>!(await settings(H)).hasKeys?.[id]);H.assert(!await body(H).getByRole('button',{name:new RegExp('Șterge cheia')}).count(),'Provider key delete removes stored-key action');},async H=>open(H,'ai'),['aiSettings']);
    if(preset.keyUrl)add('provider-key-link-'+id,'SettingsDialog/ai','provider key help link '+id,async H=>{await body(H).locator('select').selectOption(id);await body(H).locator('fieldset').first().locator('a').click();},async H=>{await H.wait(async()=>(await H.effects()).some(e=>e.kind==='external-url'&&e.url===preset.keyUrl));H.assert(await H.p.locator('.settings-dialog').isVisible(),'Provider help link preserves settings context');H.limit('provider-key-link-shell','URL passed through captured shell adapter; external page/login not live checked.');},async H=>open(H,'ai'),['aiSettings']);
  }
  for(const [id]of PLAN.services)add('service-test-disabled-'+id,'ServicesPanel/'+id,'unconfigured Test connection gate',async H=>{},async H=>{const row=serviceRow(H,id),button=row.locator('.actions-inline').first().getByRole('button',{name:'Testează conexiunea',exact:true});H.assert(await button.count()===1&&await button.isDisabled(),'Unconfigured remote test cannot execute '+id);H.assert(await row.locator('input[type=password]').evaluateAll(es=>es.every(e=>e.value===''&&e.autocomplete==='new-password')),'All secret fields empty and autocomplete guarded');},async H=>{await H.settingsFixture({services:{},accounts:[]});await openAccounts(H);});
  for(const which of ['cork','composition'])add('image-too-large-'+which,'AppearancePane/'+which,'4MiB validation',async H=>{await body(H,true).locator('input[type=file]').setInputFiles({name:'oversized-qa.png',mimeType:'image/png',buffer:Buffer.alloc(4*1024*1024+1)});},async H=>{H.assert(await H.p.locator('.error,.error-banner,[role=alert]').filter({hasText:/prea mare|maxim/i}).count()>0,'Oversized image rejected with specific error');H.assert(!(await settings(H))[which==='cork'?'corkBgImage':'compBgImage'],'Oversized image not persisted');},async H=>{await H.settingsFixture({corkBg:'image',corkBgImage:'',compBgImage:''});await open(H,'appearance',which==='cork'?'corkboard':'composition');});
}
