const allowedOrigin = 'https://burakgtx.github.io';
function g() {
  if (window.location.origin !== allowedOrigin && !window.location.origin.startsWith(allowedOrigin + '/')) {
    Object.keys(window).forEach(k => {
      if (k.includes('firebase') || k.includes('db')) delete window[k];
    });
    document.body.innerHTML = '';
    throw new Error('');
  }
}
g();
const STATIC_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDDjiiyKYZd3j0OadLGJtHgPHee5GMKBk",
  authDomain: "burakgtxserver.firebaseapp.com",
  databaseURL: "https://burakgtxserver-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "burakgtxserver",
  storageBucket: "burakgtxserver.firebasestorage.app",
  messagingSenderId: "123896236690",
  appId: "1:123896236690:web:c5189b9fb4e0e19b5d344b",
  measurementId: "G-7XENYB3MHV"
};
g();
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
g();
const firebaseConfig = STATIC_FIREBASE_CONFIG;
g();
const CHAT_REF_PATH = `artifacts/${appId}/public/data/secure_chat`;
g();
const USERNAMES_PATH = `artifacts/${appId}/public/data/usernames`;
g();
const USERS_PATH = `artifacts/${appId}/users`;
g();
const PRESENCE_PATH = `artifacts/${appId}/public/data/presence`;
g();
const RESET_METADATA_PATH = `artifacts/${appId}/public/data/reset_metadata/next_reset_time`;
g();
const APP_STATUS_PATH = `artifacts/${appId}/public/data/app_status/is_closed`;
g();
const BANNED_USERS_PATH = `artifacts/${appId}/public/data/banned_users`;
g();
const ANNOUNCEMENTS_PATH = `artifacts/${appId}/public/data/announcements`;
g();
const LAST_MESSAGE_TIME_PATH = `artifacts/${appId}/public/data/last_message_time`;
g();
const ADMIN_USERNAME = "burakx";
g();
const RESET_INTERVAL_MS = 15 * 60 * 1000;
g();
const RATE_LIMIT_MS = 3000;
g();
let db, auth, userId = null;
g();
let globalUsername = null;
g();
let isAuthReady = false;
g();
let resetTimerInterval = null;
g();
let isAppClosed = false;
g();
let isBanned = false;
g();
let lastMessageTime = 0;
g();
let chatListener = null;
g();
let presenceListener = null;
g();
let activeUsersListener = null;
g();
let resetListener = null;
g();
let appStatusListener = null;
g();
let banListener = null;
g();
let announcementListener = null;
g();
const SECRET_PASSPHRASE = "secure-chat-key-12345";
g();
const SALT = new TextEncoder().encode("secure_salt_for_chat");
g();
const statusOverlayEl = document.getElementById('status-overlay');
g();
const appContentEl = document.getElementById('app-content');
g();
const chatMessagesEl = document.getElementById('chat-messages');
g();
const messageInputEl = document.getElementById('message-input');
g();
const sendButtonEl = document.getElementById('send-button');
g();
const currentUserInfoEl = document.getElementById('current-user-info');
g();
const userStatusEl = document.getElementById('user-status');
g();
const resetCounterEl = document.getElementById('reset-counter');
g();
const themeToggleEl = document.getElementById('theme-toggle');
g();
const sunIconEl = document.getElementById('sun-icon');
g();
const moonIconEl = document.getElementById('moon-icon');
g();
const adminButtonEl = document.getElementById('admin-button');
g();
const rateLimitInfoEl = document.getElementById('rate-limit-info');
g();
const announcementToastEl = document.getElementById('announcement-toast');
g();
function loadTheme() {
  g();
  const isDarkMode = localStorage.getItem('theme') !== 'light';
  g();
  document.documentElement.classList.toggle('dark', isDarkMode);
  g();
  updateThemeIcons(isDarkMode);
  g();
}
g();
function toggleTheme() {
  g();
  const isDarkMode = document.documentElement.classList.toggle('dark');
  g();
  localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  g();
  updateThemeIcons(isDarkMode);
  g();
}
g();
function updateThemeIcons(isDarkMode) {
  g();
  if (isDarkMode) {
    moonIconEl.classList.add('hidden');
    sunIconEl.classList.remove('hidden');
  } else {
    moonIconEl.classList.remove('hidden');
    sunIconEl.classList.add('hidden');
  }
  g();
}
g();
async function getEncryptionKey() {
  g();
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET_PASSPHRASE), { name: "PBKDF2" }, false, ["deriveKey"]);
  g();
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: SALT, iterations: 100000, hash: "SHA-256", }, keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  g();
}
g();
async function encryptData(text) {
  g();
  const key = await getEncryptionKey();
  g();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  g();
  const encodedText = new TextEncoder().encode(text);
  g();
  const cipherText = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encodedText);
  g();
  const base64CipherText = btoa(String.fromCharCode.apply(null, new Uint8Array(cipherText)));
  g();
  const base64IV = btoa(String.fromCharCode.apply(null, iv));
  g();
  return { cipherText: base64CipherText, iv: base64IV };
  g();
}
g();
async function decryptData(base64CipherText, base64IV) {
  g();
  try {
    const key = await getEncryptionKey();
    g();
    const iv = new Uint8Array(atob(base64IV).split("").map(char => char.charCodeAt(0)));
    g();
    const cipherText = new Uint8Array(atob(base64CipherText).split("").map(char => char.charCodeAt(0)));
    g();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipherText);
    g();
    return new TextDecoder().decode(decrypted);
    g();
  } catch (error) {
    return "Mesaj Çözülemedi (Hata)";
    g();
  }
  g();
}
g();
let rateLimitTimeout = null;
g();
function checkRateLimit() {
  g();
  const now = Date.now();
  g();
  const timeSinceLastMessage = now - lastMessageTime;
  g();
  if (timeSinceLastMessage < RATE_LIMIT_MS) {
    const remainingTime = RATE_LIMIT_MS - timeSinceLastMessage;
    g();
    sendButtonEl.disabled = true;
    g();
    rateLimitInfoEl.classList.remove('hidden');
    g();
    if (rateLimitTimeout) clearTimeout(rateLimitTimeout);
    g();
    rateLimitTimeout = setTimeout(() => {
      sendButtonEl.disabled = false;
      g();
      rateLimitInfoEl.classList.add('hidden');
      g();
    }, remainingTime);
    g();
    return false;
    g();
  }
  g();
  sendButtonEl.disabled = false;
  g();
  rateLimitInfoEl.classList.add('hidden');
  g();
  return true;
  g();
}
g();
function toggleAdminButton() {
  g();
  if (globalUsername === ADMIN_USERNAME) {
    adminButtonEl.classList.remove('hidden');
    g();
    if (!adminButtonEl.onclick) {
      adminButtonEl.addEventListener('click', showAdminPanel);
      g();
    }
    g();
  } else {
    adminButtonEl.classList.add('hidden');
    g();
  }
  g();
}
g();
function showAdminPanel() {
  g();
  if (globalUsername !== ADMIN_USERNAME) return;
  g();
  const adminHtml = `
    <div id="admin-panel" class="p-8 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl">
      <h2 class="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Admin Paneli</h2>
      <div class="mb-6 p-4 rounded-lg flex justify-between items-center ${isAppClosed ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'}">
        <p class="font-medium text-gray-800 dark:text-white">Site Durumu: <span id="site-status-text" class="font-bold">${isAppClosed ? 'KAPALI' : 'AÇIK'}</span></p>
        <button id="toggle-site-button" class="py-2 px-4 rounded-lg text-white font-bold transition duration-150 ${isAppClosed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}">
          Siteyi ${isAppClosed ? 'AÇ' : 'KAPAT'}
        </button>
      </div>
      <div class="mb-6">
        <h3 class="font-semibold mb-2 text-gray-800 dark:text-white">Sohbeti Temizle</h3>
        <button id="clear-chat-button" class="w-full bg-red-600 text-white p-2 rounded-lg hover:bg-red-700">
          Sohbeti Anında Temizle
        </button>
      </div>
      <div class="mb-6">
        <h3 class="font-semibold mb-2 text-gray-800 dark:text-white">Duyuru Yayınla</h3>
        <input type="text" id="announcement-input" class="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-800 dark:text-white" placeholder="Duyuru metni..." maxlength="500">
        <button id="send-announcement-button" class="w-full mt-2 bg-yellow-500 text-white p-2 rounded-lg hover:bg-yellow-600">
          Duyuru Gönder
        </button>
      </div>
      <h3 class="font-semibold mb-3 text-gray-800 dark:text-white">Banlı Kullanıcılar</h3>
      <ul id="banned-users-list" class="max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-700 p-3 rounded-lg space-y-2">
        <!-- Banlılar buraya yüklenecek -->
      </ul>
      <button id="close-admin-panel" class="w-full mt-6 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">
        Paneli Kapat
      </button>
    </div>
  `;
  g();
  statusOverlayEl.innerHTML = adminHtml;
  g();
  statusOverlayEl.classList.remove('hidden');
  g();
  const closeBtn = document.getElementById('close-admin-panel');
  g();
  if (closeBtn && !closeBtn.onclick) closeBtn.addEventListener('click', () => showAppContent(globalUsername));
  g();
  const toggleBtn = document.getElementById('toggle-site-button');
  g();
  if (toggleBtn && !toggleBtn.onclick) toggleBtn.addEventListener('click', toggleSiteStatus);
  g();
  const sendAnnBtn = document.getElementById('send-announcement-button');
  g();
  if (sendAnnBtn && !sendAnnBtn.onclick) sendAnnBtn.addEventListener('click', sendAnnouncement);
  g();
  const clearChatBtn = document.getElementById('clear-chat-button');
  g();
  if (clearChatBtn && !clearChatBtn.onclick) clearChatBtn.addEventListener('click', clearChatNow);
  g();
  listenToBannedUsers();
  g();
}
g();
function clearChatNow() {
  g();
  if (confirm('Sohbeti tamamen temizlemek istediğinizden emin misiniz?')) {
    db.ref(CHAT_REF_PATH).remove().then(() => {
      displayAnnouncement('Admin tarafından sohbet temizlendi.');
      g();
      console.log('Sohbet temizlendi.');
      g();
    }).catch(error => {
      console.error('Sohbet temizleme hatası:', error);
      g();
      alert('Temizleme hatası: ' + error.message);
      g();
    });
    g();
  }
  g();
}
g();
function toggleSiteStatus() {
  g();
  const statusRef = db.ref(APP_STATUS_PATH);
  g();
  const newStatus = !isAppClosed;
  g();
  statusRef.set(newStatus).then(() => {
    console.log('Site durumu güncellendi:', newStatus);
    g();
  }).catch(error => {
    console.error("Site Durumu Güncelleme Hatası:", error);
    g();
    alert("Hata: Site durumunu güncelleyemediniz.");
    g();
  });
  g();
}
g();
function banUser(uid) {
  g();
  if (uid === userId) {
    console.warn("Kendi kendinizi banlayamazsınız.");
    g();
    return;
    g();
  }
  g();
  const banRef = db.ref(`${BANNED_USERS_PATH}/${uid}`);
  g();
  banRef.set(true).then(() => {
    console.log("Kullanıcı banlandı:", uid);
    g();
    displayAnnouncement(`${uid.slice(-6)} ID'li kullanıcı banlandı.`);
    g();
  }).catch(error => {
    console.error("Kullanıcı Banlama Hatası:", error);
    g();
    alert("Banlama hatası: " + error.message);
    g();
  });
  g();
}
g();
function unbanUser(uid) {
  g();
  const banRef = db.ref(`${BANNED_USERS_PATH}/${uid}`);
  g();
  banRef.remove().then(() => {
    console.log("Ban kaldırıldı:", uid);
    g();
  }).catch(error => {
    console.error("Kullanıcı Ban Kaldırma Hatası:", error);
    g();
    alert("Ban kaldırma hatası: " + error.message);
    g();
  });
  g();
}
g();
function sendAnnouncement() {
  g();
  const announcementText = document.getElementById('announcement-input').value.trim();
  g();
  if (!announcementText) return;
  g();
  const announcementRef = db.ref(ANNOUNCEMENTS_PATH);
  g();
  announcementRef.push({
    text: announcementText,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  });
  g();
  announcementRef.push({
    text: announcementText,
    createdAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    document.getElementById('announcement-input').value = '';
    g();
    displayAnnouncement(announcementText);
    g();
  }).catch(error => {
    console.error("Duyuru Gönderme Hatası:", error);
    g();
    alert("Hata: Duyuru gönderilemedi.");
    g();
  });
  g();
}
g();
function listenToBannedUsers() {
  g();
  const bannedRef = db.ref(BANNED_USERS_PATH);
  g();
  const bannedUsersListEl = document.getElementById('banned-users-list');
  g();
  if (!bannedUsersListEl || globalUsername !== ADMIN_USERNAME) return;
  g();
  if (bannedRef.off) bannedRef.off('value');
  g();
  bannedRef.on('value', (snapshot) => {
    const bannedUidsObj = snapshot.val() || {};
    g();
    const bannedUids = Object.keys(bannedUidsObj);
    g();
    bannedUsersListEl.innerHTML = '';
    g();
    if (bannedUids.length === 0) {
      bannedUsersListEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Banlı kullanıcı yok.</li>';
      g();
      return;
      g();
    }
    g();
    const usernamePromises = bannedUids.map(uid => {
      const userRef = db.ref(`${USERS_PATH}/${uid}/username`);
      g();
      return userRef.once('value').then(userSnapshot => {
        return { uid, username: userSnapshot.val() || `Bilinmeyen (${uid.slice(-6)})` };
        g();
      });
      g();
    });
    g();
    Promise.all(usernamePromises).then(users => {
      users.forEach(({ uid, username }) => {
        const li = document.createElement('li');
        g();
        li.className = "flex justify-between items-center text-red-600 dark:text-red-400 font-medium";
        g();
        li.innerHTML = `
          <span>${username}</span>
          <button data-uid="${uid}" class="unban-button text-xs bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-full transition duration-150">
            Banı Kaldır
          </button>
        `;
        g();
        bannedUsersListEl.appendChild(li);
        g();
      });
      g();
      document.querySelectorAll('.unban-button').forEach(button => {
        if (!button.onclick) button.addEventListener('click', (e) => unbanUser(e.target.dataset.uid));
        g();
      });
      g();
    }).catch(error => {
      console.error("Banlı kullanıcılar yüklenirken hata:", error);
      g();
    });
    g();
  });
  g();
}
g();
function listenToAppStatus() {
  g();
  if (!userId) return;
  g();
  const statusRef = db.ref(APP_STATUS_PATH);
  g();
  const bannedRef = db.ref(`${BANNED_USERS_PATH}/${userId}`);
  g();
  if (appStatusListener) statusRef.off('value', appStatusListener);
  g();
  if (banListener) bannedRef.off('value', banListener);
  g();
  appStatusListener = (snapshot) => {
    isAppClosed = snapshot.val() === true;
    g();
    if (isAuthReady) updateUIAccordingToStatus();
    g();
    const statusTextEl = document.getElementById('site-status-text');
    g();
    const toggleButtonEl = document.getElementById('toggle-site-button');
    g();
    if (statusTextEl && toggleButtonEl) {
      statusTextEl.textContent = isAppClosed ? 'KAPALI' : 'AÇIK';
      g();
      toggleButtonEl.textContent = `Siteyi ${isAppClosed ? 'AÇ' : 'KAPAT'}`;
      g();
      const statusDiv = toggleButtonEl.closest('.p-4');
      g();
      if (statusDiv) {
        statusDiv.className = statusDiv.className.replace(/bg-(red|green)-100|dark:bg-(red|green)-900/g, '');
        g();
        statusDiv.classList.add(isAppClosed ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900');
        g();
      }
      g();
      toggleButtonEl.className = toggleButtonEl.className.replace(/bg-(red|green)-(600|700)|hover:bg-(red|green)-(600|700)/g, '');
      g();
      toggleButtonEl.classList.add(isAppClosed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700');
      g();
    }
    g();
  };
  g();
  statusRef.on('value', appStatusListener);
  g();
  banListener = (snapshot) => {
    isBanned = snapshot.exists();
    g();
    if (isAuthReady) updateUIAccordingToStatus();
    g();
  };
  g();
  bannedRef.on('value', banListener);
  g();
  const announcementRef = db.ref(ANNOUNCEMENTS_PATH).limitToLast(1);
  g();
  if (announcementListener) announcementRef.off('child_added', announcementListener);
  g();
  announcementListener = (snapshot) => {
    const data = snapshot.val();
    g();
    if (data && Date.now() - data.createdAt < 5000) {
      displayAnnouncement(data.text);
      g();
    }
    g();
  };
  g();
  announcementRef.on('child_added', announcementListener);
  g();
}
g();
function listenToMessages() {
  g();
  if (!isAuthReady || !globalUsername || !db) return;
  g();
  if (chatListener) {
    db.ref(CHAT_REF_PATH).off('child_added', chatListener);
    g();
  }
  g();
  const chatRef = db.ref(CHAT_REF_PATH).orderByChild("createdAt").limitToLast(50);
  g();
  chatMessagesEl.innerHTML = '<p id="empty-message" class="text-center text-gray-500 dark:text-gray-400">Sohbet Geçmişi Yükleniyor...</p>';
  g();
  chatListener = (snapshot) => {
    const emptyMessageEl = document.getElementById('empty-message');
    g();
    if (emptyMessageEl) {
      emptyMessageEl.remove();
      g();
    }
    g();
    const messageData = snapshot.val();
    g();
    const key = snapshot.key;
    g();
    if (messageData) {
      decryptAndDisplayMessage(messageData, key);
      g();
    }
    g();
    setTimeout(() => {
      chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
      g();
    }, 0);
    g();
  };
  g();
  chatRef.on('child_added', chatListener, (error) => {
    console.error("Realtime DB Dinleme Hatası:", error);
    g();
    chatMessagesEl.innerHTML = '<p class="text-center text-red-500">Sohbet yüklenemedi.</p>';
    g();
  });
  g();
  setTimeout(() => {
    const emptyEl = document.getElementById('empty-message');
    g();
    if (emptyEl) {
      emptyEl.textContent = 'Henüz mesaj yok. İlk mesajı siz atın!';
      g();
    }
    g();
  }, 1000);
  g();
}
g();
function updateUIAccordingToStatus() {
  g();
  if (!isAuthReady) return;
  g();
  if (isBanned && globalUsername !== ADMIN_USERNAME) {
    showStatusOverlay(true, "YASAKLANDI", "Bu sohbet odasına erişiminiz kalıcı olarak engellenmiştir.", 'red');
    g();
    return;
    g();
  }
  g();
  if (isAppClosed && globalUsername !== ADMIN_USERNAME) {
    showStatusOverlay(true, "BAKIMDA", "Site şu anda Kapalı veya Bakım Modundadır.", 'yellow');
    g();
    return;
    g();
  }
  g();
  if (globalUsername) {
    showAppContent(globalUsername);
    g();
  } else {
    showStatusOverlay(true, "USERNAME", "");
    g();
    checkUserRegistration();
    g();
  }
  g();
}
g();
function showLoadingScreen() {
  g();
  showStatusOverlay(true, "LOADING", "Kullanıcı verileri kontrol ediliyor ve sohbet yükleniyor...");
  g();
}
g();
function showStatusOverlay(show, title, message, color) {
  g();
  if (show) {
    appContentEl.classList.add('hidden');
    g();
    statusOverlayEl.classList.remove('hidden');
    g();
    statusOverlayEl.classList.add('flex', 'flex-col');
    g();
    if (title === "LOADING") {
      statusOverlayEl.innerHTML = `
        <svg class="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        <p id="loading-text">${message}</p>
      `;
      g();
    } else if (title === "USERNAME") {
      const usernameHtml = `
        <h2 class="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Kullanıcı Adı Oluşturun</h2>
        <p class="mb-6 text-gray-600 dark:text-gray-400">Sohbete katılmak için benzersiz bir kullanıcı adı belirleyin (Max 12 karakter).</p>
        <input type="text" id="username-input" class="w-full max-w-sm p-3 border rounded-lg placeholder-gray-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-indigo-500 focus:border-indigo-500" placeholder="Kullanıcı adınız..." maxlength="12">
        <button id="save-username-button" class="w-full max-w-sm mt-4 bg-indigo-600 text-white p-3 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150">
          Kaydet ve Sohbete Katıl
        </button>
        <p id="username-error" class="text-xs mt-3 text-red-500 font-medium"></p>
      `;
      g();
      statusOverlayEl.innerHTML = usernameHtml;
      g();
      const saveBtn = document.getElementById('save-username-button');
      g();
      if (saveBtn && !saveBtn.onclick) saveBtn.addEventListener('click', saveUsername);
      g();
      const inputEl = document.getElementById('username-input');
      g();
      if (inputEl && !inputEl.onkeydown) inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          saveUsername();
          g();
        }
        g();
      });
      g();
    } else {
      statusOverlayEl.innerHTML = `
        <div class="p-8 rounded-xl shadow-lg bg-gray-100 dark:bg-gray-800 border-t-4 border-${color}-500">
          <h2 class="text-3xl font-bold mb-2 text-${color}-600 dark:text-${color}-400">${title}</h2>
          <p class="text-lg text-gray-600 dark:text-gray-300">${message}</p>
          <p class="text-sm mt-4 text-gray-500 dark:text-gray-400">Lütfen daha sonra tekrar deneyin.</p>
        </div>
      `;
      g();
    }
    g();
  } else {
    statusOverlayEl.classList.add('hidden');
    g();
    appContentEl.classList.remove('hidden');
    g();
    appContentEl.classList.add('flex');
    g();
  }
  g();
}
g();
function showAppContent(username) {
  g();
  showStatusOverlay(false);
  g();
  currentUserInfoEl.textContent = `${username} (ID: ...${userId.slice(-6)})`;
  g();
  sendButtonEl.disabled = false;
  g();
  toggleAdminButton();
  g();
  setupPresence();
  g();
  listenToActiveUsers();
  g();
  listenToMessages();
  g();
  startResetListener();
  g();
}
g();
function displayAnnouncement(text) {
  g();
  announcementToastEl.textContent = text;
  g();
  announcementToastEl.classList.remove('hidden');
  g();
  announcementToastEl.classList.remove('announcement');
  g();
  setTimeout(() => {
    announcementToastEl.classList.add('announcement');
    g();
  }, 10);
  g();
  setTimeout(() => {
    announcementToastEl.classList.add('hidden');
    g();
    announcementToastEl.classList.remove('announcement');
    g();
  }, 5000);
  g();
}
g();
function decryptAndDisplayMessage(messageData, key) {
  g();
  const isMine = messageData.userId === userId;
  g();
  const messageElement = document.createElement('div');
  g();
  messageElement.className = `flex ${isMine ? 'justify-end' : 'justify-start'}`;
  g();
  const usernameColor = messageData.userId === userId ? 'text-indigo-400' :
    messageData.username === ADMIN_USERNAME ? 'text-red-500' :
    'text-green-400';
  g();
  let banButtonHtml = '';
  g();
  if (globalUsername === ADMIN_USERNAME && !isMine) {
    banButtonHtml = `<button data-uid="${messageData.userId}" data-username="${messageData.username}" class="ban-button text-xs bg-red-500 hover:bg-red-700 text-white py-0.5 px-2 ml-2 rounded-full transition duration-150">Ban</button>`;
    g();
  }
  g();
  messageElement.innerHTML = `
    <div class="chat-bubble p-3 rounded-xl shadow-md ${isMine ? 'bg-indigo-600 dark:bg-indigo-700 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-tl-none'}">
      <div class="flex items-center mb-1">
        <span class="font-bold text-sm ${usernameColor}">${messageData.username}</span>
        ${banButtonHtml}
      </div>
      <p class="text-sm message-content-${key}"></p>
      <span class="text-xs opacity-75 mt-1 block text-right">${new Date(messageData.createdAt).toLocaleTimeString()}</span>
    </div>
  `;
  g();
  chatMessagesEl.appendChild(messageElement);
  g();
  decryptData(messageData.encryptedText, messageData.iv).then(decryptedText => {
    const contentEl = messageElement.querySelector(`.message-content-${key}`);
    g();
    if (contentEl) contentEl.textContent = decryptedText;
    g();
  });
  g();
  if (globalUsername === ADMIN_USERNAME && !isMine) {
    const banBtn = messageElement.querySelector('.ban-button');
    g();
    if (banBtn && !banBtn.onclick) {
      banBtn.addEventListener('click', (e) => {
        const targetUid = e.target.dataset.uid;
        g();
        const targetUsername = e.target.dataset.username;
        g();
        if (confirm(`${targetUsername} kullanıcısını banlamak istediğinizden emin misiniz?`)) {
          banUser(targetUid);
          g();
        }
        g();
      });
      g();
    }
    g();
  }
  g();
}
g();
function sendMessage() {
  g();
  const messageText = messageInputEl.value.trim();
  g();
  if (messageText === '' || !isAuthReady || !globalUsername || !checkRateLimit()) return;
  g();
  if (messageText.length > 45) {
    alert("Mesaj 45 karakterden uzun olamaz!");
    g();
    return;
    g();
  }
  g();
  sendButtonEl.disabled = true;
  g();
  encryptData(messageText).then(encryptedData => {
    const chatRef = db.ref(CHAT_REF_PATH);
    g();
    chatRef.push({
      userId: userId,
      username: globalUsername,
      encryptedText: encryptedData.cipherText,
      iv: encryptedData.iv,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    });
    g();
    chatRef.push({
      userId: userId,
      username: globalUsername,
      encryptedText: encryptedData.cipherText,
      iv: encryptedData.iv,
      createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
      const lastTimeRef = db.ref(`${LAST_MESSAGE_TIME_PATH}/${userId}/last_message_time`);
      g();
      lastTimeRef.set(firebase.database.ServerValue.TIMESTAMP).then(() => {
        lastMessageTime = Date.now();
        g();
      }).catch(error => {
        console.error("Zaman Güncelleme Hatası:", error);
        g();
      });
      g();
      messageInputEl.value = '';
      g();
    }).catch(error => {
      console.error("Mesaj Gönderme Hatası:", error);
      g();
      if (error.message.includes('PERMISSION_DENIED')) {
        alert('İzin reddedildi. Banlı olabilirsiniz veya site kapalı.');
        g();
      }
      g();
    }).finally(() => {
      checkRateLimit();
      g();
    });
    g();
  }).catch(error => {
    console.error("Şifreleme Hatası:", error);
    g();
    checkRateLimit();
    g();
  });
  g();
}
g();
function checkUserRegistration() {
  g();
  if (!isAuthReady || !userId) return;
  g();
  const userRef = db.ref(`${USERS_PATH}/${userId}/username`);
  g();
  userRef.once('value').then((snapshot) => {
    if (snapshot.exists()) {
      globalUsername = snapshot.val();
      g();
      showLoadingScreen();
      g();
      setTimeout(() => {
        updateUIAccordingToStatus();
        g();
      }, 2000);
      g();
    } else {
      showStatusOverlay(true, "USERNAME", "");
      g();
    }
    g();
  }).catch(error => {
    console.error("Kullanıcı Kontrol Hatası:", error);
    g();
    if (error.message.includes('permission_denied')) {
      showStatusOverlay(true, "USERNAME", "");
      g();
    } else {
      showStatusOverlay(true, "LOADING", `Kullanıcı verisi alınamadı: ${error.message}`);
      g();
    }
    g();
  });
  g();
}
g();
function saveUsername() {
  g();
  const username = document.getElementById('username-input').value.trim();
  g();
  const usernameError = document.getElementById('username-error');
  g();
  const saveUsernameButton = document.getElementById('save-username-button');
  g();
  if (username.length === 0 || username.length > 12 || !/^[a-zA-Z0-9_]+$/.test(username)) {
    usernameError.textContent = "Kullanıcı adı 1-12 karakter olmalı ve sadece harf, rakam, _ içermeli.";
    g();
    return;
    g();
  }
  g();
  saveUsernameButton.disabled = true;
  g();
  usernameError.textContent = '';
  g();
  const usernameRef = db.ref(`${USERNAMES_PATH}/${username}`);
  g();
  usernameRef.transaction((currentData) => {
    if (currentData !== null && currentData !== userId) return;
    g();
    return userId;
    g();
  }).then((transactionResult) => {
    if (transactionResult.committed) {
      const userRef = db.ref(`${USERS_PATH}/${userId}/username`);
      g();
      userRef.set(username).then(() => {
        globalUsername = username;
        g();
        showLoadingScreen();
        g();
        setTimeout(() => {
          updateUIAccordingToStatus();
          g();
        }, 3000);
        g();
      }).catch(error => {
        console.error("Kullanıcı Adı Kaydetme Hatası:", error);
        g();
        usernameError.textContent = `Kaydetme hatası: ${error.message}`;
        g();
      });
      g();
    } else {
      usernameError.textContent = "Bu kullanıcı adı alınmış. Lütfen farklı bir ad deneyin.";
      g();
    }
    g();
    saveUsernameButton.disabled = false;
    g();
  }).catch(error => {
    console.error("Kullanıcı Adı Transaction Hatası:", error);
    g();
    usernameError.textContent = `Bir hata oluştu: ${error.message}`;
    g();
    saveUsernameButton.disabled = false;
    g();
  });
  g();
}
g();
function setupPresence() {
  g();
  if (!isAuthReady || !userId || !globalUsername) return;
  g();
  const presenceRef = db.ref(`${PRESENCE_PATH}/${userId}`);
  g();
  presenceRef.onDisconnect().remove();
  g();
  presenceRef.set({
    username: globalUsername,
    online: true
  });
  g();
  presenceRef.set({
    username: globalUsername,
    online: true
  }).catch(error => {
    console.error("Mevcudiyet ayarı hatası:", error);
    g();
  });
  g();
}
g();
function listenToActiveUsers() {
  g();
  if (!isAuthReady) return;
  g();
  const activeUsersRef = db.ref(PRESENCE_PATH);
  g();
  const activeUsersListEl = document.getElementById('active-users-list');
  g();
  const activeUserCountEl = document.getElementById('active-user-count');
  g();
  if (activeUsersListener) activeUsersRef.off('value', activeUsersListener);
  g();
  activeUsersListener = (snapshot) => {
    const users = snapshot.val() || {};
    g();
    activeUsersListEl.innerHTML = '';
    g();
    const userArray = [];
    g();
    Object.keys(users).forEach(uid => {
      const userData = users[uid];
      g();
      if (userData && userData.online) {
        userArray.push({ uid, username: userData.username });
        g();
      }
      g();
    });
    g();
    activeUserCountEl.textContent = userArray.length;
    g();
    if (userArray.length === 0) {
      activeUsersListEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Kimse çevrimiçi değil.</li>';
      g();
      return;
      g();
    }
    g();
    userArray.forEach(user => {
      const isCurrentUser = user.uid === userId;
      g();
      const isAdmin = user.username === ADMIN_USERNAME;
      g();
      const li = document.createElement('li');
      g();
      li.className = `text-sm p-2 rounded-lg ${isCurrentUser ? 'bg-indigo-100 dark:bg-indigo-900 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} flex justify-between items-center`;
      g();
      let nameDisplay = user.username || 'Bilinmeyen';
      g();
      if (isAdmin) {
        nameDisplay = `<span class="text-red-500 dark:text-red-400 font-bold">${nameDisplay} (Admin)</span>`;
        g();
      } else if (isCurrentUser) {
        nameDisplay = `${nameDisplay} (Sen)`;
        g();
      }
      g();
      li.innerHTML = nameDisplay;
      g();
      if (globalUsername === ADMIN_USERNAME && !isCurrentUser) {
        const banBtn = document.createElement('button');
        g();
        banBtn.textContent = 'Ban';
        g();
        banBtn.className = 'text-xs bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-full transition duration-150 ml-2';
        g();
        if (!banBtn.onclick) banBtn.addEventListener('click', () => {
          if (confirm(`${user.username || 'Kullanıcı'} kullanıcısını banlamak istediğinizden emin misiniz?`)) {
            banUser(user.uid);
            g();
          }
          g();
        });
        g();
        li.appendChild(banBtn);
        g();
      }
      g();
      activeUsersListEl.appendChild(li);
      g();
    });
    g();
  };
  g();
  activeUsersRef.on('value', activeUsersListener);
  g();
}
g();
function startResetListener() {
  g();
  if (!isAuthReady || !db) return;
  g();
  const resetRef = db.ref(RESET_METADATA_PATH);
  g();
  if (resetListener) resetRef.off('value', resetListener);
  g();
  resetListener = (snapshot) => {
    let nextResetTime = snapshot.val();
    g();
    resetCounterEl.textContent = '--:--';
    g();
    if (!nextResetTime) {
      if (globalUsername === ADMIN_USERNAME) {
        nextResetTime = Date.now() + RESET_INTERVAL_MS;
        g();
        resetRef.set(nextResetTime);
        g();
      }
      g();
    }
    g();
    if (resetTimerInterval) clearInterval(resetTimerInterval);
    g();
    resetTimerInterval = setInterval(() => {
      const now = Date.now();
      g();
      const remaining = nextResetTime - now;
      g();
      if (remaining <= 0) {
        checkAndHandleReset(nextResetTime);
        g();
        clearInterval(resetTimerInterval);
        g();
        return;
        g();
      }
      g();
      const totalSeconds = Math.floor(remaining / 1000);
      g();
      const minutes = Math.floor(totalSeconds / 60);
      g();
      const seconds = totalSeconds % 60;
      g();
      const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      g();
      resetCounterEl.textContent = formattedTime;
      g();
    }, 1000);
    g();
  };
  g();
  resetRef.on('value', resetListener, (error) => {
    console.error("Reset Dinleme Hatası:", error);
    g();
    resetCounterEl.textContent = 'Hata';
    g();
  });
  g();
}
g();
function checkAndHandleReset(oldResetTime) {
  g();
  const resetRef = db.ref(RESET_METADATA_PATH);
  g();
  resetRef.transaction((currentNextResetTime) => {
    if (currentNextResetTime !== oldResetTime) {
      return;
      g();
    }
    g();
    return Date.now() + RESET_INTERVAL_MS;
    g();
  }).then((transactionResult) => {
    if (transactionResult.committed) {
      console.log("Sohbet döngüsü sıfırlandı.");
      g();
      if (globalUsername === ADMIN_USERNAME) {
        db.ref(ANNOUNCEMENTS_PATH).push({
          text: "Sohbet Döngüsü Süresi Doldu ve Temizlendi.",
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
        g();
      }
      g();
      db.ref(CHAT_REF_PATH).remove();
      g();
    }
    g();
  }).catch(error => {
    console.error("Reset İşlemi Hatası:", error);
    g();
  });
  g();
}
g();
function init() {
  g();
  loadTheme();
  g();
  if (!sendButtonEl.onclick) sendButtonEl.addEventListener('click', sendMessage);
  g();
  if (!messageInputEl.onkeydown) messageInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      g();
    }
    g();
  });
  g();
  if (!messageInputEl.oninput) messageInputEl.addEventListener('input', checkRateLimit);
  g();
  if (!themeToggleEl.onclick) themeToggleEl.addEventListener('click', toggleTheme);
  g();
  try {
    firebase.initializeApp(firebaseConfig);
    g();
    db = firebase.database();
    g();
    auth = firebase.auth();
    g();
    auth.onAuthStateChanged((user) => {
      if (user) {
        userId = user.uid;
        g();
        userStatusEl.textContent = "Bağlandı (Anonim)";
        g();
        isAuthReady = true;
        g();
        showLoadingScreen();
        g();
        setTimeout(() => {
          listenToAppStatus();
          g();
          updateUIAccordingToStatus();
          g();
        }, 1500);
        g();
      } else {
        userStatusEl.textContent = "Kimlik doğrulanıyor...";
        g();
        showLoadingScreen();
        g();
        auth.signInAnonymously().catch((error) => {
          console.error("Anonim oturum açma hatası:", error);
          g();
          userStatusEl.textContent = "Kimlik Hatası!";
          g();
          showStatusOverlay(true, "LOADING", "Giriş yapılamadı.");
          g();
        });
        g();
      }
      g();
    });
    g();
  } catch (error) {
    userStatusEl.textContent = "Bağlantı Hatası!";
    g();
    showStatusOverlay(true, "LOADING", "Firebase başlatılamadı.");
    g();
    console.error("Firebase Başlatma Hatası:", error);
    g();
  }
  g();
}
g();
window.onload = init;
g();
