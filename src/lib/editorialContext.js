import {htmlToText} from './text.js';
const STOP=new Set('este sunt pentru dintre această acest care când dacă fără doar sau din prin lui ei unui unei cele mai aici acolo despre the and for this that with from your into has have not are was were'.split(' '));
const tokens=s=>new Set((String(s||'').toLocaleLowerCase('ro').match(/[\p{L}\p{N}]{3,}/gu)||[]).filter(x=>!STOP.has(x)).slice(0,120));
const flat=ns=>ns.flatMap(n=>[n,...flat(n.children||[])]);
export function buildEditorialContext(project,docs,{documentId,text='',question='',budget=24000}={}) {
 const all=flat(project?.tree||[]),node=all.find(n=>n.id===documentId);
 const query=tokens([node?.title,node?.synopsis,(node?.keywords||[]).join(' '),text,question].join(' '));
 const research=project?.tree?.find(n=>n.root==='research');
 const scored=flat(research?.children||[]).filter(n=>n.type==='text').slice(0,1000).map((n,index)=>{
  const content=htmlToText(docs[n.id]||'').slice(0,4000),body=tokens(content),title=tokens(n.title),keys=tokens((n.keywords||[]).join(' '));let score=0;
  for(const word of query)score+=(body.has(word)?1:0)+(title.has(word)?4:0)+(keys.has(word)?3:0);
  return {id:n.id,title:n.title,content,score,index};
 }).filter(n=>n.content.trim()).sort((a,b)=>b.score-a.score||a.index-b.index);
 // Related sources first; if there is no lexical match, give only a small
 // explicitly marked fallback, never flood the model with the whole research tree.
 const matched=scored.filter(s=>s.score>0),candidates=matched.length?matched.slice(0,8):scored.slice(0,2);
 let context='DOMENIU: text editorial al cărții, NU configurația aplicației.\nCarte: '+(project?.title||'')+'\nDocument: '+(node?.title||'')+'\n';
 if(node?.synopsis)context+='Sinopsis document: '+String(node.synopsis).slice(0,1500)+'\n';
 if(node?.keywords?.length)context+='Cuvinte-cheie: '+node.keywords.join(', ')+'\n';
 const sources=[];for(const source of candidates){const part='\n## Cercetare: '+source.title+(source.score?'':' (context general, relevanță neconfirmată)')+'\n'+source.content;if(context.length+part.length>budget)break;context+=part;sources.push({id:source.id,title:source.title,score:source.score});}
 return {text:context.slice(0,budget),sources,documentId,projectTitle:project?.title||'',documentTitle:node?.title||'',fallback:matched.length===0};
}
