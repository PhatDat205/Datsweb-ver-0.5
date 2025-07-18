const defaultShifts = [
  { time: 'Tiết 1: 🌤️', note: '', icon: '' },
  { time: 'Tiết 2: 🌤️', note: '', icon: '' },
  { time: 'Tiết 3: 🌤️', note: '', icon: '' },
  { time: 'Tiết 4: 🌤️', note: '', icon: '' },
  { time: 'Tiết 5: 🌤️', note: '', icon: '' },
  { time: 'Tiết 1: ☀️', note: '', icon: '' },
  { time: 'Tiết 2: ☀️ ', note: '', icon: '' },
  { time: 'Tiết 3: ☀️', note: '', icon: '' },
  { time: 'Tiết 4: ☀️', note: '', icon: '' },
  { time: '🌙: 5h30-7h30', note: '', icon: '' },
  { time: '🌙: 7h30-9h', note: '', icon: '' },
  { time: '🌙: 9h-23h', note: '', icon: '' },
];

function generateEmptySchedule() {
  const schedule = {};
  for (let i = 0; i < 7; i++) {
    schedule[i] = defaultShifts.map(s => ({ ...s }));
  }
  return schedule;
}

async function getUserSchedule() {
  const userId = localStorage.getItem('currentUser');
  if (!userId) {
    console.error('No user logged in');
    return null;
  }

  const db = firebase.firestore();
  const userDoc = await db.collection('users').doc(userId).get();

  let schedule = userDoc.data()?.schedule;
  let reset = false;

  if (!schedule || typeof schedule !== 'object') {
    reset = true;
  } else {
    for (let i = 0; i < 7; i++) {
      if (!Array.isArray(schedule[i]) || schedule[i].length !== defaultShifts.length) {
        reset = true;
        break;
      }
    }
  }

  if (reset) {
    schedule = generateEmptySchedule();
    await db.collection('users').doc(userId).set({ schedule }, { merge: true });
  }

  return schedule;
}

async function saveUserSchedule(schedule) {
  const userId = localStorage.getItem('currentUser');
  if (!userId) {
    console.error('No user logged in');
    return;
  }

  const db = firebase.firestore();
  await db.collection('users').doc(userId).set({ schedule }, { merge: true });
}

async function loadSchedule() {
  const schedule = await getUserSchedule();
  if (!schedule) return;

  const tbody = document.getElementById('schedule-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  for (let shiftIndex = 0; shiftIndex < defaultShifts.length; shiftIndex++) {
    const row = document.createElement('tr');
    const shiftTime = schedule[0]?.[shiftIndex]?.time || defaultShifts[shiftIndex].time;
    row.innerHTML = `<td>${shiftTime}</td>`;

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayKey = String(dayIndex);
      const shift = schedule[dayKey]?.[shiftIndex] || { icon: '', note: '' };
      const icon = shift.icon ? getIcon(shift.icon) + ' ' : '';
      const note = shift.note || '';
      const colorClass = shift.icon ? `${shift.icon}` : '';
      row.innerHTML += `<td class="${colorClass}" data-day="${dayIndex}" data-shift="${shiftIndex}">${icon}${note}</td>`;
    }

    tbody.appendChild(row);
  }

  const shiftSelect = document.getElementById('edit-shift');
  if (shiftSelect) {
    shiftSelect.innerHTML = defaultShifts
      .map((shift, idx) => `<option value="${idx}">${shift.time}</option>`)
      .join('');
  }

  document.querySelectorAll('#schedule-table td').forEach(td => {
    td.addEventListener('click', function () {
      if (document.getElementById('edit-schedule').style.display === 'block') {
        const day = this.getAttribute('data-day');
        const shift = this.getAttribute('data-shift');
        applyTempEdit(day, shift);
      }
    });
  });
}

function getIcon(icon) {
  switch (icon) {
    case 'work': return '🔴🏃';
    case 'study': return '🟠🎓';
    case 'extra': return '🟣📚';
    case 'play': return '🟢🎮';
    case 'Free': return '🟢🌷͙֒';
    case 'other': return '⭕📌';
    default: return '';
  }
}

function editSchedule() {
  document.getElementById('edit-schedule').style.display = 'block';
  document.getElementById('edit-day').style.display = 'none';
  document.getElementById('edit-shift').style.display = 'block';
  document.getElementById('shift-time').style.display = 'block';
  document.getElementById('shift-note').style.display = 'block';
  document.getElementById('shift-icon').style.display = 'block';

  const shiftSelect = document.getElementById('edit-shift');
  const selectedShift = shiftSelect.value;
  getUserSchedule().then(schedule => {
    if (schedule && schedule[0] && schedule[0][selectedShift]) {
      document.getElementById('shift-time').value = schedule[0][selectedShift].time || '';
    }
  });
}

function applyTempEdit(day, shift) {
  const note = document.getElementById('shift-note').value;
  const icon = document.getElementById('shift-icon').value;
  const td = document.querySelector(`#schedule-table td[data-day="${day}"][data-shift="${shift}"]`);
  if (td) {
    td.innerHTML = (icon ? getIcon(icon) + ' ' : '') + (note || '');
    td.className = icon ? icon : '';
  }
}

document.getElementById('schedule-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const shift = parseInt(document.getElementById('edit-shift').value);
  const time = document.getElementById('shift-time').value.trim();
  const note = document.getElementById('shift-note').value;
  const icon = document.getElementById('shift-icon').value;

  const schedule = await getUserSchedule();
  if (!schedule) return;

  if (time) {
    for (let i = 0; i < 7; i++) {
      const dayKey = String(i);
      if (Array.isArray(schedule[dayKey]) && schedule[dayKey][shift]) {
        schedule[dayKey][shift].time = time;
      }
    }
  }

  document.querySelectorAll('#schedule-table td').forEach(td => {
    const day = td.getAttribute('data-day');
    const shiftIdx = td.getAttribute('data-shift');
    const iconClass = td.className;
    const noteContent = td.innerHTML.replace(/🔴🏃|🟠🎓|🟣📚|🟢🎮|🟢🌷|⭕📌 /, '').trim();
    if (day !== null && shiftIdx !== null) {
      schedule[day][shiftIdx].icon = iconClass || '';
      schedule[day][shiftIdx].note = noteContent || '';
    }
  });

  await saveUserSchedule(schedule);
  document.getElementById('edit-schedule').style.display = 'none';
  await loadSchedule();
});

document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      localStorage.setItem('currentUser', user.uid);
      await loadSchedule();
    } else {
      localStorage.removeItem('currentUser');
    }
  });
});
