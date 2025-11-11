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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = STATIC_FIREBASE_CONFIG;
const CHAT_REF_PATH = `artifacts/${appId}/public/data/secure_chat`;
const USERNAMES_PATH = `artifacts/${appId}/public/data/usernames`;
const USERS_PATH = `artifacts/${appId}/users`;
const PRESENCE_PATH = `artifacts/${appId}/public/data/presence`;
const RESET_METADATA_PATH = `artifacts/${appId}/public/data/reset_metadata/next_reset_time`;
const APP_STATUS_PATH = `artifacts/${appId}/public/data/app_status/is_closed`;
const BANNED_USERS_PATH = `artifacts/${appId}/public/data/banned_users`;
const ANNOUNCEMENTS_PATH = `artifacts/${appId}/public/data/announcements`;
const LAST_MESSAGE_TIME_PATH = `artifacts/${appId}/public/data/last_message_time`;
const ADMIN_USERNAME = "burakx";
const RESET_INTERVAL_MS = 15 * 60 * 1000;
const RATE_LIMIT_MS = 3000;
let db, auth, userId = null;
let globalUsername = null;
let isAuthReady = false;
let resetTimerInterval = null;
let isAppClosed = false;
let isBanned = false;
let lastMessageTime = 0;
let chatListener = null;
let presenceListener = null;
let activeUsersListener = null;
let resetListener = null;
let appStatusListener = null;
let banListener = null;
let announcementListener = null;
const SECRET_PASSPHRASE = "secure-chat-key-12345";
const SALT = new TextEncoder().encode("secure_salt_for_chat");
const statusOverlayEl = document.getElementById('status-overlay');
const appContentEl = document.getElementById('app-content');
const chatMessagesEl = document.getElementById('chat-messages');
const messageInputEl = document.getElementById('message-input');
const sendButtonEl = document.getElementById('send-button');
const currentUserInfoEl = document.getElementById('current-user-info');
const userStatusEl = document.getElementById('user-status');
const resetCounterEl = document.getElementById('reset-counter');
const themeToggleEl = document.getElementById('theme-toggle');
const sunIconEl = document.getElementById('sun-icon');
const moonIconEl = document.getElementById('moon-icon');
const adminButtonEl = document.getElementById('admin-button');
const rateLimitInfoEl = document.getElementById('rate-limit-info');
const announcementToastEl = document.getElementById('announcement-toast');
function loadTheme() {
    const isDarkMode = localStorage.getItem('theme') !== 'light';
    document.documentElement.classList.toggle('dark', isDarkMode);
    updateThemeIcons(isDarkMode);
}
function toggleTheme() {
    const isDarkMode = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    updateThemeIcons(isDarkMode);
}
function updateThemeIcons(isDarkMode) {
     if (isDarkMode) { moonIconEl.classList.add('hidden'); sunIconEl.classList.remove('hidden'); }
     else { moonIconEl.classList.remove('hidden'); sunIconEl.classList.add('hidden'); }
}
async function getEncryptionKey() {
    const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET_PASSPHRASE), { name: "PBKDF2" }, false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: SALT, iterations: 100000, hash: "SHA-256", }, keyMaterial, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}
