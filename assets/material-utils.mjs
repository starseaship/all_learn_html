export const SUBJECT_LABELS = Object.freeze({english:'英语',japanese:'日语',general:'📚 通识',wgl:'🌐 WGL'});
export const COURSE_LABELS = Object.freeze({'日语词汇':'日语','日语单词':'日语','英语文法':'语法'});
export const TYPE_LABELS = Object.freeze({grammar:'文法',vocabulary:'词汇',quiz:'练习',notes:'笔记',writing:'写作',reference:'参考'});
const cleanText = (value, limit = 200) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value ? value : '';
}

export function normalizeCatalog(raw) {
  if (!raw || raw.version !== 1 || !Array.isArray(raw.semesters) || !Array.isArray(raw.materials)) throw new Error('资料目录格式不正确');
  const semesters = raw.semesters.map(item => ({id:cleanText(item.id),label:cleanText(item.label)}));
  if (!semesters.length || semesters.some(item => (!/^\d{2}(?:aut|spring)$/.test(item.id) && item.id!=='extracurricular') || !item.label) || new Set(semesters.map(s=>s.id)).size !== semesters.length) throw new Error('资料分类信息不正确');
  const semesterIds = new Set(semesters.map(item=>item.id));
  if (!semesterIds.has(raw.currentSemester)) throw new Error('当前学期不存在');
  const paths = new Set();
  const materials = raw.materials.map((item, index) => {
    const path = cleanText(item.path,1000);
    const parts = path.split('/');
    if (!semesterIds.has(parts[0]) || parts.some(p=>!p || p==='.' || p==='..') || /[\\?#:%\x00-\x1f]/.test(path) || !/\.html$/i.test(path) || paths.has(path)) throw new Error('资料链接格式不正确');
    paths.add(path);
    const lesson = Number(item.lessonNumber);
    return {
      id:path, path, semester:parts[0], title:cleanText(item.title,300) || parts.at(-1).replace(/\.html$/i,''),
      description:cleanText(item.description,1200),
      course:COURSE_LABELS[cleanText(item.course,100)] || cleanText(item.course,100) || '未分类',
      subject:Object.hasOwn(SUBJECT_LABELS,item.subject) ? item.subject : 'general',
      type:Object.hasOwn(TYPE_LABELS,item.type) ? item.type : 'reference', date:validDate(item.date),
      // Existing cached catalogs may predate the explicit order field.
      addedOrder:Number.isSafeInteger(item.addedOrder) && item.addedOrder>0 ? item.addedOrder : index+1,
      lessonNumber:Number.isInteger(lesson) && lesson > 0 ? lesson : null,
      badges:Array.isArray(item.badges) ? item.badges.map(badge=>cleanText(badge,24)).filter(Boolean).slice(0,4) : []
    };
  });
  return {version:1,currentSemester:raw.currentSemester,semesters,materials};
}

export function filterMaterials(materials, {subject='all',type='all',course='all',query=''} = {}) {
  const q = query.trim().toLocaleLowerCase();
  return materials.filter(item => (subject==='all'||item.subject===subject) && (type==='all'||item.type===type) && (course==='all'||item.course===course) && (!q||`${item.title} ${item.description} ${item.course}`.toLocaleLowerCase().includes(q)));
}

export function sortMaterials(materials, mode='added', direction=(mode==='added'||mode==='updated')?'desc':'asc') {
  const order = direction==='desc' ? -1 : 1;
  const byTitle = (a,b)=>a.title.localeCompare(b.title,'zh-CN',{numeric:true}) || a.path.localeCompare(b.path);
  return [...materials].sort((a,b)=> {
    if (mode==='title') return byTitle(a,b)*order;
    if (mode==='added') return (a.addedOrder-b.addedOrder)*order || byTitle(a,b);
    // Unknown update dates are always last; ties stay alphabetical.
    if (mode==='updated') {
      if (!a.date && b.date) return 1;
      if (a.date && !b.date) return -1;
      return (a.date||'').localeCompare(b.date||'')*order || byTitle(a,b);
    }
    const courseOrder=a.course.localeCompare(b.course,'zh-CN',{numeric:true});
    if (courseOrder) return courseOrder*order;
    // Keep lessons without a chapter number at the end in both directions.
    const left=a.lessonNumber, right=b.lessonNumber;
    if (left===null && right!==null) return 1;
    if (left!==null && right===null) return -1;
    if (left!==right) return (left-right)*order;
    return byTitle(a,b)*order;
  });
}
