const STORAGE_KEY = 'resume-builder-data-v1';
const collectionFields = {
  education: ['degree', 'school', 'start', 'end', 'grade'],
  project: ['name', 'description', 'technologies', 'link'],
  experience: ['role', 'company', 'start', 'end', 'description'],
  certification: ['name', 'issuer', 'year', 'link']
};
const profileFields = ['fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'summary'];
const collectionContainers = { education: 'educationList', project: 'projectList', experience: 'experienceList', certification: 'certificationList' };
let skills = [];
let profilePhotoUrl = '';
let saveTimer;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function safeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function readCollection(kind) {
  return [...document.querySelectorAll(`#${collectionContainers[kind]} .entry-card`)].map(card => {
    const entry = {};
    collectionFields[kind].forEach(field => entry[field] = card.querySelector(`[data-field="${field}"]`).value.trim());
    return entry;
  });
}

function getResumeData() {
  const profile = {};
  profileFields.forEach(field => profile[field] = document.getElementById(field).value.trim());
  return { profile, skills, education: readCollection('education'), projects: readCollection('project'), experience: readCollection('experience'), certifications: readCollection('certification') };
}

function saveToLocalStorage() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getResumeData())); }
    catch (error) { console.warn('Resume could not be saved in this browser.', error); }
  }, 180);
}

function createEntry(kind, values = {}) {
  const templateName = `${kind}Template`;
  const fragment = document.getElementById(templateName).content.cloneNode(true);
  const card = fragment.querySelector('.entry-card');
  collectionFields[kind].forEach(field => { card.querySelector(`[data-field="${field}"]`).value = values[field] || ''; });
  document.getElementById(collectionContainers[kind]).append(fragment);
}

function addEducation(values = {}) { createEntry('education', values); updatePreview(); }
function addProject(values = {}) { createEntry('project', values); updatePreview(); }
function addExperience(values = {}) { createEntry('experience', values); updatePreview(); }
function addCertification(values = {}) { createEntry('certification', values); updatePreview(); }

function removeEntry(kind, card) {
  card.remove();
  if (kind === 'education' && !document.querySelector('#educationList .entry-card')) addEducation();
  updatePreview();
}
function removeEducation(card) { removeEntry('education', card); }
function removeProject(card) { removeEntry('project', card); }
function removeExperience(card) { removeEntry('experience', card); }
function removeCertification(card) { removeEntry('certification', card); }

function addSkill(value = document.getElementById('skillInput').value) {
  const skill = value.trim();
  if (!skill || skills.some(existing => existing.toLowerCase() === skill.toLowerCase())) return;
  skills.push(skill);
  document.getElementById('skillInput').value = '';
  renderSkills();
  updatePreview();
}
function removeSkill(index) { skills.splice(index, 1); renderSkills(); updatePreview(); }
function renderSkills() {
  const list = document.getElementById('skillList');
  list.innerHTML = '';
  skills.forEach((skill, index) => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip';
    chip.append(document.createTextNode(skill));
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = '×'; button.setAttribute('aria-label', `Remove ${skill}`);
    button.addEventListener('click', () => removeSkill(index));
    chip.append(button); list.append(chip);
  });
}

function section(title, content) {
  if (!content) return '';
  return `<section class="resume-section"><h2>${title}</h2>${content}</section>`;
}
function dateRange(start, end) { return [start, end].filter(Boolean).map(escapeHtml).join(' – '); }

function renderEducation(entries) {
  return entries.filter(item => Object.values(item).some(Boolean)).map(item => {
    const heading = item.degree ? `<strong>${escapeHtml(item.degree)}</strong>` : '';
    const dates = dateRange(item.start, item.end);
    const title = heading || (item.school ? `<strong>${escapeHtml(item.school)}</strong>` : '');
    const school = item.school && item.degree ? `<div class="resume-item-subheading">${escapeHtml(item.school)}</div>` : '';
    return `<div class="resume-item"><div class="resume-item-heading">${title}<span class="resume-item-dates">${dates}</span></div>${school}${item.grade ? `<div class="resume-item-meta">${escapeHtml(item.grade)}</div>` : ''}</div>`;
  }).join('');
}
function renderProjects(entries) {
  return entries.filter(item => Object.values(item).some(Boolean)).map(item => {
    const name = item.name ? escapeHtml(item.name) : 'Project';
    const link = safeUrl(item.link);
    return `<div class="resume-item"><div class="resume-item-heading"><strong>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${name}</a>` : name}</strong></div>${item.description ? `<p class="resume-item-description">${escapeHtml(item.description)}</p>` : ''}${item.technologies ? `<div class="resume-item-meta"><strong>Technologies:</strong> ${escapeHtml(item.technologies)}</div>` : ''}${link ? `<div class="resume-item-meta"><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.link)}</a></div>` : ''}</div>`;
  }).join('');
}
function renderExperience(entries) {
  return entries.filter(item => Object.values(item).some(Boolean)).map(item => {
    const title = [item.role, item.company].filter(Boolean).map(escapeHtml).join(' · ') || 'Experience';
    return `<div class="resume-item"><div class="resume-item-heading"><strong>${title}</strong><span class="resume-item-dates">${dateRange(item.start, item.end)}</span></div>${item.description ? `<p class="resume-item-description">${escapeHtml(item.description)}</p>` : ''}</div>`;
  }).join('');
}
function renderCertifications(entries) {
  return entries.filter(item => Object.values(item).some(Boolean)).map(item => {
    const label = item.name ? escapeHtml(item.name) : 'Certification';
    const link = safeUrl(item.link);
    return `<div class="resume-item"><div class="resume-item-heading"><strong>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${label}</a>` : label}</strong><span class="resume-item-dates">${escapeHtml(item.year)}</span></div>${item.issuer ? `<div class="resume-item-subheading">${escapeHtml(item.issuer)}</div>` : ''}</div>`;
  }).join('');
}

