const MONTHS = [
  {key:'2026-08', label:'Aug', year:2026, month:7},
  {key:'2026-09', label:'Sep', year:2026, month:8},
  {key:'2026-10', label:'Oct', year:2026, month:9},
  {key:'2026-11', label:'Nov', year:2026, month:10},
  {key:'2026-12', label:'Dec', year:2026, month:11},
];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
let activeMonthIdx = 0;
let posts = [];
let editingId = null;
let activeFilter = 'all';
let activeDayDate = null;   // the day currently shown in the day popover
let lastAnchorEl = null;    // the calendar cell the day popover is anchored to

function pad(n){ return n<10 ? '0'+n : ''+n; }
function isoDate(y,m,d){ return y+'-'+pad(m+1)+'-'+pad(d); }
function fmtShort(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return d.toLocaleDateString('en-US',{month:'short', day:'numeric'});
}
function fmtLong(dateStr){
  const d = new Date(dateStr+'T00:00:00');
  return d.toLocaleDateString('en-US',{weekday:'long', month:'long', day:'numeric'});
}
function todayISO(){
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}
function escapeHtml(s){
  const div = document.createElement('div');
  div.textContent = s || '';
  return div.innerHTML;
}

/* ---------- Firestore access (via window.fb from firebase-config.js) ---------- */

function waitForFirebase(){
  return new Promise(resolve => {
    if(window.fbReady) return resolve();
    window.addEventListener('fb-ready', () => resolve(), { once:true });
  });
}

async function loadPosts(){
  try{
    await waitForFirebase();
    posts = await window.fb.loadAll();
  }catch(e){ console.error('Load failed', e); posts = []; }
}

async function persistPost(post){
  try{
    await waitForFirebase();
    await window.fb.savePost(post);
  }catch(e){ console.error('Save failed', e); }
}

async function persistDelete(id){
  try{
    await waitForFirebase();
    await window.fb.deletePost(id);
  }catch(e){ console.error('Delete failed', e); }
}

/* ---------- Rendering ---------- */

function renderTabs(){
  const wrap = document.getElementById('monthTabs');
  wrap.innerHTML = MONTHS.map((m,i) =>
    `<div class="month-tab ${i===activeMonthIdx?'active':''}" data-idx="${i}">${m.label}</div>`
  ).join('');
  wrap.querySelectorAll('.month-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeMonthIdx = parseInt(tab.dataset.idx);
      render();
    });
  });
}

function postsForDay(dateStr){
  let dp = posts.filter(p => p.date === dateStr);
  if(activeFilter !== 'all') dp = dp.filter(p => p.platform === activeFilter);
  return dp;
}

function render(){
  renderTabs();
  const m = MONTHS[activeMonthIdx];
  const daysInMonth = new Date(m.year, m.month+1, 0).getDate();
  const firstDow = new Date(m.year, m.month, 1).getDay();
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  for(let i=0;i<firstDow;i++){
    const cell = document.createElement('div');
    cell.className = 'cal-cell empty';
    grid.appendChild(cell);
  }

  let total=0, postedCount=0;
  const today = todayISO();

  for(let d=1; d<=daysInMonth; d++){
    const dateStr = isoDate(m.year, m.month, d);
    const dayPosts = postsForDay(dateStr);
    total += dayPosts.length;
    postedCount += dayPosts.filter(p => p.status === 'posted').length;

    const cell = document.createElement('div');
    cell.className = 'cal-cell' + (dateStr === today ? ' today' : '');
    const maxShow = 3;
    const pillsHtml = dayPosts.slice(0,maxShow).map(p => `
      <div class="cal-pill ${p.status}"><span class="dot ${p.platform}"></span>${escapeHtml(p.title)}</div>
    `).join('');
    const moreHtml = dayPosts.length > maxShow ? `<div class="cal-more">+${dayPosts.length - maxShow} more</div>` : '';

    cell.innerHTML = `
      <div class="cal-date">${d}</div>
      <div class="cal-posts">${pillsHtml}${moreHtml}</div>
    `;
    cell.addEventListener('click', () => openDayModal(dateStr, cell));
    grid.appendChild(cell);
  }

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPosted').textContent = postedCount;
  document.getElementById('statPending').textContent = total - postedCount;

  document.getElementById('f-date').min = m.key + '-01';
}

/* ---------- Day popover (anchored to the clicked date cell) ---------- */

function openDayModal(dateStr, anchorEl){
  activeDayDate = dateStr;
  lastAnchorEl = anchorEl || lastAnchorEl;
  document.getElementById('dayModalTitle').textContent = fmtLong(dateStr);
  const dayPosts = postsForDay(dateStr);
  document.getElementById('dayModalSub').textContent = dayPosts.length
    ? `${dayPosts.length} post${dayPosts.length>1?'s':''} planned`
    : 'No posts planned yet.';

  const list = document.getElementById('dayPostList');
  list.innerHTML = '';
  dayPosts.forEach(p => {
    const item = document.createElement('div');
    item.className = 'day-post-item';
    item.innerHTML = `
      <span class="post-status ${p.status}" style="font-size:9px;text-transform:uppercase;letter-spacing:0.3px;font-weight:600;padding:2px 6px;border-radius:5px;" class="cal-pill ${p.status}">${p.status}</span>
      <span style="font-size:9.5px;text-transform:uppercase;font-weight:600;color:${p.platform==='instagram'?'var(--ig-text)':'var(--li-text)'}">${p.platform==='instagram'?'IG':'LI'}</span>
      <span class="post-title">${escapeHtml(p.title)}</span>
    `;
    item.addEventListener('click', () => {
      closeDayModal();
      openModal(p.id, dateStr);
    });
    list.appendChild(item);
  });

  document.getElementById('dayOverlay').classList.add('open');
  positionDayPopover();
}

