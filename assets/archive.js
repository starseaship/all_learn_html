import {SUBJECT_LABELS,TYPE_LABELS,normalizeCatalog,filterMaterials,sortMaterials} from './material-utils.mjs?v=20261012-1';

const CACHE_KEY = 'zoeStudyArchiveCatalog:v2';
const ui = Object.fromEntries(['semesterLabel','currentSemesterButton','archiveMenu','archiveOptions','totalCount','subjectCount','subjectChip','controls','filterRow','searchInput','filterToggle','clearFilters','courseFilter','sortSelect','sortDirection','sortDirectionLabel','sortArrow','advancedFilters','subjectFilter','typeFilter','loadStatus','statusMessage','retryButton','errorDetails','errorMessage','resultsInfo','cardGrid','emptyState','emptyMessage','emptyClearButton'].map(id=>[id,document.getElementById(id)]));
const state = {semester:'',subject:'all',type:'all',course:'all',query:'',sort:'lesson',sortDirection:'asc'};
let catalog = null;
let loading = null;

function splitTitle(title) {
  // “数据科学第3回｜主题｜补充说明” → 小标题 / 主标题 / 额外说明；不符合这种写法的标题原样显示。
  const parts=title.split('｜').map(part=>part.trim()).filter(Boolean);
  if(parts.length>=2 && /第\s*\d+\s*回$/.test(parts[0])) {
    return {eyebrow:parts[0].replace(/\s*(第\s*\d+\s*回)$/,' $1').trim(),title:parts[1],extra:parts.slice(2)};
  }
  return {eyebrow:'',title,extra:[]};
}

function node(tag,className,text) {
  const element=document.createElement(tag);
  if(className) element.className=className;
  if(text!==undefined) element.textContent=text;
  return element;
}

function readCache() {
  try { const text=localStorage.getItem(CACHE_KEY); return text ? normalizeCatalog(JSON.parse(text)) : null; }
  catch { return null; }
}

function rememberCatalog(raw) {
  try { localStorage.setItem(CACHE_KEY,JSON.stringify(raw)); } catch { /* The catalog still works when storage is unavailable. */ }
}

function resetFilters() {
  Object.assign(state,{subject:'all',type:'all',course:'all',query:''});
  ui.searchInput.value='';
}

function setSemester(id) {
  state.semester=id;
  resetFilters();
  ui.archiveMenu.open=false;
  render();
  ui.archiveMenu.querySelector('summary').focus();
}

function renderFilter(container,kind,values,labels,label,showSingle=false) {
  container.replaceChildren();
  container.hidden=!values.length || (!showSingle && values.length<=1);
  if(container.hidden) return;
  container.append(node('span','filter-label',label));
  for(const value of ['all',...values]) {
    const button=node('button','chip',value==='all'?'全部':labels?.[value]||value);
    button.type='button'; button.dataset.kind=kind; button.dataset.value=value;
    button.setAttribute('aria-pressed',String(state[kind]===value));
    container.append(button);
  }
}