function updatePreview() {
  const data = getResumeData();
  const { profile } = data;
  document.getElementById('previewName').textContent = profile.fullName || 'Your Name';
  const contact = [profile.email && `✉ ${profile.email}`, profile.phone && `☎ ${profile.phone}`, profile.location && `⌖ ${profile.location}`].filter(Boolean);
  document.getElementById('previewContact').innerHTML = contact.map(value => `<span>${escapeHtml(value)}</span>`).join('');
  const links = [['LinkedIn', profile.linkedin], ['GitHub', profile.github]].filter(([, value]) => safeUrl(value));
  document.getElementById('previewLinks').innerHTML = links.map(([label, value]) => `<a href="${escapeHtml(safeUrl(value))}" target="_blank" rel="noopener noreferrer">${label}</a>`).join('<span aria-hidden="true">·</span>');
  const photo = document.getElementById('previewPhoto');
  if (profilePhotoUrl) { photo.src = profilePhotoUrl; photo.hidden = false; } else { photo.removeAttribute('src'); photo.hidden = true; }
  const sections = [
    section('Professional Summary', profile.summary ? `<p>${escapeHtml(profile.summary)}</p>` : ''),
    section('Experience', renderExperience(data.experience)),
    section('Projects', renderProjects(data.projects)),
    section('Technical Skills', data.skills.length ? `<p>${data.skills.map(escapeHtml).join(' · ')}</p>` : ''),
    section('Education', renderEducation(data.education)),
    section('Certifications', renderCertifications(data.certifications))
  ];
  document.getElementById('previewSections').innerHTML = sections.join('');
  saveToLocalStorage();
}

function loadFromLocalStorage() {
  let data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { data = null; }
  if (!data) { addEducation(); return; }
  profileFields.forEach(field => { document.getElementById(field).value = data.profile?.[field] || ''; });
  ['education', 'project', 'experience', 'certification'].forEach(kind => {
    const items = data[kind === 'project' ? 'projects' : kind === 'certification' ? 'certifications' : kind] || [];
    items.forEach(item => createEntry(kind, item));
  });
  if (!document.querySelector('#educationList .entry-card')) addEducation();
  skills = Array.isArray(data.skills) ? data.skills.filter(skill => typeof skill === 'string') : [];
  renderSkills(); updatePreview();
}

function clearForm() {
  if (!window.confirm('Clear all resume information? This will remove the saved details from this browser.')) return;
  document.getElementById('resumeForm').reset();
  Object.values(collectionContainers).forEach(id => { document.getElementById(id).innerHTML = ''; });
  skills = []; profilePhotoUrl = '';
  renderSkills(); addEducation();
  localStorage.removeItem(STORAGE_KEY);
  updatePreview();
}

async function downloadResume() {
  const resume = document.getElementById('resumePreview');
  if (!window.html2pdf) {
    showDownloadError('PDF download needs an internet connection to load the PDF tool. Please try again while online.');
    return;
  }
  const options = {
    margin: 0,
    filename: `${(document.getElementById('fullName').value.trim() || 'resume').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '')}-resume.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['.resume-item'] }
  };
  const button = document.getElementById('downloadButton');
  button.disabled = true; button.textContent = 'Preparing PDF…';
  try { await window.html2pdf().set(options).from(resume).save(); }
  catch (error) { console.error('PDF generation failed.', error); showDownloadError('The PDF could not be created. Please try again.'); }
  finally { button.disabled = false; button.textContent = '⬇️ Download Resume'; }
}

function showDownloadError(message) {
  document.querySelector('.download-error')?.remove();
  const notice = document.createElement('div'); notice.className = 'download-error'; notice.setAttribute('role', 'alert'); notice.textContent = message;
  document.body.append(notice); setTimeout(() => notice.remove(), 5000);
}

document.getElementById('resumeForm').addEventListener('input', event => {
  if (event.target.id === 'photo') return;
  updatePreview();
});
document.getElementById('resumeForm').addEventListener('click', event => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;
  const card = button.closest('.entry-card');
  const kind = card.dataset.kind;
  if (kind === 'education') removeEducation(card);
  if (kind === 'project') removeProject(card);
  if (kind === 'experience') removeExperience(card);
  if (kind === 'certification') removeCertification(card);
});
document.getElementById('photo').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (profilePhotoUrl) URL.revokeObjectURL(profilePhotoUrl);
  profilePhotoUrl = file && file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
  updatePreview();
});
document.getElementById('addEducationButton').addEventListener('click', () => addEducation());
document.getElementById('addProjectButton').addEventListener('click', () => addProject());
document.getElementById('addExperienceButton').addEventListener('click', () => addExperience());
document.getElementById('addCertificationButton').addEventListener('click', () => addCertification());
document.getElementById('addSkillButton').addEventListener('click', () => addSkill());
document.getElementById('skillInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addSkill(); } });
document.getElementById('clearButton').addEventListener('click', clearForm);
document.getElementById('downloadButton').addEventListener('click', downloadResume);
loadFromLocalStorage();
