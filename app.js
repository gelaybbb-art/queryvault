const STORAGE_KEYS = { snippets: 'queryvault.snippets.v1', notes: 'queryvault.notes.v1', checks: 'queryvault.checks.v1' };

const starterSnippets = [
  {id:'s1',title:'Inspect unprocessed staging rows',category:'Read-only checks',risk:'safe',description:'Find records that have not been processed yet. Review the affected set before making any updates.',tags:['read-only','staging','oracle'],code:`SELECT *\nFROM svc_posupld_status\nWHERE status = 'N'\nORDER BY last_update_datetime DESC;`,updated:'Starter example'},
  {id:'s2',title:'Check table row counts',category:'Read-only checks',risk:'safe',description:'Get an approximate table size from Oracle statistics. Statistics can be stale; use COUNT(*) if an exact count is required.',tags:['read-only','oracle','validation'],code:`SELECT table_name, num_rows, last_analyzed\nFROM user_tables\nWHERE table_name = UPPER(:table_name);`,updated:'Starter example'},
  {id:'s3',title:'Find invalid database objects',category:'Incident investigation',risk:'safe',description:'Identify invalid objects in your current schema before checking dependencies or recompilation options.',tags:['read-only','oracle','incident'],code:`SELECT object_type, object_name, status\nFROM user_objects\nWHERE status = 'INVALID'\nORDER BY object_type, object_name;`,updated:'Starter example'},
  {id:'s4',title:'Inspect recent batch run status',category:'Batch monitoring',risk:'safe',description:'Example query pattern for a batch-run audit table. Replace the sample table and columns with your approved monitoring source.',tags:['read-only','batch','monitoring'],code:`SELECT job_name, run_status, start_time, end_time\nFROM batch_run_audit\nWHERE start_time >= SYSDATE - 1\nORDER BY start_time DESC;`,updated:'Starter example'},
  {id:'s5',title:'Find duplicate business keys',category:'Data validation',risk:'safe',description:'Group by the business key to identify duplicates before deciding how to resolve them.',tags:['read-only','validation','duplicates'],code:`SELECT item, loc, COUNT(*) AS duplicate_count\nFROM your_table\nGROUP BY item, loc\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC;`,updated:'Starter example'},
  {id:'s6',title:'Check item-location availability',category:'Data validation',risk:'safe',description:'Review item/location records and stock-on-hand values. Confirm the correct environment and business keys first.',tags:['read-only','oracle','item-loc'],code:`SELECT item, loc, loc_type, status\nFROM item_loc\nWHERE item = :item\n  AND loc = :loc;`,updated:'Starter example'},
  {id:'s7',title:'Review recent error log entries',category:'Incident investigation',risk:'safe',description:'Example log table query. Adapt the names to your monitoring schema and use a time window relevant to the incident.',tags:['read-only','incident','logs'],code:`SELECT event_time, component, error_code, message\nFROM application_error_log\nWHERE event_time >= SYSTIMESTAMP - INTERVAL '2' HOUR\nORDER BY event_time DESC;`,updated:'Starter example'},
  {id:'s8',title:'Check session activity',category:'Incident investigation',risk:'safe',description:'DBA views may require privileges. Ask your DBA or use approved monitoring tools if the view is not accessible.',tags:['read-only','oracle','performance'],code:`SELECT sid, serial#, username, status, event\nFROM v$session\nWHERE username IS NOT NULL\nORDER BY status, username;`,updated:'Starter example'},
  {id:'s9',title:'Review data before an update',category:'Data correction',risk:'caution',description:'Preview exactly which rows match the proposed update criteria. Never run a write statement until scope and approval are confirmed.',tags:['read-only','review-first','data-fix'],code:`-- Step 1: preview the target rows\nSELECT key_column, status, last_update_datetime\nFROM your_table\nWHERE key_column = :approved_key;`,updated:'Starter example'},
  {id:'s10',title:'Compare source and target counts',category:'Data validation',risk:'safe',description:'Run the count query on each approved source separately, then compare totals and reconcile the keys if they differ.',tags:['read-only','reconciliation','validation'],code:`SELECT COUNT(*) AS row_count\nFROM source_table\nWHERE business_date = :business_date;\n\n-- Run the equivalent count on the target.`,updated:'Starter example'},
  {id:'s11',title:'Inspect scheduler job definitions',category:'Batch monitoring',risk:'safe',description:'Oracle Scheduler view access varies by privilege. Start with USER_SCHEDULER_JOBS for jobs in your own schema.',tags:['read-only','batch','oracle'],code:`SELECT job_name, enabled, state, last_start_date, next_run_date\nFROM user_scheduler_jobs\nORDER BY job_name;`,updated:'Starter example'},
  {id:'s12',title:'Check current schema and database',category:'Read-only checks',risk:'safe',description:'Confirm the connection context before running any support query. Environment mix-ups can cause serious incidents.',tags:['read-only','oracle','safety'],code:`SELECT SYS_CONTEXT('USERENV', 'DB_NAME') AS database_name,\n       SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') AS current_schema,\n       SYS_CONTEXT('USERENV', 'SESSION_USER') AS session_user\nFROM dual;`,updated:'Starter example'}
];

