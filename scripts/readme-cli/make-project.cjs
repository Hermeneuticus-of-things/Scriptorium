// Demo project for assets/readme/cli.png: node scripts/readme-cli/make-project.cjs <dir>/cli/Drumul\ spre\ munte.scribner
const st=require('../../lib/store.cjs');
const dir=process.argv[2];
const p=st.createProject(dir,'Drumul spre munte','blank');
p.author='Ana Popescu';
const mk=(t,h,syn)=>{const n={id:'d'+Math.random().toString(36).slice(2,10),title:t,type:'text',synopsis:syn||'',label:'Fără',status:'Prima ciornă',includeInCompile:true,target:0,keywords:[]};st.writeDoc(dir,n.id,'docs',h);return n;};
const para=(s,n)=>Array.from({length:n},()=>`<p>${s}</p>`).join('');
p.tree[0].children=[
 {...mk('Partea întâi','',''),type:'folder',children:[
  mk('Plecarea',para('Era o dimineață rece de octombrie când Andrei și-a închis ușa în urma lui.',40),'Andrei pleacă de acasă.'),
  mk('Drumul',para('Pe drum l-a întâlnit pe bătrânul Matei, care i-a dat o hartă desenată de mână.',55),'Harta lui Matei.')]},
 {...mk('Partea a doua','',''),type:'folder',children:[
  mk('Cabana',para('Ilinca aprinse focul și se uită lung la hartă.',48),'Noaptea la cabană.'),
  mk('Întoarcerea',para('Dimineața, râul era liniștit, iar poteca ducea înapoi spre sat.',36),'Drumul înapoi.')]}];
p.tree[1].children=[mk('Andrei','<p>Andrei, 27 de ani, ochi verzi, fost profesor de istorie.</p>'),mk('Munții Apuseni','<p>Sate de munte, râuri repezi, poteci vechi.</p>')];
st.saveProject(dir,p);