function positionDayPopover(){
  const modal = document.querySelector('#dayOverlay .modal');
  if(!lastAnchorEl || !modal) return;
  const rect = lastAnchorEl.getBoundingClientRect();
  const modalW = 300, modalH = modal.offsetHeight || 220;
  const margin = 8;

  let left = rect.right + margin;
  if(left + modalW > window.innerWidth - margin){
    left = rect.left - modalW - margin;
  }
  if(left < margin) left = Math.min(rect.left, window.innerWidth - modalW - margin);
  left = Math.max(margin, left);

  let top = rect.top;
  if(top + modalH > window.innerHeight - margin){
    top = window.innerHeight - modalH - margin;
  }
  top = Math.max(margin, top);

  modal.style.left = left + 'px';
  modal.style.top = (top + window.scrollY) + 'px';
}

function closeDayModal(){
  document.getElementById('dayOverlay').classList.remove('open');
}

/* ---------- Post edit modal (fixed, viewport-centered) ---------- */

function openModal(id, presetDate){
  editingId = id;
  document.getElementById('err-title').style.display = 'none';
  document.getElementById('backToDayBtn').style.display = activeDayDate ? 'inline-block' : 'none';

  if(id){
    const p = posts.find(x => x.id === id);
    document.getElementById('modalTitle').textContent = 'Edit post';
    document.getElementById('f-title').value = p.title;
    document.getElementById('f-platform').value = p.platform;
    document.getElementById('f-status').value = p.status;
    document.getElementById('f-format').value = p.format || 'Reel';
    document.getElementById('f-owner').value = p.owner || '';
    document.getElementById('f-notes').value = p.notes || '';
    document.getElementById('f-date').value = p.date;
    document.getElementById('deleteBtn').style.display = 'inline-block';
  } else {
    const m = MONTHS[activeMonthIdx];
    document.getElementById('modalTitle').textContent = 'New post';
    document.getElementById('f-title').value = '';
    document.getElementById('f-platform').value = 'instagram';
    document.getElementById('f-status').value = 'idea';
    document.getElementById('f-format').value = 'Reel';
    document.getElementById('f-owner').value = '';
    document.getElementById('f-notes').value = '';
    document.getElementById('f-date').value = presetDate || isoDate(m.year, m.month, 1);
    document.getElementById('deleteBtn').style.display = 'none';
  }
  document.getElementById('overlay').classList.add('open');
}

function closeModal(){
  document.getElementById('overlay').classList.remove('open');
  editingId = null;
}

async function saveFromModal(){
  const title = document.getElementById('f-title').value.trim();
  if(!title){
    document.getElementById('err-title').style.display = 'block';
    return;
  }
  const date = document.getElementById('f-date').value;
  const entry = {
    id: editingId || ('p_' + Date.now() + '_' + Math.random().toString(36).slice(2,7)),
    title,
    date,
    platform: document.getElementById('f-platform').value,
    status: document.getElementById('f-status').value,
    format: document.getElementById('f-format').value,
    owner: document.getElementById('f-owner').value.trim(),
    notes: document.getElementById('f-notes').value.trim()
  };

  if(editingId){
    const idx = posts.findIndex(p => p.id === editingId);
    if(idx >= 0) posts[idx] = entry;
  } else {
    posts.push(entry);
  }

  await persistPost(entry);
  closeModal();
  const savedMonth = date.slice(0,7);
  const mi = MONTHS.findIndex(m => m.key === savedMonth);
  if(mi >= 0) activeMonthIdx = mi;
  render();
  activeDayDate = null;
}

async function deleteCurrent(){
  if(editingId){
    const idToDelete = editingId;
    posts = posts.filter(p => p.id !== idToDelete);
    await persistDelete(idToDelete);
  }
  closeModal();
  render();
  activeDayDate = null;
}

/* ---------- Wiring ---------- */

document.getElementById('addPostBtn').addEventListener('click', () => { activeDayDate = null; openModal(null); });
document.getElementById('cancelBtn').addEventListener('click', () => {
  closeModal();
  if(activeDayDate){ openDayModal(activeDayDate); }
});
document.getElementById('backToDayBtn').addEventListener('click', () => {
  closeModal();
  if(activeDayDate){ openDayModal(activeDayDate); }
});
document.getElementById('saveBtn').addEventListener('click', saveFromModal);
document.getElementById('deleteBtn').addEventListener('click', deleteCurrent);
document.getElementById('overlay').addEventListener('click', (e) => { if(e.target.id === 'overlay') closeModal(); });

document.getElementById('dayAddBtn').addEventListener('click', () => {
  const d = activeDayDate;
  closeDayModal();
  openModal(null, d);
});
document.getElementById('dayCloseBtn').addEventListener('click', () => { closeDayModal(); activeDayDate = null; });
document.getElementById('dayOverlay').addEventListener('click', (e) => { if(e.target.id === 'dayOverlay'){ closeDayModal(); activeDayDate = null; } });
window.addEventListener('resize', () => { if(activeDayDate) positionDayPopover(); });

document.querySelectorAll('.filter-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter;
    render();
  });
});

(async function init(){
  await loadPosts();
  document.getElementById('loadingNote').style.display = 'none';
  document.getElementById('calWrap').style.display = 'block';
  render();

  // Poll every 8s so everyone sees each other's edits without refreshing
  setInterval(async () => {
    const dayOpen = document.getElementById('dayOverlay').classList.contains('open');
    const editOpen = document.getElementById('overlay').classList.contains('open');
    if(dayOpen || editOpen) return;
    await loadPosts();
    render();
  }, 8000);
})();