const oracleErrors = [
  {code:'ORA-00904',title:'Invalid identifier',meaning:'Oracle cannot resolve a column or identifier in the statement. Common causes include a misspelled column, wrong alias, or a column that does not exist in that table or view.',check:'Check the exact column name and alias. Inspect table metadata in the correct schema; quote/case rules may matter for quoted identifiers.'},
  {code:'ORA-00942',title:'Table or view does not exist',meaning:'The referenced object may not exist in the current schema, may be named differently, or may not be accessible to the current user.',check:'Confirm the connection and schema, object spelling, synonym, and required grants. Ask the DBA to verify privileges if needed.'},
  {code:'ORA-01476',title:'Divisor is equal to zero',meaning:'An expression attempted to divide by zero. A data value or calculated denominator may be zero or null-handling logic may be incomplete.',check:'Find the denominator expression and inspect the affected data. Consider NULLIF(denominator, 0) where business logic supports it.'},
  {code:'ORA-06502',title:'PL/SQL numeric or value error',meaning:'A PL/SQL operation encountered a value, conversion, or buffer problem. Examples include assigning a string that is too long or converting incompatible values.',check:'Read the full stack and line number. Inspect variable sizes, data types, conversion logic, and the specific record that triggered the exception.'},
  {code:'ORA-00001',title:'Unique constraint violated',meaning:'An insert or update attempted to create a duplicate value in a column set protected by a unique constraint.',check:'Identify the violated constraint and its columns. Query the existing key before retrying; do not delete rows just to force the insert.'},
  {code:'ORA-01861',title:'Literal does not match format string',meaning:'A date or timestamp literal does not match the format expected by the conversion operation.',check:'Check source data types and explicit TO_DATE/TO_TIMESTAMP format masks. Prefer bind variables with proper date types over ambiguous strings.'},
  {code:'ORA-01722',title:'Invalid number',meaning:'Oracle attempted a numeric conversion on text that could not be interpreted as a number. Implicit conversion can make this harder to trace.',check:'Find the conversion and inspect suspect values. Use explicit conversions and validate source strings before numeric operations.'},
  {code:'ORA-01017',title:'Invalid username or password',meaning:'Authentication failed. This can result from incorrect credentials, the wrong service, account state, or an authentication configuration issue.',check:'Confirm the intended environment/service and use the approved credential process. Never paste passwords into troubleshooting notes or scripts.'}
];

const checklist = [
  {title:'Confirm the target environment',detail:'Verify host, service/database, schema, and account before running the query.'},
  {title:'Understand the symptom and scope',detail:'Capture the ticket, affected business process, time window, and known impact.'},
  {title:'Start with read-only checks',detail:'Use SELECT statements and approved monitoring views to inspect the current state.'},
  {title:'Validate the keys and row count',detail:'Check the exact item, location, message ID, or other business key and expected number of rows.'},
  {title:'Review the proposed change',detail:'Check the SQL logic, WHERE clause, transaction behavior, and rollback/recovery plan.'},
  {title:'Confirm authorization and backup',detail:'Obtain required approval and capture a before-state or approved backup for write operations.'},
  {title:'Use a controlled execution plan',detail:'Follow the team runbook; avoid unreviewed production writes and broad updates/deletes.'},
  {title:'Verify and document the outcome',detail:'Re-query the affected records, confirm downstream behavior, and update the incident notes.'}
];

