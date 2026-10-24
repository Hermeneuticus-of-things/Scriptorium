// assets/readme/cli.png: a PowerShell-style window with real `scribner` output.
// 1. node scripts/readme-cli/make-project.cjs <S>/cli/"Drumul spre munte.scribner"
// 2. in <S>/cli: node cli/scribner.cjs info … --lang ro > o1.txt;
//    export-sources … -o Surse --target notebooklm > o2.txt; list the export folder > o3.txt
// 3. node scripts/readme-cli/render.cjs <S> assets/readme/cli.png
const fs=require('fs'),path=require('path');const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const S=process.argv[2], OUT=process.argv[3];
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const rd=f=>fs.readFileSync(path.join(S,f),'utf8').replace(new RegExp(S.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/cli/','g'),'D:\\Carti\\').replace(/(D:\\Carti\\[^\n]*)/g,m=>m.replace(/\//g,'\\')).trimEnd();
const P='<span class=ps>PS D:\\Carti&gt;</span> ';
const cmd=s=>P+'<span class=c>scribner</span> '+s.replace(/(".*?")/g,'<span class=s>$1</span>').replace(/ (--?[a-z-]+)/g,' <span class=f>$1</span>');
const term=[cmd('info "Drumul spre munte.scribner"'),esc(rd('cli/o1.txt')),'',cmd('export-sources "Drumul spre munte.scribner" -o Surse --target notebooklm'),esc(rd('cli/o2.txt')),'',P+'<span class=c>ls</span> <span class=s>"Surse\\Surse - Drumul spre munte"</span> <span class=f>-Name</span>',esc(rd('cli/o3.txt')),'',P+'<span class=cur></span>'].join('\n');
const SANS="Inter, 'DejaVu Sans', 'Segoe UI', Arial, sans-serif",SERIF="'DejaVu Serif', Georgia, serif";
const html=`<!doctype html><meta charset=utf-8><style>*{margin:0;padding:0;box-sizing:border-box}
body{width:1200px;height:955px;padding:46px 47px 0;background:#f3efe6;font-family:${SANS};color:#1f1b16;overflow:hidden}
.kicker{font-weight:700;letter-spacing:.24em;text-transform:uppercase;font-size:19px;color:#3f8f5a}
h1{font-family:${SERIF};font-weight:400;font-size:52px;line-height:1.15;margin:18px 0 14px}
p.sub{font-size:22px;line-height:1.5;color:#3d362d;max-width:830px}
.win{margin:30px auto 0;width:1030px;border-radius:10px;overflow:hidden;background:#0c0c0c;box-shadow:0 30px 60px rgba(60,45,25,.25);border:1px solid #333}
.tabs{height:42px;background:#202020;display:flex;align-items:flex-end;padding-left:10px;color:#ddd;font-size:14px}
.tab{background:#0c0c0c;padding:10px 18px;border-radius:8px 8px 0 0;display:flex;gap:10px;align-items:center}
.tab b{width:16px;height:16px;background:#2b5797;border-radius:3px;display:inline-block}
.ctl{margin-left:auto;align-self:center;letter-spacing:22px;color:#aaa;padding-right:4px;font-size:15px}
pre{font-family:'Cascadia Mono','DejaVu Sans Mono',Consolas,monospace;font-size:17px;line-height:1.5;color:#cccccc;padding:18px 22px 26px;white-space:pre-wrap}
.ps{color:#cccccc}.c{color:#f9f1a5}.s{color:#3a96dd}.f{color:#9a9a9a}.cur{display:inline-block;width:10px;height:19px;background:#ccc;vertical-align:-3px}
</style><div class=kicker>Linia de comandă</div><h1>Aceeași carte, din terminal</h1>
<p class=sub>Comanda scribner vine cu programul: afli ce e în proiect, faci Compile sau pregătești sursele pentru NotebookLM, fără să deschizi fereastra.</p>
<div class=win><div class=tabs><div class=tab><b></b>Windows PowerShell</div><div class=ctl>— ▢ ✕</div></div><pre>${term}</pre></div>`;
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1200,height:955},deviceScaleFactor:2});await pg.setContent(html);await pg.evaluate(()=>document.fonts.ready);await pg.screenshot({path:OUT});await b.close();})();
