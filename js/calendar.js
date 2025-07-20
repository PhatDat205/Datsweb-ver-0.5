// js/calendar.js

const ICONS = [
  { value: '', label: '❌ Không chọn', color: '', icon: '' },
  { value: 'happy', label: '😊', color: '#2196f3', icon: '😊' },
  { value: 'sad', label: '😔', color: '#888', icon: '😔' },
  { value: 'normal', label: '🐒', color: '#ff9800', icon: '🐒' }
];

let editMode = false;
window.calendarCellState = {};

function getCalendarKey(year, month) {
  return `${year}-${month + 1}`;
}

// Lấy trạng thái lịch từ Firestore
async function loadCalendarState(year, month) {
  const user = firebase.auth().currentUser;
  if (!user) return {};
  const db = firebase.firestore();
  const doc = await db.collection('users').doc(user.uid).get();
  const calendarData = doc.data()?.calendar || {};
  return calendarData[getCalendarKey(year, month)] || {};
}

// Lưu trạng thái lịch vào Firestore
async function saveCalendarState(year, month, state) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const db = firebase.firestore();
  const docRef = db.collection('users').doc(user.uid);
  const doc = await docRef.get();
  let calendarData = doc.data()?.calendar || {};
  calendarData[getCalendarKey(year, month)] = state;
  await docRef.set({ calendar: calendarData }, { merge: true });
}

function getCurrentYearMonth() {
  const monthYear = document.getElementById('month-year').textContent.trim();
  const match = monthYear.match(/Tháng (\d{1,2}) năm (\d{4})/);
  if (match) {
    return { month: parseInt(match[1], 10) - 1, year: parseInt(match[2], 10) };
  }
  const now = new Date();
  return { month: now.getMonth(), year: now.getFullYear() };
}

// Hàm gắn sự kiện click cho ô lịch
function attachCellClickEvents() {
  const cells = document.querySelectorAll('.cell-content[data-date]');
  cells.forEach(cell => {
    // Xóa sự kiện cũ để tránh trùng lặp
    cell.removeEventListener('click', handleCellClick);
    cell.addEventListener('click', handleCellClick);
  });
}

function handleCellClick() {
  const dateStr = this.getAttribute('data-date');
  const iconSelect = document.getElementById('calendar-icon');
  const noteInput = document.getElementById('calendar-note');
  if (!iconSelect || !noteInput) {
    console.error('Form elements not found: #calendar-icon or #calendar-note');
    return;
  }
  const iconVal = iconSelect.value;
  const noteVal = noteInput.value.trim();
  console.log('Clicked cell:', { dateStr, iconVal, noteVal });

  if (!window.calendarCellState) window.calendarCellState = {};

  // Cập nhật trạng thái ô
  const td = this.parentElement;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (!iconVal) {
    delete window.calendarCellState[dateStr];
    td.className = 'calendar-cell' + (todayStr === dateStr ? ' today' : '');
    this.innerHTML = `<span class="day-number">${this.querySelector('.day-number').textContent}</span>`;
  } else {
    window.calendarCellState[dateStr] = {
      icon: iconVal,
      note: noteVal
    };
    const iconObj = ICONS.find(i => i.value === iconVal);
    td.className = `calendar-cell ${iconVal}` + (todayStr === dateStr ? ' today' : '');
    this.innerHTML = `
      <span class="day-number">${this.querySelector('.day-number').textContent}</span>
      ${iconObj && iconObj.icon ? `<span class="calendar-icon">${iconObj.icon}</span>` : ''}
      ${noteVal ? `<span class="calendar-note">${noteVal}</span>` : ''}
    `;
  }
  console.log('Updated cell state:', window.calendarCellState[dateStr]);
}

function showEditForm() {
  if (document.getElementById('calendar-edit-form')) return;
  const formHtml = `
    <div id="calendar-edit-form" class="calendar-edit-form">
      <label>Ghi chú:</label>
      <input type="text" id="calendar-note" maxlength="30" />
      <label>Chọn icon & màu:</label>
      <select id="calendar-icon">
        ${ICONS.map(i => `<option value="${i.value}">${i.label}</option>`).join('')}
      </select>
      <button id="calendar-edit-save">Lưu</button>
      <button id="calendar-edit-cancel">Hủy</button>
      <p style="font-size:13px;color:#888;margin-top:6px;">Bấm vào ô lịch để áp dụng ghi chú & màu</p>
    </div>
  `;
  document.getElementById('calendar-section').insertAdjacentHTML('beforeend', formHtml);

  document.getElementById('calendar-edit-save').onclick = async () => {
    editMode = false;
    document.getElementById('calendar-edit-form').remove();
    const { year, month } = getCurrentYearMonth();
    await saveCalendarState(year, month, window.calendarCellState || {});
    await loadCalendar(year, month);
  };
  document.getElementById('calendar-edit-cancel').onclick = async () => {
    editMode = false;
    document.getElementById('calendar-edit-form').remove();
    await loadCalendar();
  };
  editMode = true;

  // Gắn sự kiện click ngay khi form hiển thị
  attachCellClickEvents();
}