async function encryptData(text) {
    const key = await getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    const cipherText = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encodedText);
    const base64CipherText = btoa(String.fromCharCode.apply(null, new Uint8Array(cipherText)));
    const base64IV = btoa(String.fromCharCode.apply(null, iv));
    return { cipherText: base64CipherText, iv: base64IV };
}
async function decryptData(base64CipherText, base64IV) {
    try {
        const key = await getEncryptionKey();
        const iv = new Uint8Array(atob(base64IV).split("").map(char => char.charCodeAt(0)));
        const cipherText = new Uint8Array(atob(base64CipherText).split("").map(char => char.charCodeAt(0)));
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, cipherText);
        return new TextDecoder().decode(decrypted);
    } catch (error) { return "Mesaj Çözülemedi (Hata)"; }
}
let rateLimitTimeout = null;
function checkRateLimit() {
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTime;
    if (timeSinceLastMessage < RATE_LIMIT_MS) {
        const remainingTime = RATE_LIMIT_MS - timeSinceLastMessage;
        sendButtonEl.disabled = true;
        rateLimitInfoEl.classList.remove('hidden');
        if (rateLimitTimeout) clearTimeout(rateLimitTimeout);
        rateLimitTimeout = setTimeout(() => {
            sendButtonEl.disabled = false;
            rateLimitInfoEl.classList.add('hidden');
        }, remainingTime);
        return false;
    }
    sendButtonEl.disabled = false;
    rateLimitInfoEl.classList.add('hidden');
    return true;
}
function toggleAdminButton() {
    if (globalUsername === ADMIN_USERNAME) {
        adminButtonEl.classList.remove('hidden');
        if (!adminButtonEl.onclick) {
            adminButtonEl.addEventListener('click', showAdminPanel);
        }
    } else {
        adminButtonEl.classList.add('hidden');
    }
}
function showAdminPanel() {
    if (globalUsername !== ADMIN_USERNAME) return;
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
    statusOverlayEl.innerHTML = adminHtml;
    statusOverlayEl.classList.remove('hidden');
    const closeBtn = document.getElementById('close-admin-panel');
    if (closeBtn && !closeBtn.onclick) closeBtn.addEventListener('click', () => showAppContent(globalUsername));
    const toggleBtn = document.getElementById('toggle-site-button');
    if (toggleBtn && !toggleBtn.onclick) toggleBtn.addEventListener('click', toggleSiteStatus);
    const sendAnnBtn = document.getElementById('send-announcement-button');
    if (sendAnnBtn && !sendAnnBtn.onclick) sendAnnBtn.addEventListener('click', sendAnnouncement);
    const clearChatBtn = document.getElementById('clear-chat-button');
    if (clearChatBtn && !clearChatBtn.onclick) clearChatBtn.addEventListener('click', clearChatNow);
  
    listenToBannedUsers();
}
function clearChatNow() {
    if (confirm('Sohbeti tamamen temizlemek istediğinizden emin misiniz?')) {
        db.ref(CHAT_REF_PATH).remove().then(() => {
            displayAnnouncement('Admin tarafından sohbet temizlendi.');
            console.log('Sohbet temizlendi.');
        }).catch(error => {
            console.error('Sohbet temizleme hatası:', error);
            alert('Temizleme hatası: ' + error.message);
        });
    }
}
function toggleSiteStatus() {
    const statusRef = db.ref(APP_STATUS_PATH);
    const newStatus = !isAppClosed;
  
    statusRef.set(newStatus).then(() => {
        console.log('Site durumu güncellendi:', newStatus);
    }).catch(error => {
        console.error("Site Durumu Güncelleme Hatası:", error);
        alert("Hata: Site durumunu güncelleyemediniz.");
    });
}
function banUser(uid) {
    if (uid === userId) {
        console.warn("Kendi kendinizi banlayamazsınız.");
        return;
    }
    const banRef = db.ref(`${BANNED_USERS_PATH}/${uid}`);
    banRef.set(true).then(() => {
        console.log("Kullanıcı banlandı:", uid);
        displayAnnouncement(`${uid.slice(-6)} ID'li kullanıcı banlandı.`);
    }).catch(error => {
        console.error("Kullanıcı Banlama Hatası:", error);
        alert("Banlama hatası: " + error.message);
    });
}
function unbanUser(uid) {
    const banRef = db.ref(`${BANNED_USERS_PATH}/${uid}`);
    banRef.remove().then(() => {
        console.log("Ban kaldırıldı:", uid);
    }).catch(error => {
        console.error("Kullanıcı Ban Kaldırma Hatası:", error);
        alert("Ban kaldırma hatası: " + error.message);
    });
}
function sendAnnouncement() {
    const announcementText = document.getElementById('announcement-input').value.trim();
    if (!announcementText) return;
    const announcementRef = db.ref(ANNOUNCEMENTS_PATH);
    announcementRef.push({
        text: announcementText,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        document.getElementById('announcement-input').value = '';
        displayAnnouncement(announcementText);
    }).catch(error => {
        console.error("Duyuru Gönderme Hatası:", error);
        alert("Hata: Duyuru gönderilemedi.");
    });
}
function listenToBannedUsers() {
    const bannedRef = db.ref(BANNED_USERS_PATH);
    const bannedUsersListEl = document.getElementById('banned-users-list');
    if (!bannedUsersListEl || globalUsername !== ADMIN_USERNAME) return;
    if (bannedRef.off) bannedRef.off('value');
    bannedRef.on('value', (snapshot) => {
        const bannedUidsObj = snapshot.val() || {};
        const bannedUids = Object.keys(bannedUidsObj);
        bannedUsersListEl.innerHTML = '';
      
        if (bannedUids.length === 0) {
            bannedUsersListEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Banlı kullanıcı yok.</li>';
            return;
        }
        const usernamePromises = bannedUids.map(uid => {
            const userRef = db.ref(`${USERS_PATH}/${uid}/username`);
            return userRef.once('value').then(userSnapshot => {
                return { uid, username: userSnapshot.val() || `Bilinmeyen (${uid.slice(-6)})` };
            });
        });
        Promise.all(usernamePromises).then(users => {
            users.forEach(({ uid, username }) => {
                const li = document.createElement('li');
                li.className = "flex justify-between items-center text-red-600 dark:text-red-400 font-medium";
                li.innerHTML = `
                    <span>${username}</span>
                    <button data-uid="${uid}" class="unban-button text-xs bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-full transition duration-150">
                        Banı Kaldır
                    </button>
                `;
                bannedUsersListEl.appendChild(li);
            });
            document.querySelectorAll('.unban-button').forEach(button => {
                if (!button.onclick) button.addEventListener('click', (e) => unbanUser(e.target.dataset.uid));
            });
        }).catch(error => {
            console.error("Banlı kullanıcılar yüklenirken hata:", error);
        });
    });
}
function listenToAppStatus() {
    if (!userId) return;
    const statusRef = db.ref(APP_STATUS_PATH);
    const bannedRef = db.ref(`${BANNED_USERS_PATH}/${userId}`);
    if (appStatusListener) statusRef.off('value', appStatusListener);
    if (banListener) bannedRef.off('value', banListener);
    appStatusListener = (snapshot) => {
        isAppClosed = snapshot.val() === true;
        if (isAuthReady) updateUIAccordingToStatus();
        const statusTextEl = document.getElementById('site-status-text');
        const toggleButtonEl = document.getElementById('toggle-site-button');
        if (statusTextEl && toggleButtonEl) {
            statusTextEl.textContent = isAppClosed ? 'KAPALI' : 'AÇIK';
            toggleButtonEl.textContent = `Siteyi ${isAppClosed ? 'AÇ' : 'KAPAT'}`;
            const statusDiv = toggleButtonEl.closest('.p-4');
            if (statusDiv) {
                statusDiv.className = statusDiv.className.replace(/bg-(red|green)-100|dark:bg-(red|green)-900/g, '');
                statusDiv.classList.add(isAppClosed ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900');
            }
            toggleButtonEl.className = toggleButtonEl.className.replace(/bg-(red|green)-(600|700)|hover:bg-(red|green)-(600|700)/g, '');
            toggleButtonEl.classList.add(isAppClosed ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700');
        }
    };
    statusRef.on('value', appStatusListener);
  
    banListener = (snapshot) => {
        isBanned = snapshot.exists();
        if (isAuthReady) updateUIAccordingToStatus();
    };
    bannedRef.on('value', banListener);
  
    const announcementRef = db.ref(ANNOUNCEMENTS_PATH).limitToLast(1);
    if (announcementListener) announcementRef.off('child_added', announcementListener);
    announcementListener = (snapshot) => {
        const data = snapshot.val();
        if (data && Date.now() - data.createdAt < 5000) {
            displayAnnouncement(data.text);
        }
    };
    announcementRef.on('child_added', announcementListener);
}
function listenToMessages() {
     if (!isAuthReady || !globalUsername || !db) return;
    if (chatListener) {
        db.ref(CHAT_REF_PATH).off('child_added', chatListener);
    }
    const chatRef = db.ref(CHAT_REF_PATH).orderByChild("createdAt").limitToLast(50);
    chatMessagesEl.innerHTML = '<p id="empty-message" class="text-center text-gray-500 dark:text-gray-400">Sohbet Geçmişi Yükleniyor...</p>';
  
    chatListener = (snapshot) => {
        const emptyMessageEl = document.getElementById('empty-message');
        if (emptyMessageEl) { emptyMessageEl.remove(); }
        const messageData = snapshot.val();
        const key = snapshot.key;
        if (messageData) {
            decryptAndDisplayMessage(messageData, key);
        }
      
        setTimeout(() => {
            chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        }, 0);
    };
    chatRef.on('child_added', chatListener, (error) => {
        console.error("Realtime DB Dinleme Hatası:", error);
        chatMessagesEl.innerHTML = '<p class="text-center text-red-500">Sohbet yüklenemedi.</p>';
    });
    setTimeout(() => {
        const emptyEl = document.getElementById('empty-message');
        if (emptyEl) {
            emptyEl.textContent = 'Henüz mesaj yok. İlk mesajı siz atın!';
        }
    }, 1000);
}
function updateUIAccordingToStatus() {
    if (!isAuthReady) return;
    if (isBanned && globalUsername !== ADMIN_USERNAME) {
        showStatusOverlay(true, "YASAKLANDI", "Bu sohbet odasına erişiminiz kalıcı olarak engellenmiştir.", 'red');
        return;
    }
    if (isAppClosed && globalUsername !== ADMIN_USERNAME) {
        showStatusOverlay(true, "BAKIMDA", "Site şu anda Kapalı veya Bakım Modundadır.", 'yellow');
        return;
    }
  
    if (globalUsername) {
        showAppContent(globalUsername);
    } else {
        showStatusOverlay(true, "USERNAME", "");
        checkUserRegistration();
    }
}
function showLoadingScreen() {
    showStatusOverlay(true, "LOADING", "Kullanıcı verileri kontrol ediliyor ve sohbet yükleniyor...");
}
function showStatusOverlay(show, title, message, color) {
    if (show) {
        appContentEl.classList.add('hidden');
        statusOverlayEl.classList.remove('hidden');
        statusOverlayEl.classList.add('flex', 'flex-col');
      
        if (title === "LOADING") {
            statusOverlayEl.innerHTML = `
                <svg class="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p id="loading-text">${message}</p>
            `;
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
             statusOverlayEl.innerHTML = usernameHtml;
             const saveBtn = document.getElementById('save-username-button');
             if (saveBtn && !saveBtn.onclick) saveBtn.addEventListener('click', saveUsername);
             const inputEl = document.getElementById('username-input');
             if (inputEl && !inputEl.onkeydown) inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveUsername(); }
             });
        } else {
            statusOverlayEl.innerHTML = `
                <div class="p-8 rounded-xl shadow-lg bg-gray-100 dark:bg-gray-800 border-t-4 border-${color}-500">
                    <h2 class="text-3xl font-bold mb-2 text-${color}-600 dark:text-${color}-400">${title}</h2>
                    <p class="text-lg text-gray-600 dark:text-gray-300">${message}</p>
                    <p class="text-sm mt-4 text-gray-500 dark:text-gray-400">Lütfen daha sonra tekrar deneyin.</p>
                </div>
            `;
        }
    } else {
        statusOverlayEl.classList.add('hidden');
        appContentEl.classList.remove('hidden');
        appContentEl.classList.add('flex');
    }
}
function showAppContent(username) {
    showStatusOverlay(false);
    currentUserInfoEl.textContent = `${username} (ID: ...${userId.slice(-6)})`;
    sendButtonEl.disabled = false;
  
    toggleAdminButton();
    setupPresence();
    listenToActiveUsers();
    listenToMessages();
    startResetListener();
}
function displayAnnouncement(text) {
    announcementToastEl.textContent = text;
    announcementToastEl.classList.remove('hidden');
    announcementToastEl.classList.remove('announcement');
    setTimeout(() => {
         announcementToastEl.classList.add('announcement');
    }, 10);
  
    setTimeout(() => {
        announcementToastEl.classList.add('hidden');
        announcementToastEl.classList.remove('announcement');
    }, 5000);
}
function decryptAndDisplayMessage(messageData, key) {
    const isMine = messageData.userId === userId;
    const messageElement = document.createElement('div');
    messageElement.className = `flex ${isMine ? 'justify-end' : 'justify-start'}`;
    const usernameColor = messageData.userId === userId ? 'text-indigo-400' :
                          messageData.username === ADMIN_USERNAME ? 'text-red-500' :
                          'text-green-400';
  
    let banButtonHtml = '';
    if (globalUsername === ADMIN_USERNAME && !isMine) {
        banButtonHtml = `<button data-uid="${messageData.userId}" data-username="${messageData.username}" class="ban-button text-xs bg-red-500 hover:bg-red-700 text-white py-0.5 px-2 ml-2 rounded-full transition duration-150">Ban</button>`;
    }
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
    chatMessagesEl.appendChild(messageElement);
    decryptData(messageData.encryptedText, messageData.iv).then(decryptedText => {
        const contentEl = messageElement.querySelector(`.message-content-${key}`);
        if (contentEl) contentEl.textContent = decryptedText;
    });
  
    if (globalUsername === ADMIN_USERNAME && !isMine) {
        const banBtn = messageElement.querySelector('.ban-button');
        if (banBtn && !banBtn.onclick) {
            banBtn.addEventListener('click', (e) => {
                const targetUid = e.target.dataset.uid;
                const targetUsername = e.target.dataset.username;
                if (confirm(`${targetUsername} kullanıcısını banlamak istediğinizden emin misiniz?`)) {
                    banUser(targetUid);
                }
            });
        }
    }
}
function sendMessage() {
    const messageText = messageInputEl.value.trim();
    if (messageText === '' || !isAuthReady || !globalUsername || !checkRateLimit()) return;
    if (messageText.length > 45) {
        alert("Mesaj 45 karakterden uzun olamaz!");
        return;
    }
    sendButtonEl.disabled = true;
    encryptData(messageText).then(encryptedData => {
        const chatRef = db.ref(CHAT_REF_PATH);
        chatRef.push({
            userId: userId,
            username: globalUsername,
            encryptedText: encryptedData.cipherText,
            iv: encryptedData.iv,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            const lastTimeRef = db.ref(`${LAST_MESSAGE_TIME_PATH}/${userId}/last_message_time`);
            lastTimeRef.set(firebase.database.ServerValue.TIMESTAMP).then(() => {
                lastMessageTime = Date.now();
            }).catch(error => {
                console.error("Zaman Güncelleme Hatası:", error);
            });
            messageInputEl.value = '';
        }).catch(error => {
            console.error("Mesaj Gönderme Hatası:", error);
            if (error.message.includes('PERMISSION_DENIED')) {
                alert('İzin reddedildi. Banlı olabilirsiniz veya site kapalı.');
            }
        }).finally(() => {
            checkRateLimit();
        });
    }).catch(error => {
        console.error("Şifreleme Hatası:", error);
        checkRateLimit();
    });
}
function checkUserRegistration() {
    if (!isAuthReady || !userId) return;
    const userRef = db.ref(`${USERS_PATH}/${userId}/username`);
    userRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            globalUsername = snapshot.val();
            showLoadingScreen();
            setTimeout(() => {
                updateUIAccordingToStatus();
            }, 2000);
        } else {
            showStatusOverlay(true, "USERNAME", "");
        }
    }).catch(error => {
        console.error("Kullanıcı Kontrol Hatası:", error);
        if (error.message.includes('permission_denied')) {
            showStatusOverlay(true, "USERNAME", "");
        } else {
            showStatusOverlay(true, "LOADING", `Kullanıcı verisi alınamadı: ${error.message}`);
        }
    });
}
function saveUsername() {
    const username = document.getElementById('username-input').value.trim();
    const usernameError = document.getElementById('username-error');
    const saveUsernameButton = document.getElementById('save-username-button');
  
    if (username.length === 0 || username.length > 12 || !/^[a-zA-Z0-9_]+$/.test(username)) {
        usernameError.textContent = "Kullanıcı adı 1-12 karakter olmalı ve sadece harf, rakam, _ içermeli.";
        return;
    }
    saveUsernameButton.disabled = true;
    usernameError.textContent = '';
    const usernameRef = db.ref(`${USERNAMES_PATH}/${username}`);
    usernameRef.transaction((currentData) => {
        if (currentData !== null && currentData !== userId) return;
        return userId;
    }).then((transactionResult) => {
        if (transactionResult.committed) {
            const userRef = db.ref(`${USERS_PATH}/${userId}/username`);
            userRef.set(username).then(() => {
                globalUsername = username;
                showLoadingScreen();
                setTimeout(() => {
                    updateUIAccordingToStatus();
                }, 3000);
            }).catch(error => {
                console.error("Kullanıcı Adı Kaydetme Hatası:", error);
                usernameError.textContent = `Kaydetme hatası: ${error.message}`;
            });
        } else {
            usernameError.textContent = "Bu kullanıcı adı alınmış. Lütfen farklı bir ad deneyin.";
        }
        saveUsernameButton.disabled = false;
    }).catch(error => {
        console.error("Kullanıcı Adı Transaction Hatası:", error);
        usernameError.textContent = `Bir hata oluştu: ${error.message}`;
        saveUsernameButton.disabled = false;
    });
}
function setupPresence() {
    if (!isAuthReady || !userId || !globalUsername) return;
    const presenceRef = db.ref(`${PRESENCE_PATH}/${userId}`);
    presenceRef.onDisconnect().remove();
    presenceRef.set({
        username: globalUsername,
        online: true
    }).catch(error => {
        console.error("Mevcudiyet ayarı hatası:", error);
    });
}
function listenToActiveUsers() {
    if (!isAuthReady) return;
    const activeUsersRef = db.ref(PRESENCE_PATH);
    const activeUsersListEl = document.getElementById('active-users-list');
    const activeUserCountEl = document.getElementById('active-user-count');
  
    if (activeUsersListener) activeUsersRef.off('value', activeUsersListener);
  
    activeUsersListener = (snapshot) => {
        const users = snapshot.val() || {};
        activeUsersListEl.innerHTML = '';
        const userArray = [];
        Object.keys(users).forEach(uid => {
            const userData = users[uid];
            if (userData && userData.online) {
                userArray.push({ uid, username: userData.username });
            }
        });
      
        activeUserCountEl.textContent = userArray.length;
        if (userArray.length === 0) {
            activeUsersListEl.innerHTML = '<li class="text-sm text-gray-500 dark:text-gray-400">Kimse çevrimiçi değil.</li>';
            return;
        }
        userArray.forEach(user => {
            const isCurrentUser = user.uid === userId;
            const isAdmin = user.username === ADMIN_USERNAME;
            const li = document.createElement('li');
            li.className = `text-sm p-2 rounded-lg ${isCurrentUser ? 'bg-indigo-100 dark:bg-indigo-900 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'} flex justify-between items-center`;
          
            let nameDisplay = user.username || 'Bilinmeyen';
            if (isAdmin) {
                nameDisplay = `<span class="text-red-500 dark:text-red-400 font-bold">${nameDisplay} (Admin)</span>`;
            } else if (isCurrentUser) {
                nameDisplay = `${nameDisplay} (Sen)`;
            }
            li.innerHTML = nameDisplay;
            if (globalUsername === ADMIN_USERNAME && !isCurrentUser) {
                const banBtn = document.createElement('button');
                banBtn.textContent = 'Ban';
                banBtn.className = 'text-xs bg-red-500 hover:bg-red-700 text-white py-1 px-2 rounded-full transition duration-150 ml-2';
                if (!banBtn.onclick) banBtn.addEventListener('click', () => {
                     if (confirm(`${user.username || 'Kullanıcı'} kullanıcısını banlamak istediğinizden emin misiniz?`)) {
                        banUser(user.uid);
                    }
                });
                li.appendChild(banBtn);
            }
          
            activeUsersListEl.appendChild(li);
        });
    };
    activeUsersRef.on('value', activeUsersListener);
}
function startResetListener() {
    if (!isAuthReady || !db) return;
    const resetRef = db.ref(RESET_METADATA_PATH);
    if (resetListener) resetRef.off('value', resetListener);
  
    resetListener = (snapshot) => {
        let nextResetTime = snapshot.val();
        resetCounterEl.textContent = '--:--';
      
        if (!nextResetTime) {
            if (globalUsername === ADMIN_USERNAME) {
                nextResetTime = Date.now() + RESET_INTERVAL_MS;
                resetRef.set(nextResetTime);
            }
        }
        if (resetTimerInterval) clearInterval(resetTimerInterval);
        resetTimerInterval = setInterval(() => {
            const now = Date.now();
            const remaining = nextResetTime - now;
            if (remaining <= 0) {
                checkAndHandleReset(nextResetTime);
                clearInterval(resetTimerInterval);
                return;
            }
            const totalSeconds = Math.floor(remaining / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            resetCounterEl.textContent = formattedTime;
        }, 1000);
    };
    resetRef.on('value', resetListener, (error) => {
        console.error("Reset Dinleme Hatası:", error);
        resetCounterEl.textContent = 'Hata';
    });
}
function checkAndHandleReset(oldResetTime) {
    const resetRef = db.ref(RESET_METADATA_PATH);
    resetRef.transaction((currentNextResetTime) => {
        if (currentNextResetTime !== oldResetTime) {
            return;
        }
        return Date.now() + RESET_INTERVAL_MS;
    }).then((transactionResult) => {
        if (transactionResult.committed) {
            console.log("Sohbet döngüsü sıfırlandı.");
            if (globalUsername === ADMIN_USERNAME) {
                db.ref(ANNOUNCEMENTS_PATH).push({
                    text: "Sohbet Döngüsü Süresi Doldu ve Temizlendi.",
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            }
            db.ref(CHAT_REF_PATH).remove();
        }
    }).catch(error => {
        console.error("Reset İşlemi Hatası:", error);
    });
}
function init() {
    loadTheme();
  
    if (!sendButtonEl.onclick) sendButtonEl.addEventListener('click', sendMessage);
    if (!messageInputEl.onkeydown) messageInputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    if (!messageInputEl.oninput) messageInputEl.addEventListener('input', checkRateLimit);
    if (!themeToggleEl.onclick) themeToggleEl.addEventListener('click', toggleTheme);
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
      
        auth.onAuthStateChanged((user) => {
            if (user) {
                userId = user.uid;
                userStatusEl.textContent = "Bağlandı (Anonim)";
                isAuthReady = true;
                showLoadingScreen();
                setTimeout(() => {
                    listenToAppStatus();
                    updateUIAccordingToStatus();
                }, 1500);
            } else {
                userStatusEl.textContent = "Kimlik doğrulanıyor...";
                showLoadingScreen();
                auth.signInAnonymously().catch((error) => {
                    console.error("Anonim oturum açma hatası:", error);
                    userStatusEl.textContent = "Kimlik Hatası!";
                    showStatusOverlay(true, "LOADING", "Giriş yapılamadı.");
                });
            }
        });
    } catch (error) {
        userStatusEl.textContent = "Bağlantı Hatası!";
        showStatusOverlay(true, "LOADING", "Firebase başlatılamadı.");
        console.error("Firebase Başlatma Hatası:", error);
    }
}
window.onload = init;
