// Hàm định dạng tiền tệ (VND)
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Hàm tạo và cập nhật CircleProgress
function updateProgressCircle(percentage) {
    const progressElement = document.querySelector('.progress');
    if (!progressElement) {
        console.error('Progress element not found');
        return;
    }

    progressElement.innerHTML = '';
    const circle = new CircleProgress('.progress', {
        max: 100,
        value: Math.min(percentage, 100),
        textFormat: 'percent',
        textStyle: {
            font: 'bold 24px "Segoe UI"',
            color: '#01579b'
        }
    });
    console.log('Progress circle updated with percentage:', percentage);
}

// Hàm gắn sự kiện cho nút "Nhật ký"
// Sửa: chỉ gắn event một lần duy nhất, không bị lặp
function attachHistoryButtonEvent() {
    const historyBtn = document.getElementById('history-btn');
    if (historyBtn) {
        if (historyBtn._eventAttached) return;
        historyBtn._eventAttached = true;
        historyBtn.addEventListener('click', () => {
            console.log('History button clicked');
            const modal = document.querySelector('.modal');
            if (modal) {
                modal.remove();
                console.log('Removed existing modal before creating new one');
            }
            loadHistory();
        });
        console.log('History button event attached successfully');
    } else {
        console.error('History button not found in DOM');
    }
}

// Theo dõi thay đổi DOM để gắn sự kiện #history-btn
function observeResultSection() {
    const resultSection = document.getElementById('result-section');
    if (!resultSection) {
        console.error('Result section not found for MutationObserver');
        return;
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(() => {
            const historyBtn = document.getElementById('history-btn');
            if (historyBtn) {
                attachHistoryButtonEvent();
                console.log('MutationObserver: Re-attached history button event after DOM change');
            }
        });
    });

    observer.observe(resultSection, { childList: true, subtree: true });
    console.log('MutationObserver started for result-section');
}

// Hàm tải dữ liệu từ Firestore
async function loadUserData() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user logged in');
        return;
    }

    console.log('Loading user data for:', user.uid);
    const db = firebase.firestore();
    const docRef = db.collection('users').doc(user.uid);
    try {
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('target-amount').value = data.targetAmount ? data.targetAmount.toLocaleString('vi-VN') : '';
            document.getElementById('current-amount').value = data.currentAmount ? data.currentAmount.toLocaleString('vi-VN') : '';
            updateProgressCircle(data.targetAmount > 0 ? (data.currentAmount / data.targetAmount) * 100 : 0);
            console.log('User data loaded:', data);
            attachHistoryButtonEvent();
        } else {
            console.log('No user data found in Firestore');
        }
    } catch (error) {
        console.error('Error loading user data:', error.message);
    }
}