async function loadCalendar(year = new Date().getFullYear(), month = new Date().getMonth()) {
  const calendarSection = document.getElementById('calendar-section');
  const calendarHeader = document.getElementById('calendar-header');
  const calendarBody = document.getElementById('calendar-body');
  const monthYear = document.getElementById('month-year');
  if (!calendarBody || !monthYear || !calendarHeader || !calendarSection) {
    console.error('Missing calendar elements');
    return;
  }

  // Tiêu đề căn giữa
  calendarHeader.innerHTML = `
    <div style="width:100%;text-align:center;">
      <span id="month-year" style="font-size:20px;font-weight:bold;">Tháng ${month + 1} năm ${year}</span>
      <div style="font-size:22px;font-weight:bold;margin-top:4px;">Lịch</div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:10px;">
      <button id="prev-month"><</button>
      <button id="next-month">></button>
    </div>
  `;

  // Tính ngày đầu và cuối tháng
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  // Load trạng thái từng ô từ Firestore
  window.calendarCellState = await loadCalendarState(year, month);

  calendarBody.innerHTML = '';
  let row = document.createElement('tr');
  let dayCount = 1;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Ô trống đầu tháng
  for (let i = 0; i < firstDayOfWeek; i++) {
    row.innerHTML += '<td class="calendar-cell"><div class="cell-content"></div></td>';
  }

  for (let i = firstDayOfWeek; dayCount <= daysInMonth; i++) {
    if (i > 6) {
      calendarBody.appendChild(row);
      row = document.createElement('tr');
      i = 0;
    }
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCount).padStart(2, '0')}`;
    let className = "calendar-cell";
    let iconHtml = '';
    let noteHtml = '';

    // Trạng thái ghi chú & icon
    const cellState = window.calendarCellState?.[dateStr] || {};
    if (cellState.icon) {
      const iconObj = ICONS.find(i => i.value === cellState.icon);
      if (iconObj && iconObj.icon) iconHtml = `<span class="calendar-icon">${iconObj.icon}</span>`;
      if (iconObj && iconObj.value) className += ` ${iconObj.value}`; // Thêm class màu
    }
    if (cellState.note) noteHtml = `<span class="calendar-note">${cellState.note}</span>`;

    // Đánh dấu ngày hôm nay
    if (todayStr === dateStr) className += " today";

    row.innerHTML += `<td class="${className}">
      <div class="cell-content" data-date="${dateStr}">
        <span class="day-number">${dayCount}</span>
        ${iconHtml}${noteHtml}
      </div>
    </td>`;
    dayCount++;
  }

  while (row.children.length < 7) {
    row.innerHTML += '<td class="calendar-cell"><div class="cell-content"></div></td>';
  }
  calendarBody.appendChild(row);

  // Sự kiện điều hướng tháng/năm
  document.getElementById('prev-month').onclick = () => {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    loadCalendar(year, month);
  };
  document.getElementById('next-month').onclick = () => {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    loadCalendar(year, month);
  };

  // Gắn lại sự kiện click nếu đang ở editMode
  if (editMode) {
    attachCellClickEvents();
  }

  // Thêm nút chỉnh sửa dưới lịch
  if (!document.getElementById('calendar-edit-btn')) {
    const editBtn = document.createElement('button');
    editBtn.id = 'calendar-edit-btn';
    editBtn.textContent = 'Chỉnh sửa';
    editBtn.style.margin = '20px auto 0 auto';
    editBtn.style.display = 'block';
    editBtn.style.backgroundColor = '#ff9800';
    editBtn.style.color = '#fff';
    editBtn.style.fontSize = '16px';
    editBtn.style.borderRadius = '5px';
    editBtn.style.padding = '10px 24px';
    editBtn.onclick = () => {
      if (!editMode) showEditForm();
    };
    calendarSection.appendChild(editBtn);
  }
}

// Khởi tạo lịch khi vào trang, lắng nghe đăng nhập firebase
document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged(async (user) => {
    const now = new Date();
    await loadCalendar(now.getFullYear(), now.getMonth());
  });
});