let snippets = load(STORAGE_KEYS.snippets, null) || structuredClone(starterSnippets);
let notes = load(STORAGE_KEYS.notes, []);
let checked = load(STORAGE_KEYS.checks, []);
let activeTag = 'all';
let editingNoteId = null;
let toastTimer = null;

function load(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { showToast('Browser storage is unavailable. Export important work regularly.'); }
}
function esc(value='') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function slug(value='') { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,''); }
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
function persistSnippets() { save(STORAGE_KEYS.snippets, snippets); renderSnippets(); updateStats(); }
function updateStats() {
  document.getElementById('stat-snippets').textContent = snippets.length;
  document.getElementById('nav-count').textContent = snippets.length;
  document.getElementById('stat-errors').textContent = oracleErrors.length;
  document.getElementById('stat-checks').textContent = checklist.length;
  document.getElementById('stat-notes').textContent = notes.length;
}
function setView(view) {
  document.querySelectorAll('.view-panel').forEach(el => el.classList.toggle('active-view', el.id === `view-${view}`));
  document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  const labels = {library:'SQL Library', errors:'Oracle Error Guide', checklist:'Safe Run Checklist', notes:'Troubleshooting Notes'};
  document.getElementById('breadcrumb-current').textContent = labels[view] || 'SQL Library';
  document.getElementById('sidebar').classList.remove('mobile-open');
  if (view === 'notes') renderNotes();
}
function matchesSnippet(s, query) {
  const haystack = [s.title,s.category,s.description,s.code,...(s.tags||[])].join(' ').toLowerCase();
  const tagMatch = activeTag === 'all' || (s.tags||[]).some(t => t.toLowerCase().includes(activeTag)) || (activeTag === 'oracle' && /oracle|ora_|user_tables|v\$/.test(haystack)) || (activeTag === 'batch' && /batch|job|scheduler/.test(haystack)) || (activeTag === 'incident' && /incident|error|log|session/.test(haystack)) || (activeTag === 'read-only' && s.risk === 'safe');
  return tagMatch && haystack.includes(query.toLowerCase());
}
function renderSnippets() {
  const query = document.getElementById('search-input').value.trim();
  const category = document.getElementById('category-filter').value;
  const sort = document.getElementById('sort-filter').value;
  let list = snippets.filter(s => matchesSnippet(s, query) && (category === 'all' || s.category === category));
  if (sort === 'az') list.sort((a,b) => a.title.localeCompare(b.title));
  else if (sort === 'safety') list.sort((a,b) => ({safe:0,caution:1,write:2}[a.risk] - {safe:0,caution:1,write:2}[b.risk]) || a.title.localeCompare(b.title));
  else list.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
  document.getElementById('result-count').textContent = `Showing ${list.length} of ${snippets.length} snippets`;
  document.getElementById('snippet-grid').innerHTML = list.map(s => {
    const risk = s.risk || 'safe';
    const riskLabel = {safe:'Read-only',caution:'Review carefully',write:'Write operation'}[risk] || 'Review';
    return `<article class="snippet-card">
      <div class="snippet-card-top"><span class="category-icon">${categoryIcon(s.category)}</span><span class="risk-pill ${risk}"><i></i>${riskLabel}</span></div>
      <h3>${esc(s.title)}</h3><p class="snippet-description">${esc(s.description || 'Saved SQL snippet.')}</p>
      <div class="code-preview"><pre>${esc(s.code)}</pre></div>
      <div class="tag-row">${(s.tags||[]).slice(0,4).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>
      <div class="snippet-card-footer"><span class="snippet-meta">${esc(s.category)}</span><div class="snippet-actions"><button class="mini-action" data-action="edit" data-id="${esc(s.id)}">Edit</button><button class="mini-action copy" data-action="copy" data-id="${esc(s.id)}">Copy SQL</button></div></div>
    </article>`;
  }).join('');
  document.getElementById('empty-state').classList.toggle('hidden', list.length !== 0);
  document.getElementById('snippet-grid').classList.toggle('hidden', list.length === 0);
}
function categoryIcon(category) {
  return ({'Read-only checks':'⌕','Data validation':'✓','Batch monitoring':'◷','Incident investigation':'⌁','Data correction':'⚙'})[category] || '⌘';
}
function openQueryModal(snippet=null) {
  document.getElementById('query-form').reset();
  document.getElementById('query-form').dataset.editId = snippet?.id || '';
  document.getElementById('modal-title').textContent = snippet ? 'Edit SQL snippet' : 'Save a SQL snippet';
  if (snippet) {
    document.getElementById('query-title').value = snippet.title;
    document.getElementById('query-category').value = snippet.category;
    document.getElementById('query-safety').value = snippet.risk || 'safe';
    document.getElementById('query-code').value = snippet.code;
    document.getElementById('query-description').value = snippet.description || '';
    document.getElementById('query-tags').value = (snippet.tags||[]).join(', ');
  }
  document.getElementById('query-modal').classList.remove('hidden');
  setTimeout(()=>document.getElementById('query-title').focus(),50);
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard.');
  } catch {
    const area = document.createElement('textarea');
    area.value = text; area.style.position='fixed'; area.style.opacity='0'; document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); showToast('Copied to clipboard.'); }
    catch { showToast('Copy failed. Select the SQL and copy it manually.'); }
    area.remove();
  }
}
function renderErrors() {
  const query = document.getElementById('error-search').value.trim().toLowerCase();
  const list = oracleErrors.filter(e => `${e.code} ${e.title} ${e.meaning} ${e.check}`.toLowerCase().includes(query));
  document.getElementById('error-grid').innerHTML = list.map(e => `<article class="error-card">
    <div class="error-card-top"><span class="error-code">${esc(e.code)}</span><button class="copy-error" data-error="${esc(e.code)}">Copy code</button></div>
    <h3>${esc(e.title)}</h3><p>${esc(e.meaning)}</p><div class="first-check"><b>First check →</b> ${esc(e.check)}</div>
  </article>`).join('') || '<div class="empty-state"><div>⌕</div><strong>No matching error</strong><p>Try an Oracle error code like ORA-00904.</p></div>';
}
function renderChecklist() {
  const done = new Set(checked);
  document.getElementById('checklist-items').innerHTML = checklist.map((item,i) => `<label class="check-item ${done.has(i)?'completed':''}"><input type="checkbox" data-check="${i}" ${done.has(i)?'checked':''}/><span><strong>${esc(item.title)}</strong><p>${esc(item.detail)}</p></span></label>`).join('');
  const percent = Math.round(done.size / checklist.length * 100);
  document.getElementById('check-progress-title').textContent = `${done.size} of ${checklist.length} completed`;
  document.getElementById('check-progress-percent').textContent = `${percent}%`;
  document.querySelector('.progress-ring').style.setProperty('--progress', `${percent}%`);
}
function renderNotes() {
  document.getElementById('notes-list').innerHTML = notes.length ? notes.slice().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)).map(n => `<button class="note-list-item ${n.id===editingNoteId?'active':''}" data-note="${esc(n.id)}"><strong>${esc(n.title)}</strong><span>${new Date(n.updatedAt || Date.now()).toLocaleDateString()} · ${(n.symptom||'No summary').slice(0,55).replace(/</g,'&lt;')}</span></button>`).join('') : '<div class="notes-empty">No notes yet.<br>Create a troubleshooting record to capture what you learn.</div>';
  const note = notes.find(n => n.id === editingNoteId);
  const editor = document.getElementById('note-editor');
  if (!note) {
    editor.innerHTML = '<div class="editor-placeholder"><div>✎</div><strong>Keep the next incident easier.</strong><p>Select a note to review it, or create a new troubleshooting record.</p><button class="button-primary compact" id="first-note">Create a note</button></div>';
    return;
  }
  editor.innerHTML = `<div class="note-detail"><div class="section-kicker">TROUBLESHOOTING RECORD</div><h3>${esc(note.title)}</h3><span class="note-date">Updated ${new Date(note.updatedAt || Date.now()).toLocaleString()}</span>
    <div class="note-section"><h4>Symptoms / impact</h4><p>${esc(note.symptom || 'No details recorded.')}</p></div>
    <div class="note-section"><h4>Checks performed</h4><p>${esc(note.checks || 'No checks recorded.')}</p></div>
    <div class="note-section"><h4>Findings / resolution</h4><p>${esc(note.resolution || 'No resolution recorded.')}</p></div>
    <div class="note-detail-actions"><button class="mini-action" data-edit-note="${esc(note.id)}">Edit note</button><button class="mini-action" data-delete-note="${esc(note.id)}">Delete</button><button class="mini-action copy" data-copy-note="${esc(note.id)}">Copy report</button></div></div>`;
}
function openNoteModal(note=null) {
  document.getElementById('note-form').reset();
  document.getElementById('note-form').dataset.editId = note?.id || '';
  document.getElementById('note-modal-title').textContent = note ? 'Edit troubleshooting note' : 'New troubleshooting note';
  if (note) {
    document.getElementById('note-title').value = note.title;
    document.getElementById('note-symptom').value = note.symptom || '';
    document.getElementById('note-checks').value = note.checks || '';
    document.getElementById('note-resolution').value = note.resolution || '';
  }
  document.getElementById('note-modal').classList.remove('hidden');
}
function exportWorkspace() {
  const payload = {app:'QueryVault',version:1,exportedAt:new Date().toISOString(),snippets,notes,checkedChecklistItems:checked};
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`queryvault-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url); showToast('Workspace backup exported.');
}
function importWorkspace(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.app !== 'QueryVault' || !Array.isArray(data.snippets) || !Array.isArray(data.notes)) throw new Error('Invalid format');
      if (!confirm(`Import ${data.snippets.length} snippets and ${data.notes.length} notes? This replaces the current local workspace.`)) return;
      snippets = data.snippets; notes = data.notes; checked = Array.isArray(data.checkedChecklistItems) ? data.checkedChecklistItems : [];
      save(STORAGE_KEYS.snippets,snippets);save(STORAGE_KEYS.notes,notes);save(STORAGE_KEYS.checks,checked);
      renderSnippets();renderNotes();renderChecklist();updateStats();showToast('Workspace imported.');
    } catch { showToast('Could not import this file. Choose a QueryVault JSON backup.'); }
  };
  reader.readAsText(file);
}

document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click',()=>setView(button.dataset.view)));
document.getElementById('hero-add').addEventListener('click',()=>openQueryModal());
document.getElementById('add-query').addEventListener('click',()=>openQueryModal());
document.getElementById('empty-add').addEventListener('click',()=>openQueryModal());
document.getElementById('hero-browse').addEventListener('click',()=>document.getElementById('view-library').scrollIntoView({behavior:'smooth',block:'start'}));
document.getElementById('search-input').addEventListener('input',renderSnippets);
document.getElementById('category-filter').addEventListener('change',renderSnippets);
document.getElementById('sort-filter').addEventListener('change',renderSnippets);
document.querySelectorAll('.filter-chip').forEach(button => button.addEventListener('click',()=>{
  activeTag=button.dataset.tag;
  document.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('selected',b===button));
  renderSnippets();
}));
document.getElementById('snippet-grid').addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]'); if(!button)return;
  const snippet=snippets.find(s=>s.id===button.dataset.id); if(!snippet)return;
  if(button.dataset.action==='copy') copyText(snippet.code);
  if(button.dataset.action==='edit') openQueryModal(snippet);
});
document.getElementById('query-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget, editId=form.dataset.editId;
  const item={
    id:editId || `q_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    title:document.getElementById('query-title').value.trim(),
    category:document.getElementById('query-category').value,
    risk:document.getElementById('query-safety').value,
    code:document.getElementById('query-code').value.trim(),
    description:document.getElementById('query-description').value.trim(),
    tags:document.getElementById('query-tags').value.split(',').map(t=>t.trim().toLowerCase()).filter(Boolean).slice(0,10),
    createdAt:editId ? (snippets.find(s=>s.id===editId)?.createdAt || Date.now()) : Date.now(),
    updated:'Just now'
  };
  if(editId) snippets=snippets.map(s=>s.id===editId?item:s); else snippets.unshift(item);
  persistSnippets();closeModal('query-modal');showToast(editId?'Snippet updated.':'Snippet saved to this browser.');
});
document.getElementById('error-search').addEventListener('input',renderErrors);
document.getElementById('error-grid').addEventListener('click',event=>{
  const button=event.target.closest('[data-error]');if(button)copyText(button.dataset.error);
});
document.getElementById('checklist-items').addEventListener('change',event=>{
  if(!event.target.matches('[data-check]'))return;
  const index=Number(event.target.dataset.check);
  checked=event.target.checked ? [...new Set([...checked,index])] : checked.filter(i=>i!==index);
  save(STORAGE_KEYS.checks,checked);renderChecklist();
});
document.getElementById('reset-checklist').addEventListener('click',()=>{
  if(confirm('Reset all checklist items?')){checked=[];save(STORAGE_KEYS.checks,checked);renderChecklist();showToast('Checklist reset.');}
});
document.getElementById('add-note').addEventListener('click',()=>openNoteModal());
document.getElementById('first-note').addEventListener('click',()=>openNoteModal());
document.getElementById('note-form').addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.currentTarget, editId=form.dataset.editId, existing=notes.find(n=>n.id===editId);
  const note={id:editId||`n_${Date.now()}`,title:document.getElementById('note-title').value.trim(),symptom:document.getElementById('note-symptom').value.trim(),checks:document.getElementById('note-checks').value.trim(),resolution:document.getElementById('note-resolution').value.trim(),createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
  if(editId)notes=notes.map(n=>n.id===editId?note:n);else notes.unshift(note);
  editingNoteId=note.id;save(STORAGE_KEYS.notes,notes);closeModal('note-modal');renderNotes();updateStats();showToast(editId?'Note updated.':'Troubleshooting note saved.');
});
document.getElementById('notes-list').addEventListener('click',event=>{
  const button=event.target.closest('[data-note]');if(!button)return;editingNoteId=button.dataset.note;renderNotes();
});
document.getElementById('note-editor').addEventListener('click',event=>{
  const edit=event.target.closest('[data-edit-note]'), del=event.target.closest('[data-delete-note]'), copy=event.target.closest('[data-copy-note]');
  if(edit){const n=notes.find(n=>n.id===edit.dataset.editNote);if(n)openNoteModal(n);}
  if(del){const n=notes.find(n=>n.id===del.dataset.deleteNote);if(n&&confirm(`Delete note "${n.title}"?`)){notes=notes.filter(x=>x.id!==n.id);editingNoteId=null;save(STORAGE_KEYS.notes,notes);renderNotes();updateStats();showToast('Note deleted.');}}
  if(copy){const n=notes.find(n=>n.id===copy.dataset.copyNote);if(n)copyText(`${n.title}\n\nSymptoms / impact:\n${n.symptom}\n\nChecks performed:\n${n.checks}\n\nFindings / resolution:\n${n.resolution}`);}
});
document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',event=>{if(event.target===backdrop)closeModal(backdrop.id)}));
document.addEventListener('keydown',event=>{
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setView('library');document.getElementById('search-input').focus();}
  if(event.key==='Escape')document.querySelectorAll('.modal-backdrop').forEach(m=>m.classList.add('hidden'));
});
document.getElementById('export-all').addEventListener('click',exportWorkspace);
document.getElementById('theme-info').addEventListener('click',()=>alert('QueryVault is a local-first SQL troubleshooting toolkit. Sample queries are templates only—review schema names, permissions, environment, and approval before using them. Your saved snippets and notes remain in this browser unless you export them.'));
document.getElementById('mobile-menu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('mobile-open'));
document.getElementById('mobile-menu').addEventListener('click',()=>{
  const sidebar=document.getElementById('sidebar');
  if(sidebar.classList.contains('mobile-open')){
    sidebar.style.display='flex';sidebar.style.position='fixed';sidebar.style.zIndex='20';sidebar.style.top='54px';sidebar.style.bottom='0';sidebar.style.left='0';sidebar.style.width='246px';sidebar.style.boxShadow='15px 0 50px #0008';
    sidebar.querySelector('.brand-name').style.display='block';
    sidebar.querySelector('.side-section-label').style.display='block';
    sidebar.querySelectorAll('.nav-link').forEach(x=>x.style.fontSize='12px');
    sidebar.querySelectorAll('.nav-link:not(.active)').forEach(x=>x.style.display='flex');
    sidebar.querySelector('.storage-card').style.display='flex';
    sidebar.querySelector('.profile>div:nth-child(2)').style.display='block';
    sidebar.querySelector('.profile button').style.display='block';
  } else { sidebar.removeAttribute('style'); sidebar.querySelectorAll('*').forEach(x=>x.removeAttribute('style')); }
});
document.getElementById('export-all').addEventListener('contextmenu',event=>{
  event.preventDefault();
  const input=document.createElement('input');input.type='file';input.accept='application/json';input.onchange=()=>input.files?.[0]&&importWorkspace(input.files[0]);input.click();
});
document.getElementById('export-all').title='Export workspace (right-click to import backup)';

renderSnippets();renderErrors();renderChecklist();renderNotes();updateStats();