function render() {
  if(!catalog) return;
  const semester=catalog.semesters.find(s=>s.id===state.semester);
  const materials=catalog.materials.filter(m=>m.semester===state.semester);
  const subjects=[...new Set(materials.map(m=>m.subject))].sort();
  if(state.subject!=='all' && !subjects.includes(state.subject)) state.subject='all';
  const subjectMaterials=filterMaterials(materials,{subject:state.subject});
  const courses=[...new Set(subjectMaterials.map(m=>m.course))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
  if(state.course!=='all' && !courses.includes(state.course)) state.course='all';
  const courseMaterials=filterMaterials(subjectMaterials,{course:state.course});
  const types=[...new Set(courseMaterials.map(m=>m.type))].sort();
  if(state.type!=='all' && !types.includes(state.type)) state.type='all';

  ui.semesterLabel.textContent=semester.label;
  ui.currentSemesterButton.hidden=state.semester===catalog.currentSemester;
  ui.totalCount.textContent=String(materials.length);
  ui.subjectCount.textContent=String(subjects.length);
  ui.subjectChip.hidden=subjects.length<=1;
  ui.archiveOptions.replaceChildren();
  const historical=catalog.semesters.filter(s=>s.id!==catalog.currentSemester);
  ui.archiveMenu.hidden=!historical.length;
  for(const item of historical) {
    const button=node('button','',item.label); button.type='button'; button.dataset.semester=item.id;
    button.setAttribute('aria-pressed',String(item.id===state.semester)); ui.archiveOptions.append(button);
  }
  renderFilter(ui.subjectFilter,'subject',subjects,SUBJECT_LABELS,'科目');
  renderFilter(ui.courseFilter,'course',courses,null,'课程');
  renderFilter(ui.typeFilter,'type',types,TYPE_LABELS,'类型');
  ui.filterRow.hidden=ui.courseFilter.hidden;
  const advanced=!ui.subjectFilter.hidden||!ui.typeFilter.hidden;
  ui.advancedFilters.hidden=!advanced;
  ui.filterToggle.hidden=!advanced;
  const filtered=sortMaterials(filterMaterials(materials,state),state.sort,state.sortDirection);
  const isDescending=state.sortDirection==='desc';
  ui.sortDirectionLabel.textContent=isDescending?'倒序':'正序';
  ui.sortArrow.textContent=isDescending?'↓':'↑';
  ui.sortDirection.setAttribute('aria-pressed',String(isDescending));
  ui.sortDirection.setAttribute('aria-label',isDescending?'当前倒序，点击切换为正序':'当前正序，点击切换为倒序');
  const active=state.subject!=='all'||state.type!=='all'||state.course!=='all'||!!state.query.trim();
  ui.clearFilters.disabled=!active; ui.clearFilters.hidden=!active;
  ui.resultsInfo.textContent=active?`找到 ${filtered.length} / ${materials.length} 份资料`:`共 ${materials.length} 份资料`;
  ui.cardGrid.replaceChildren();
  const fragment=document.createDocumentFragment();
  // 整个学期里完全相同的标签对区分资料没有帮助，隐藏它们；只有一份资料时保留。
  const uniform=Object.fromEntries(['subject','type','course'].map(key=>[key,materials.length>1 && new Set(materials.map(item=>item[key])).size===1]));
  for(const material of filtered) {
    const card=node('a','material-card');
    card.href='./'+material.path.split('/').map(encodeURIComponent).join('/');
    card.target='_blank'; card.rel='noopener noreferrer'; card.dataset.subject=material.subject;
    const heading=splitTitle(material.title);
    const tags=node('div','card-tags');
    if(!uniform.subject) tags.append(node('span',`tag tag-subject-${material.subject}`,SUBJECT_LABELS[material.subject]));
    if(!uniform.type) tags.append(node('span','tag tag-type',TYPE_LABELS[material.type]));
    if(!uniform.course) tags.append(node('span','tag tag-course',material.course));
    if(tags.childElementCount) card.append(tags);
    if(heading.eyebrow) card.append(node('p','card-eyebrow',heading.eyebrow));
    card.append(node('h2','card-title',heading.title),node('p','card-desc',material.description));
    const badges=[...new Set([...heading.extra,...material.badges])].slice(0,4);
    if(badges.length) { const row=node('div','card-badges'); for(const badge of badges) row.append(node('span','badge',badge)); card.append(row); }
    const foot=node('div','card-footer');
    const date=node('time','card-date',material.date ? `更新 ${material.date}` : '');
    if(material.date) date.dateTime=material.date;
    foot.append(date,node('span','card-open','打开资料 ↗'),node('span','visually-hidden','（在新标签页打开）'));
    card.append(foot); fragment.append(card);
  }
  ui.cardGrid.append(fragment);
  ui.emptyState.hidden=filtered.length>0;
  ui.emptyMessage.textContent=materials.length?'没有找到符合条件的资料':'这个学期暂时没有资料';
  ui.emptyClearButton.hidden=!active;
  ui.cardGrid.setAttribute('aria-busy','false');
}

function setCatalog(raw) {
  catalog=normalizeCatalog(raw);
  if(!catalog.semesters.some(s=>s.id===state.semester)) state.semester=catalog.currentSemester;
  render();
}

async function requestCatalog() {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try {
    const response=await fetch('./materials.json',{cache:'no-cache',signal:controller.signal});
    if(!response.ok) throw new Error(`目录请求失败（HTTP ${response.status}）`);
    const raw=await response.json();
    setCatalog(raw); rememberCatalog(raw);
    ui.loadStatus.hidden=true;
  } catch(error) {
    ui.loadStatus.hidden=false; ui.loadStatus.classList.add('has-error');
    ui.statusMessage.textContent=catalog?'暂时无法更新目录，已保留上次成功加载的资料。':'资料目录暂时无法加载，请重新尝试。';
    ui.errorMessage.textContent=error.name==='AbortError'?'请求超过 12 秒，请检查网络后重试。':String(error.message||error);
    ui.errorDetails.hidden=false; ui.retryButton.hidden=false;
  } finally {
    clearTimeout(timer); ui.retryButton.disabled=false; ui.cardGrid.setAttribute('aria-busy','false');
  }
}

function loadCatalog() {
  if(loading) return loading;
  ui.loadStatus.hidden=false; ui.loadStatus.classList.remove('has-error');
  ui.statusMessage.textContent=catalog?'正在更新资料目录…':'正在载入资料目录…';
  ui.errorDetails.hidden=true; ui.retryButton.hidden=true; ui.retryButton.disabled=true;
  ui.cardGrid.setAttribute('aria-busy','true');
  loading=requestCatalog().finally(()=>{loading=null;});
  return loading;
}

for(const container of [ui.subjectFilter,ui.typeFilter,ui.courseFilter]) {
  container.addEventListener('click',event=>{
    const button=event.target.closest('button[data-kind]');
    if(!button||!container.contains(button)) return;
    const kind=button.dataset.kind, value=button.dataset.value;
    state[kind]=value; render();
    const replacement=[...container.querySelectorAll('button')].find(item=>item.dataset.value===value);
    if(replacement) replacement.focus();
  });
}
ui.archiveOptions.addEventListener('click',event=>{
  const button=event.target.closest('button[data-semester]'); if(button) setSemester(button.dataset.semester);
});
ui.currentSemesterButton.addEventListener('click',()=>{setSemester(catalog.currentSemester); ui.archiveMenu.querySelector('summary').focus();});
ui.searchInput.addEventListener('input',()=>{state.query=ui.searchInput.value; render();});
ui.sortSelect.addEventListener('change',()=>{
  state.sort=ui.sortSelect.value;
  state.sortDirection=state.sort==='updated'?'desc':'asc';
  render();
});
ui.sortDirection.addEventListener('click',()=>{
  state.sortDirection=state.sortDirection==='asc'?'desc':'asc';
  render();
});
for(const button of [ui.clearFilters,ui.emptyClearButton]) button.addEventListener('click',()=>{resetFilters();render();ui.searchInput.focus();});
ui.filterToggle.addEventListener('click',()=>{
  const open=ui.advancedFilters.classList.toggle('is-open'); ui.filterToggle.setAttribute('aria-expanded',String(open));
});
ui.retryButton.addEventListener('click',loadCatalog);
document.addEventListener('click',event=>{if(!ui.archiveMenu.contains(event.target))ui.archiveMenu.open=false;});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && ui.archiveMenu.open) {ui.archiveMenu.open=false;ui.archiveMenu.querySelector('summary').focus();}
  if(event.key==='Escape' && ui.advancedFilters.classList.contains('is-open')) {ui.advancedFilters.classList.remove('is-open');ui.filterToggle.setAttribute('aria-expanded','false');ui.filterToggle.focus();}
});
// 下滑时收起筛选行，只留搜索栏；上滑或回到顶部时展开。输入、展开筛选面板或页面太短时不收起。
let lastScroll=0, scrollQueued=false;
function updateCompact() {
  scrollQueued=false;
  const y=Math.max(0,window.scrollY), delta=y-lastScroll;
  const hasRows=!ui.filterRow.hidden||!ui.advancedFilters.hidden;
  const longPage=document.documentElement.scrollHeight-window.innerHeight>700;
  const blocked=!hasRows||!longPage||document.activeElement===ui.searchInput||ui.advancedFilters.classList.contains('is-open')||y<80;
  if(blocked) ui.controls.classList.remove('is-compact');
  else if(delta>8) ui.controls.classList.add('is-compact');
  else if(delta<-8) ui.controls.classList.remove('is-compact');
  if(Math.abs(delta)>8||y<80) lastScroll=y;
}
window.addEventListener('scroll',()=>{ if(!scrollQueued) { scrollQueued=true; requestAnimationFrame(updateCompact); } },{passive:true});
const cached=readCache();
if(cached) setCatalog(cached);
loadCatalog();