// Hàm tải lịch sử từ Firestore và hiển thị modal
async function loadHistory() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user logged in for history');
        alert('Vui lòng đăng nhập để xem lịch sử!');
        return;
    }

    const historySection = document.getElementById('history-section');
    if (!historySection) {
        console.error('History section not found');
        return;
    }
    historySection.innerHTML = '';

    console.log('Loading history for user:', user.uid);
    const db = firebase.firestore();

    // Tải lịch sử tuần (loại bỏ lặp)
    let weekHistoryList = '<h4>Lịch sử làm việc</h4><ul>';
    try {
        const weekHistoryRef = db.collection('users').doc(user.uid).collection('history').orderBy('week', 'asc');
        const weekSnapshot = await weekHistoryRef.get();
        if (weekSnapshot.empty) {
            weekHistoryList += '<li>Chưa có lịch sử làm việc.</li>';
        } else {
            const weekSet = new Set();
            weekSnapshot.forEach(doc => {
                const data = doc.data();
                if (!weekSet.has(data.week)) {
                    weekSet.add(data.week);
                    weekHistoryList += `<li>Tuần ${data.week}: ${data.hours} giờ (+${formatCurrency(data.amountAdded)}) (+${data.percentageAdded.toFixed(2)}%)</li>`;
                }
            });
        }
        weekHistoryList += '</ul>';
    } catch (error) {
        console.error('Error loading week history:', error.message);
        weekHistoryList += '<li>Lỗi khi tải lịch sử làm việc: ' + error.message + '</li></ul>';
    }

    // Tải lịch sử mục tiêu (chỉ lấy mục tiêu trước đó)
    let goalHistoryList = '<h4>Lịch sử mục tiêu</h4><ul>';
    try {
        const goalHistoryRef = db.collection('users').doc(user.uid).collection('historyGoals').orderBy('timestamp', 'desc').limit(2);
        const goalSnapshot = await goalHistoryRef.get();
        if (goalSnapshot.size <= 1) {
            goalHistoryList += '<li>Chưa có mục tiêu trước đó.</li>';
        } else {
            const docs = goalSnapshot.docs;
            const previousGoal = docs[1].data();
            goalHistoryList += `<li>Mục tiêu: ${formatCurrency(previousGoal.targetAmount)}, Hiện có: ${formatCurrency(previousGoal.currentAmount)} 
                                <button class="goal-history-btn" data-id="${docs[1].id}">Quay lại</button></li>`;
        }
        
    } catch (error) {
        console.error('Error loading goal history:', error.message);
        goalHistoryList += '<li>Lỗi khi tải lịch sử mục tiêu: ' + error.message + '</li></ul>';
    }

    // Tạo modal
    let modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
        console.log('Removed existing modal');
    }
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            ${weekHistoryList}
            ${goalHistoryList}
            <button id="reset-history-btn">🗑️ Xóa lịch sử</button>
            <button id="close-modal-btn">Đóng</button>
        </div>
    `;
    document.body.appendChild(modal);
    console.log('Modal appended to document.body');
    setTimeout(() => {
        modal.style.display = 'flex';
        const computedStyle = getComputedStyle(modal);
        console.log('Modal display:', computedStyle.display);
        console.log('Modal z-index:', computedStyle.zIndex);
        if (computedStyle.display !== 'flex') {
            console.error('Modal not displayed, attempting to show again');
            modal.style.display = 'flex';
        }
    }, 50);

    // Gắn sự kiện cho nút "Quay lại"
    const goalHistoryBtn = document.querySelector('.goal-history-btn');
    if (goalHistoryBtn) {
        goalHistoryBtn.addEventListener('click', async () => {
            const docId = goalHistoryBtn.getAttribute('data-id');
            console.log('Restoring goal with docId:', docId);
            try {
                const doc = await db.collection('users').doc(user.uid).collection('historyGoals').doc(docId).get();
                if (doc.exists) {
                    const data = doc.data();
                    console.log('Goal data to restore:', data);
                    await db.collection('users').doc(user.uid).set({
                        targetAmount: data.targetAmount,
                        currentAmount: data.currentAmount
                    }, { merge: true });
                    document.getElementById('target-amount').value = data.targetAmount.toLocaleString('vi-VN');
                    document.getElementById('current-amount').value = data.currentAmount.toLocaleString('vi-VN');
                    updateProgressCircle(data.targetAmount > 0 ? (data.currentAmount / data.targetAmount) * 100 : 0);
                    console.log('Restored previous goal:', data);
                    modal.style.display = 'none';
                    modal.remove();
                    await calculateGoal();
                } else {
                    console.error('Goal document not found for docId:', docId);
                    alert('Không tìm thấy mục tiêu để khôi phục!');
                }
            } catch (error) {
                console.error('Error restoring goal:', error.message);
                alert('Lỗi khi khôi phục mục tiêu: ' + error.message);
            }
        });
    }

    // Gắn sự kiện nút "Xóa lịch sử"
    const resetBtn = document.getElementById('reset-history-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetHistory);
    } else {
        console.error('Reset history button not found');
    }

    // Gắn sự kiện nút "Đóng"
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            modal.remove();
            console.log('Modal closed');
        });
    } else {
        console.error('Close modal button not found');
    }
}

// Hàm xóa lịch sử và đặt lại
async function resetHistory() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.log('No user logged in for reset');
        alert('Vui lòng đăng nhập để xóa lịch sử!');
        return;
    }

    console.log('Resetting history for user:', user.uid);
    const db = firebase.firestore();
    try {
        const historyRef = db.collection('users').doc(user.uid).collection('history');
        const snapshot = await historyRef.get();
        console.log('History records to delete:', snapshot.size);
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log('History deleted successfully');
        } else {
            console.log('No history records to delete');
        }

        const targetAmount = parseFloat(document.getElementById('target-amount').value.replace(/[^0-9]/g, '')) || 0;
        await db.collection('users').doc(user.uid).set({
            targetAmount,
            currentAmount: 0
        }, { merge: true });

        document.getElementById('current-amount').value = '0';
        document.getElementById('weekly-hours').value = '';
        updateProgressCircle(0);
        console.log('History reset successfully');
        const modal = document.querySelector('.modal');
        if (modal) {
            modal.style.display = 'none';
            modal.remove();
            console.log('Modal closed after reset');
        }
        await calculateGoal();
    } catch (error) {
        console.error('Error resetting history:', error.message);
        alert('Lỗi khi xóa lịch sử: ' + error.message);
    }
}

// Hàm tính toán và lưu dữ liệu
async function calculateGoal() {
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('Vui lòng đăng nhập để lưu dữ liệu!');
        console.log('No user logged in for calculateGoal');
        return;
    }

    console.log('Calculating goal for user:', user.uid);
    const targetAmountInput = document.getElementById('target-amount').value;
    const currentAmountInput = document.getElementById('current-amount').value;
    const weeklyHoursInput = document.getElementById('weekly-hours').value;

    // Parse input
    const targetAmount = parseFloat(targetAmountInput.replace(/[^0-9]/g, '')) || 0;
    let currentAmount = parseFloat(currentAmountInput.replace(/[^0-9]/g, '')) || 0;
    const weeklyHours = parseFloat(weeklyHoursInput) || 0;

    console.log('Parsed input:', { targetAmount, currentAmount, weeklyHours });

    const resultSection = document.getElementById('result-section');
    if (!resultSection) {
        console.error('Result section not found');
        return;
    }
    if (targetAmount <= 0) {
        resultSection.innerHTML = '<p>Vui lòng nhập số tiền mục tiêu hợp lệ!</p>';
        console.error('Invalid target amount:', targetAmount);
        return;
    }

    // Tính tiền từ giờ làm (25.5k/giờ)
    const amountAdded = weeklyHours * 25500;
    const percentageAdded = targetAmount > 0 ? (amountAdded / targetAmount) * 100 : 0;
    currentAmount = currentAmount + amountAdded; // Đảm bảo cộng chính xác

    console.log('Calculated:', { amountAdded, percentageAdded, currentAmount });

    // Cập nhật DOM tuần tự
    let progressElement = document.querySelector('.progress');
    if (!progressElement) {
        progressElement = document.createElement('div');
        progressElement.className = 'progress';
        resultSection.appendChild(progressElement);
    }

    // Cập nhật vòng tròn tiến trình
    const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    updateProgressCircle(percentage);

    // Lưu dữ liệu vào Firestore
    const db = firebase.firestore();
    const userDoc = db.collection('users').doc(user.uid);
    try {
        await userDoc.set({
            targetAmount,
            currentAmount
        }, { merge: true });
        console.log('Saved to Firestore:', { targetAmount, currentAmount });

        // Lưu lịch sử mục tiêu
        await userDoc.collection('historyGoals').add({
            targetAmount,
            currentAmount,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Goal history saved');

        // Lưu lịch sử tuần
        let weekNumber = 1;
        if (weeklyHours > 0) {
            const historyRef = userDoc.collection('history');
            const snapshot = await historyRef.orderBy('week', 'desc').limit(1).get();
            weekNumber = snapshot.empty ? 1 : snapshot.docs[0].data().week + 1;
            await historyRef.add({
                week: weekNumber,
                hours: weeklyHours,
                amountAdded,
                percentageAdded,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Week history saved:', { weekNumber, hours: weeklyHours, amountAdded });
        }

        // Cập nhật kết quả
        let resultDetails = document.getElementById('result-details');
        if (!resultDetails) {
            resultDetails = document.createElement('div');
            resultDetails.id = 'result-details';
            resultSection.appendChild(resultDetails);
        }
        resultDetails.innerHTML = `
            <p>Số tiền hiện có: ${formatCurrency(currentAmount)}</p>
            <p>Số tiền còn thiếu: ${formatCurrency(Math.max(0, targetAmount - currentAmount))}</p>
            ${weeklyHours > 0 ? `<p>Tuần ${weekNumber}: ${weeklyHours} giờ (+${formatCurrency(amountAdded)}) (+${percentageAdded.toFixed(2)}%)</p>` : ''}
        `;

        // Thêm tiêu đề nếu chưa có
        if (!resultSection.querySelector('h3')) {
            const title = document.createElement('h3');
            title.textContent = 'Kết quả';
            resultSection.insertBefore(title, resultSection.firstChild);
        }

        // Thêm nút Nhật ký nếu chưa có
        let historyBtn = document.getElementById('history-btn');
        if (!historyBtn) {
            historyBtn = document.createElement('button');
            historyBtn.id = 'history-btn';
            historyBtn.textContent = '📜 Nhật ký';
            resultSection.appendChild(historyBtn);
        }

        // Gắn lại sự kiện với delay
        setTimeout(() => {
            const historyBtn = document.getElementById('history-btn');
            if (historyBtn) {
                attachHistoryButtonEvent();
                console.log('Re-attached history button event after updating result section');
            } else {
                console.error('History button not found after updating result section');
                // Thử lại sau 500ms
                setTimeout(() => {
                    const retryBtn = document.getElementById('history-btn');
                    if (retryBtn) {
                        attachHistoryButtonEvent();
                        console.log('Retry: Re-attached history button event');
                    } else {
                        console.error('Retry: History button still not found');
                    }
                }, 500);
            }
        }, 100);
        console.log('Goal calculated and UI updated');
    } catch (error) {
        console.error('Error saving data to Firestore:', error.message);
        alert('Lỗi khi lưu dữ liệu: ' + error.message);
    }

    // Cập nhật lại input current-amount để phản ánh số tiền mới
    document.getElementById('current-amount').value = currentAmount.toLocaleString('vi-VN');
    // Xóa trường giờ làm sau khi lưu
    document.getElementById('weekly-hours').value = '';
}

// Định dạng input tiền tệ
document.querySelectorAll('#calculator-form input[type="text"]').forEach(input => {
    input.addEventListener('input', function(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        if (value) {
            value = parseInt(value).toLocaleString('vi-VN');
            e.target.value = value;
        }
    });
});

// Sự kiện submit form và khởi tạo MutationObserver
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calculator-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submitted');
            await calculateGoal();
        });
    } else {
        console.error('Calculator form not found');
    }

    // Kiểm tra và gắn sự kiện ban đầu
    const resultSection = document.getElementById('result-section');
    if (resultSection) {
        console.log('Result section found on DOM load');
        attachHistoryButtonEvent();
        observeResultSection();
    } else {
        console.error('Result section not found on DOM load');
    }
});

// Tải dữ liệu khi người dùng đăng nhập/đăng xuất
firebase.auth().onAuthStateChanged(user => {
    const mainSection = document.getElementById('main-section');
    const authSection = document.getElementById('auth-section');
    if (user) {
        console.log('User logged in:', user.uid);
        if (mainSection) mainSection.style.display = 'block';
        if (authSection) authSection.style.display = 'none';
        loadUserData();
        setTimeout(() => {
            attachHistoryButtonEvent();
            observeResultSection();
            console.log('Checked history button event and started MutationObserver after login');
        }, 100);
    } else {
        console.log('No user logged in');
        if (mainSection) mainSection.style.display = 'none';
        if (authSection) authSection.style.display = 'block';
        const resultSection = document.getElementById('result-section');
        if (resultSection) {
            resultSection.innerHTML = '<div class="progress"></div><button id="history-btn">📜 Nhật ký</button><div id="history-section" style="display: none;"></div>';
            setTimeout(() => {
                attachHistoryButtonEvent();
                observeResultSection();
                console.log('Checked history button event and started MutationObserver after logout');
            }, 100);
        }
    }
});

// Thêm class CircleProgress
class CircleProgress {
    constructor(selector, options) {
        this.element = document.querySelector(selector);
        this.max = options.max || 100;
        this.value = Math.min(options.value || 0, this.max);
        this.textFormat = options.textFormat || 'value';
        this.textStyle = options.textStyle || {};
        this.init();
    }

    init() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', '0 0 100 100');

        const circleBg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleBg.classList.add('circle-progress-circle');
        circleBg.setAttribute('cx', '50');
        circleBg.setAttribute('cy', '50');
        circleBg.setAttribute('r', '45');
        circleBg.setAttribute('fill', 'none');
        svg.appendChild(circleBg);

        const circleValue = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circleValue.classList.add('circle-progress-value');
        circleValue.setAttribute('cx', '50');
        circleValue.setAttribute('cy', '50');
        circleValue.setAttribute('r', '45');
        circleValue.setAttribute('fill', 'none');
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (this.value / this.max) * circumference;
        circleValue.style.strokeDasharray = `${circumference} ${circumference}`;
        circleValue.style.strokeDashoffset = offset;
        svg.appendChild(circleValue);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '50');
        text.setAttribute('y', '50');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dy', '0.3em');
        text.setAttribute('fill', this.textStyle.color || '#000');
        text.setAttribute('font-family', this.textStyle.font || 'sans-serif');
        text.setAttribute('font-size', this.textStyle.fontSize || '20px');
        text.setAttribute('font-weight', this.textStyle.fontWeight || 'normal');
        text.textContent = this.textFormat === 'percent' ? `${this.value.toFixed(2)}%` : this.value;
        svg.appendChild(text);

        this.element.appendChild(svg);
        this.update(this.value);
    }

    update(value) {
        this.value = Math.min(value, this.max);
        const circumference = 2 * Math.PI * 45;
        const offset = circumference - (this.value / this.max) * circumference;
        this.element.querySelector('.circle-progress-value').style.strokeDashoffset = offset;
        this.element.querySelector('text').textContent = this.textFormat === 'percent' ? `${this.value.toFixed(2)}%` : this.value;
    }
}
