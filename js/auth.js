let isLoginMode = true;

document.addEventListener('DOMContentLoaded', () => {
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      localStorage.setItem('currentUser', user.uid);
      document.getElementById('auth-section').style.display = 'none';
      document.getElementById('main-section').style.display = 'block';
      showSection('calculator');
    } else {
      localStorage.removeItem('currentUser');
      document.getElementById('auth-section').style.display = 'block';
      document.getElementById('main-section').style.display = 'none';
      setAuthMode(true); // reset về đăng nhập
    }
  });
});

function setAuthMode(login) {
  isLoginMode = login;
  document.getElementById('auth-title').textContent = login ? 'Đăng nhập' : 'Đăng ký';
  document.getElementById('auth-btn').textContent = login ? 'Đăng nhập' : 'Đăng ký';
  const toggleAuth = document.getElementById('toggle-auth');
  toggleAuth.innerHTML = login
    ? 'Chưa có tài khoản? <a href="#" id="toggle-link">Đăng ký</a>'
    : 'Đã có tài khoản? <a href="#" id="toggle-link">Đăng nhập</a>';
  setTimeout(() => {
    const link = document.getElementById('toggle-link');
    if (link) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        setAuthMode(!isLoginMode);
      });
    }
  }, 0);
}

const authForm = document.getElementById('auth-form');
if (authForm) {
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      alert('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    if (isLoginMode) {
      firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          console.log('Đăng nhập thành công:', userCredential.user.email);
        })
        .catch((error) => {
          console.error('Lỗi đăng nhập:', error.message);
          localStorage.removeItem('currentUser');
          alert('Sai email hoặc mật khẩu!');
        });
    } else {
      firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
          console.log('Đăng ký thành công:', userCredential.user.email);
          alert('Đăng ký thành công. Hãy đăng nhập!');
          localStorage.removeItem('currentUser');
          setAuthMode(true); // chuyển về đăng nhập
        })
        .catch((error) => {
          console.error('Lỗi đăng ký:', error.message);
          localStorage.removeItem('currentUser');
          if (error.code === 'auth/email-already-in-use') {
            alert('Email đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.');
          } else {
            alert('Đăng ký thất bại: ' + error.message);
          }
        });
    }
  });
} else {
  console.error('Không tìm thấy form đăng nhập');
}

function logout() {
  firebase.auth().signOut().then(() => {
    localStorage.removeItem('currentUser');
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('main-section').style.display = 'none';
    document.getElementById('auth-form').reset();
    setAuthMode(true);
  }).catch((error) => {
    console.error('Lỗi đăng xuất:', error.message);
  });
}

function showSection(section) {
  document.getElementById('calculator-section').style.display = section === 'calculator' ? 'block' : 'none';
  document.getElementById('schedule-section').style.display = section === 'schedule' ? 'block' : 'none';
  if (section === 'schedule' && typeof loadSchedule === 'function') {
    loadSchedule();
  }
}
