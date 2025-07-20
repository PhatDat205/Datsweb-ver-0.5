// js/schedule.js

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

  // Thêm nút Phóng to
  if (!document.getElementById('zoom-schedule-btn')) {
    const zoomBtn = document.createElement('button');
    zoomBtn.id = 'zoom-schedule-btn';
    zoomBtn.textContent = 'Phóng to';
    zoomBtn.style.margin = '20px auto 0 auto';
    zoomBtn.style.display = 'block';
    zoomBtn.style.backgroundColor = '#28a745';
    zoomBtn.style.color = '#fff';
    zoomBtn.style.fontSize = '16px';
    zoomBtn.style.borderRadius = '5px';
    zoomBtn.style.padding = '10px 24px';
    zoomBtn.style.border = 'none';
    zoomBtn.style.cursor = 'pointer';
    zoomBtn.onclick = showFullScreenSchedule;
    document.getElementById('schedule-section').appendChild(zoomBtn);
  }
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

// Hàm hiển thị thời khóa biểu toàn màn hình
function showFullScreenSchedule() {
  const table = document.getElementById('schedule-table');
  if (!table) {
    console.error('Schedule table not found');
    return;
  }

  // Tạo modal toàn màn hình
  const modal = document.createElement('div');
  modal.id = 'fullscreen-schedule-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '1000';
  modal.style.overflow = 'auto';

  // Tạo container cho bảng
  const tableContainer = document.createElement('div');
  tableContainer.style.backgroundColor = '#fff';
  tableContainer.style.borderRadius = '8px';
  tableContainer.style.padding = '20px';
  tableContainer.style.maxWidth = '95vw';
  tableContainer.style.maxHeight = '95vh';
  tableContainer.style.overflow = 'hidden';
  tableContainer.style.position = 'relative';

  // Sao chép bảng
  const clonedTable = table.cloneNode(true);
  clonedTable.style.transformOrigin = 'top left';
  clonedTable.style.width = 'auto';
  clonedTable.style.height = 'auto';

  // Tính tỷ lệ để bảng vừa modal
  const windowWidth = window.innerWidth * 1;
  const windowHeight = window.innerHeight * 0.99;
  const tableWidth = table.offsetWidth;
  const tableHeight = table.offsetHeight;
  const scale = Math.min(windowWidth / tableWidth, windowHeight / tableHeight);
  clonedTable.style.transform = `scale(${scale})`;

  // Nút đóng
  const closeButton = document.createElement('button');
  closeButton.textContent = 'X';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.backgroundColor = '#ff4444';
  closeButton.style.color = '#fff';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '5px';
  closeButton.style.padding = '5px 10px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontSize = '16px';
  closeButton.onclick = () => modal.remove();

  // Thêm bảng và nút đóng vào container
  tableContainer.appendChild(clonedTable);
  tableContainer.appendChild(closeButton);
  modal.appendChild(tableContainer);
  document.body.appendChild(modal);

  console.log('Full-screen schedule displayed with scale:', scale);
}

async function fetchWeather() {
  try {
    const response = await fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=10.8636&longitude=106.6291&current=temperature_2m,weather_code,uv_index,precipitation_probability&timezone=Asia/Ho_Chi_Minh'
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    const weatherInfo = document.getElementById('weather-info');
    if (!weatherInfo) return;

    const { temperature_2m, weather_code, uv_index, precipitation_probability, time } = data.current;

    // Ghi log toàn bộ dữ liệu API để kiểm tra
    console.log('API Response:', { temperature_2m, weather_code, uv_index, precipitation_probability, time });

    // Chuyển đổi thời gian sang định dạng giờ địa phương
    const timeInHocMon = new Date(time).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    // Kiểm tra giờ để xác định ban đêm (18:00-6:00)
    const currentHour = new Date(time).getHours();
    const isNight = currentHour >= 18 || currentHour < 6;

    // Xác định tình trạng thời tiết dựa trên weather_code và precipitation_probability
    let weatherStatus = 'Không xác định';
    if (precipitation_probability > 50) {
      weatherStatus = 'Có thể mưa';
    } else {
      switch (weather_code) {
        case 0: weatherStatus = isNight ? 'Trời quang ban đêm' : 'Trời quang'; break;
        case 1: case 2: case 3: weatherStatus = isNight ? 'Mây rải rác' : 'Nắng nhẹ'; break;
        case 45: case 48: weatherStatus = 'Sương mù'; break;
        case 51: case 53: case 55: weatherStatus = 'Mưa phùn'; break;
        case 61: case 63: case 65: weatherStatus = 'Mưa'; break;
        case 66: case 67: weatherStatus = 'Mưa to'; break;
        case 80: case 81: case 82: weatherStatus = 'Mưa rào'; break;
        case 95: weatherStatus = 'Dông'; break;
        default: weatherStatus = 'Không xác định'; break;
      }
    }

    // Cảnh báo nếu precipitation_probability và weather_code mâu thuẫn
    if (precipitation_probability < 10 && [61, 63, 65, 66, 67, 80, 81, 82, 95].includes(weather_code)) {
      console.warn('Warning: Low precipitation probability but weather_code indicates rain.');
      weatherStatus = 'Có thể mưa';
    }

    // Hiển thị thông tin thời tiết
    weatherInfo.innerHTML = `
      Tình trạng: ${weatherStatus} | Nhiệt độ: ${temperature_2m}°C | Xác suất mưa: ${precipitation_probability}% | Chỉ số UV: ${uv_index} | Giờ: ${timeInHocMon}
    `;
  } catch (error) {
    console.error('Error fetching weather:', error);
    const weatherInfo = document.getElementById('weather-info');
    if (weatherInfo) {
      weatherInfo.innerHTML = 'Không thể tải thông tin thời tiết';
    }
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
      await fetchWeather(); // Gọi hàm lấy thời tiết lần đầu
      setInterval(fetchWeather, 10 * 60 * 1000); // Cập nhật thời tiết mỗi 10 phút
    } else {
      localStorage.removeItem('currentUser');
    }
  });
});
