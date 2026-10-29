const $=s=>document.querySelector(s);
let BASE=localStorage.getItem('api')||'https://fastapi-and-postgres-2jus.onrender.com';
const st={page:1,total:0,editing:null,delId:null};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const grade=m=>m>=90?'A+':m>=80?'A':m>=70?'B':m>=60?'C':'F';

function toast(msg,bad){const t=document.createElement('div');t.className='toast'+(bad?' bad':'');t.textContent=msg;$('#toasts').append(t);setTimeout(()=>t.remove(),3200)}
function setStatus(ok){$('#dot').className='dot '+(ok?'on':'off');$('#stxt').textContent=ok?'Connected':'Offline'}

async function api(path,opt={}){
  let res;
  try{res=await fetch(BASE+path,{headers:{'Content-Type':'application/json'},...opt});setStatus(true)}
  catch{setStatus(false);throw new Error('Cannot reach the API at '+BASE)}
  const data=await res.json().catch(()=>null);
  if(!res.ok){
    const d=data&&data.detail;
    throw new Error(Array.isArray(d)?d.map(e=>(e.loc||[]).slice(-1)+': '+e.msg).join(' • '):d||'Request failed')
  }
  return data;
}

async function load(){
  const q=new URLSearchParams({page:st.page,limit:$('#fLimit').value,order:$('#fOrder').value});
  if($('#fCourse').value.trim())q.set('course',$('#fCourse').value.trim());
  if($('#fSort').value)q.set('sort_by',$('#fSort').value);
  try{
    const d=await api('/students?'+q);
    st.total=d.total_students;render(d)
  }catch(e){$('#rows').innerHTML=`<tr><td colspan="7" class="empty">${esc(e.message)}</td></tr>`;toast(e.message,true)}
}

function render(d){
  const list=d.students;
  $('#rows').innerHTML=list.length?list.map((s,i)=>`<tr style="animation-delay:${i*40}ms">
    <td class="mute">${esc(s.id)}</td><td>${esc(s.name)}</td><td>${s.age}</td><td>${esc(s.course)}</td><td>${s.marks}</td>
    <td><span class="grade ${grade(s.marks)[0]}">${grade(s.marks)}</span></td>
    <td><div class="act"><button data-e="${esc(s.id)}">Edit</button><button class="danger" data-d="${esc(s.id)}">Delete</button></div></td></tr>`).join('')
    :`<tr><td colspan="7" class="empty">No students found</td></tr>`;
  const m=list.map(s=>s.marks),pages=Math.max(1,Math.ceil(d.total_students/d.limit));
  $('#sTotal').textContent=d.total_students;
  $('#sAvg').textContent=m.length?(m.reduce((a,b)=>a+b,0)/m.length).toFixed(1):'–';
  $('#sTop').textContent=m.length?Math.max(...m):'–';
  $('#sPage').textContent=`${d.page} / ${pages}`;
  $('#pInfo').textContent=`Showing ${list.length} of ${d.total_students} students`;
  $('#bPrev').disabled=d.page<=1;$('#bNext').disabled=d.page>=pages;
}

function openForm(s){
  st.editing=s?s.id:null;
  $('#mTitle').textContent=s?'Edit student':'Add student';
  $('#iId').value=s?s.id:'';$('#iId').disabled=!!s;
  $('#iName').value=s?s.name:'';$('#iAge').value=s?s.age:'';
  $('#iEmail').value=s?s.email:'';$('#iCourse').value=s?s.course:'';$('#iMarks').value=s?s.marks:'';
  $('#mErr').textContent='';$('#ovForm').classList.add('show');
  (s?$('#iName'):$('#iId')).focus();
}
const closeAll=()=>document.querySelectorAll('.overlay').forEach(o=>o.classList.remove('show'));

async function save(){
  const body={name:$('#iName').value.trim(),age:+$('#iAge').value,email:$('#iEmail').value.trim(),course:$('#iCourse').value.trim(),marks:$('#iMarks').value===''?NaN:+$('#iMarks').value};
  if(!st.editing)body.id=$('#iId').value.trim();
  if(Object.values(body).some(v=>v===''||Number.isNaN(v)))return $('#mErr').textContent='Please fill in every field.';
  $('#mSave').disabled=true;
  try{
    if(st.editing)await api('/UpdateStudent/'+encodeURIComponent(st.editing),{method:'PUT',body:JSON.stringify(body)});
    else await api('/CreateStudent',{method:'POST',body:JSON.stringify(body)});
    toast(st.editing?'Student updated':'Student added');closeAll();load();
  }catch(e){$('#mErr').textContent=e.message}
  $('#mSave').disabled=false;
}

async function edit(id){
  try{openForm(await api('/student/'+encodeURIComponent(id)))}catch(e){toast(e.message,true)}
}

$('#rows').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.e)edit(b.dataset.e);
  if(b.dataset.d){st.delId=b.dataset.d;$('#dMsg').textContent=`Student ${st.delId} will be permanently removed.`;$('#ovDel').classList.add('show')}
});
$('#dOk').onclick=async()=>{
  try{await api('/DEleteStudent/'+encodeURIComponent(st.delId),{method:'DELETE'});toast('Student deleted');closeAll();
    if(st.page>1&&(st.total-1)<=(st.page-1)*$('#fLimit').value)st.page--;load()}
  catch(e){toast(e.message,true)}
};
$('#bAdd').onclick=()=>openForm();
$('#mSave').onclick=save;
$('#mCancel').onclick=$('#dCancel').onclick=closeAll;
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('mousedown',e=>{if(e.target===o)closeAll()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll();if(e.key==='Enter'&&$('#ovForm').classList.contains('show'))save()});
$('#bFind').onclick=()=>{const v=$('#fFind').value.trim();if(v)edit(v)};
$('#fFind').addEventListener('keydown',e=>{if(e.key==='Enter')$('#bFind').click()});
$('#bPrev').onclick=()=>{st.page--;load()};
$('#bNext').onclick=()=>{st.page++;load()};
['#fSort','#fOrder','#fLimit'].forEach(s=>$(s).onchange=()=>{st.page=1;load()});
let t;$('#fCourse').oninput=()=>{clearTimeout(t);t=setTimeout(()=>{st.page=1;load()},350)};
$('#cfg').onclick=()=>{const v=prompt('FastAPI base URL',BASE);if(v){BASE=v.replace(/\/$/,'');localStorage.setItem('api',BASE);load()}};
load();
