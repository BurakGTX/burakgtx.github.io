if (window.location.href !== "https://burakgtx.github.io/kayit.html") {
    document.documentElement.innerHTML = "";
    window.stop();
    throw new Error("x");
}

let devToolsOpened = false;
let lastWidth = window.outerWidth;
let lastHeight = window.outerHeight;
let currentLang = "tr";
let audioPlayer = null;
let isPlaying = false;

function detectDevTools() {
    const widthDiff = window.outerWidth - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    
    if (widthDiff > 150 || heightDiff > 150) {
        devToolsOpened = true;
    }
}

setInterval(() => {
    detectDevTools();
    if (devToolsOpened) {
        document.documentElement.innerHTML = "";
        window.stop();
        window.location.href = "about:blank";
    }
}, 300);

document.addEventListener('keydown', function(e) {
    if (e.key === "F12" || 
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "C" || e.key === "J")) ||
        (e.ctrlKey && e.key === "u") || 
        (e.ctrlKey && e.key === "s")) {
        e.preventDefault();
        devToolsOpened = true;
        document.documentElement.innerHTML = "";
        window.stop();
        window.location.href = "about:blank";
    }
});

document.addEventListener('contextmenu', e => e.preventDefault());

console.log = console.error = console.warn = function() {};

Object.defineProperty(window, 'devtools', { 
    get: () => { 
        devToolsOpened = true; 
        window.location.href = "about:blank"; 
        return null; 
    } 
});

const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
Object.defineProperty(Element.prototype, 'innerHTML', {
    set: function(value) {
        if (typeof value === "string" && 
            (value.includes("<script") || value.includes("onerror=") || value.includes("javascript:"))) {
            throw new Error("XSS Blocked");
        }
        originalInnerHTML.set.call(this, value);
    }
});

function sanitizeInput(str) {
    return str.replace(/[<>"/\\&'%;(){}]/g, '');
}

let regRecaptchaWidgetId = null;
let loginRecaptchaWidgetId = null;
const RECAPTCHA_SITE_KEY = "6LfivfosAAAAAMySZxacTc4AMsz5etlvYEj5EUYd";

function loadRecaptcha() {
    const existing = document.querySelector('script[src*="recaptcha"]');
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=explicit&hl=${currentLang}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

loadRecaptcha();

function resetRecaptcha(widgetId) {
    if (typeof grecaptcha !== "undefined" && widgetId !== null) {
        grecaptcha.reset(widgetId);
    }
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, onAuthStateChanged, signOut, deleteUser } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAdYx6KnAiSY6mVtkLt_ZK1R0Rq3Uh1tRY",
    authDomain: "pastebin-61d0b.firebaseapp.com",
    projectId: "pastebin-61d0b",
    storageBucket: "pastebin-61d0b.firebasestorage.app",
    messagingSenderId: "984614843816",
    appId: "1:984614843816:web:77260642b9b5903833999d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let timerInterval;
let selectedAvatar = "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix";

function updateUIText() {
    document.getElementById('tab-reg').textContent = currentLang === "tr" ? "Yeni Kayıt" : "Register";
    document.getElementById('tab-login').textContent = currentLang === "tr" ? "Giriş Yap" : "Login";
    
    document.getElementById('reg-email').placeholder = currentLang === "tr" ? "E-posta Adresi" : "Email Address";
    document.getElementById('login-email').placeholder = currentLang === "tr" ? "E-posta" : "Email";
    document.getElementById('login-code').placeholder = currentLang === "tr" ? "Güvenlik Kodu" : "Security Code";
    
    const setupTitle = document.querySelector('#ui-setup h3');
    if (setupTitle) setupTitle.textContent = currentLang === "tr" ? "Hesabını Özelleştir" : "Customize Your Account";
}

window.switchLang = (lang) => {
    currentLang = lang;
    document.getElementById('lang-tr').classList.toggle('active', lang === 'tr');
    document.getElementById('lang-en').classList.toggle('active', lang === 'en');
    updateUIText();
    loadRecaptcha();
    setTimeout(initRecaptchaWidgets, 1000);
};

window.initiateAuth = async () => {
    let email = sanitizeInput(document.getElementById('reg-email').value.trim());
    if(!email) return notify(currentLang === "tr" ? "Lütfen e-posta girin!" : "Please enter email!", "error");

    if (regRecaptchaWidgetId === null) {
        return notify(currentLang === "tr" ? "reCAPTCHA yükleniyor..." : "reCAPTCHA is loading...", "error");
    }

    const response = grecaptcha.getResponse(regRecaptchaWidgetId);
    if (!response) {
        notify(currentLang === "tr" ? "Lütfen reCAPTCHA doğrulamasını tamamlayın!" : "Please complete reCAPTCHA!", "error");
        return;
    }

    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
   
    try {
        const res = await createUserWithEmailAndPassword(auth, email, code);
        await sendEmailVerification(res.user);
        localStorage.setItem('auth_timer_end', Date.now() + 120000);
        localStorage.setItem('pending_code', code);
       
        notify(currentLang === "tr" ? "Doğrulama maili gönderildi!" : "Verification email sent!", "success");
        resetRecaptcha(regRecaptchaWidgetId);
    } catch (e) {
        let msg = currentLang === "tr" ? "Kayıt hatası!" : "Registration error!";
        if(e.code === 'auth/email-already-in-use') msg = currentLang === "tr" ? "Bu mail zaten kullanımda." : "This email is already in use.";
        notify(msg, "error");
        resetRecaptcha(regRecaptchaWidgetId);
    }
};

window.loginWithCode = async () => {
    let email = sanitizeInput(document.getElementById('login-email').value.trim());
    let code = sanitizeInput(document.getElementById('login-code').value.trim());
   
    if(!email || !code) return notify(currentLang === "tr" ? "Alanları doldurun!" : "Please fill all fields!", "error");

    if (loginRecaptchaWidgetId === null) {
        return notify(currentLang === "tr" ? "reCAPTCHA yükleniyor..." : "reCAPTCHA is loading...", "error");
    }

    const response = grecaptcha.getResponse(loginRecaptchaWidgetId);
    if (!response) {
        notify(currentLang === "tr" ? "Lütfen reCAPTCHA doğrulamasını tamamlayın!" : "Please complete reCAPTCHA!", "error");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, code);
        localStorage.setItem('perm_code', code);
    } catch (e) {
        notify(currentLang === "tr" ? "E-posta veya kod hatalı!" : "Email or code is incorrect!", "error");
        resetRecaptcha(loginRecaptchaWidgetId);
    }
};

window.switchAuth = (type) => {
    document.getElementById('panel-reg').classList.toggle('hidden', type !== 'reg');
    document.getElementById('panel-login').classList.toggle('hidden', type !== 'login');
    document.getElementById('tab-reg').classList.toggle('active', type === 'reg');
    document.getElementById('tab-login').classList.toggle('active', type === 'login');
};

window.goToCodeStep = async () => {
    const rawUsername = document.getElementById('setup-username').value.trim().toLowerCase();
    const username = rawUsername.replace(/[^a-z0-9_]/g, '');
    if (username.length < 3 || username.length > 15) return notify(currentLang === "tr" ? "3-15 karakter olmalı!" : "Must be 3-15 characters!", "error");
   
    try {
        const nameSnap = await getDoc(doc(db, "usernames", username));
        if (nameSnap.exists()) return notify(currentLang === "tr" ? "Bu isim başkasına ait!" : "This username is taken!", "error");
        
        localStorage.setItem('temp_username', username);
        localStorage.setItem('temp_avatar', selectedAvatar);
       
        document.getElementById('generated-code-display').textContent = localStorage.getItem('pending_code');
        showStep('ui-show-code');
        
        let count = 10;
        const btn = document.getElementById('btn-finish-setup');
        btn.disabled = true;
       
        const timer = setInterval(() => {
            count--;
            btn.textContent = currentLang === "tr" ? `Kodu Kaydedin (${count}s)` : `Save Code (${count}s)`;
            if (count <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = currentLang === "tr" ? "Kurulumu Tamamla" : "Complete Setup";
                btn.onclick = finalizeAccount;
            }
        }, 1000);
    } catch (e) {
        notify(currentLang === "tr" ? "Bağlantı hatası!" : "Connection error!", "error");
    }
};

const finalizeAccount = async () => {
    const user = auth.currentUser;
    const username = localStorage.getItem('temp_username');
    const avatar = localStorage.getItem('temp_avatar');
    const code = localStorage.getItem('pending_code');
    if(!user || !username) return;
    
    try {
        await setDoc(doc(db, "usernames", username), { uid: user.uid, createdAt: new Date().toISOString() });
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            email: user.email,
            username: username,
            avatar: avatar,
            setupComplete: true
        });
        
        localStorage.setItem('perm_code', code);
        localStorage.removeItem('temp_username');
        localStorage.removeItem('temp_avatar');
       
        notify(currentLang === "tr" ? "Hesap aktive edildi!" : "Account activated successfully!", "success");
        setTimeout(() => location.reload(), 1500);
    } catch (e) {
        notify(currentLang === "tr" ? "Yetki Hatası!" : "Permission Error!", "error");
    }
};

window.logout = () => signOut(auth).then(() => {
    localStorage.clear();
    location.reload();
});

window.copyCode = () => {
    const code = localStorage.getItem('pending_code');
    if(code) navigator.clipboard.writeText(code).then(() => notify(currentLang === "tr" ? "Kod kopyalandı!" : "Code copied!", "success"));
};

window.copyCodeFromMain = () => {
    const code = localStorage.getItem('perm_code');
    if(code) navigator.clipboard.writeText(code).then(() => notify(currentLang === "tr" ? "Erişim kodu kopyalandı!" : "Access code copied!", "success"));
};

// ====================== ROLLBACK DEVAM FONKSİYONU ======================
window.handleRollbackContinue = async () => {
    notify(currentLang === "tr" ? "Yeniden kayıt olmanız gerekiyor." : "You need to register again.", "success");
    
    try {
        await signOut(auth).catch(() => {});
    } catch (e) {}

    localStorage.clear();

    setTimeout(() => {
        location.reload(true);
    }, 1600);
};

// ====================== EKRAN YÖNETİMİ ======================
function showStep(id) {
    const steps = ['ui-auth-tabs', 'ui-wait', 'ui-setup', 'ui-show-code', 'ui-main', 'ui-rollback'];
    steps.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

function notify(msg, type) {
    const b = document.getElementById('status-box');
    b.textContent = msg;
    b.className = type;
    b.style.display = 'block';
    setTimeout(() => b.style.display = 'none', 5000);
}

function initRecaptchaWidgets() {
    if (typeof grecaptcha === "undefined") {
        setTimeout(initRecaptchaWidgets, 1200);
        return;
    }

    if (document.getElementById('reg-recaptcha')) {
        regRecaptchaWidgetId = grecaptcha.render('reg-recaptcha', {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: "dark",
            size: "normal"
        });
    }

    if (document.getElementById('login-recaptcha')) {
        loginRecaptchaWidgetId = grecaptcha.render('login-recaptcha', {
            sitekey: RECAPTCHA_SITE_KEY,
            theme: "dark",
            size: "normal"
        });
    }
}

// ====================== ANA AUTH KONTROLÜ (DÜZELTİLDİ) ======================
onAuthStateChanged(auth, async (user) => {
    const loading = document.getElementById('loading-screen');
    
    try {
        if (user) {
            if (user.emailVerified) {
                const userDoc = await getDoc(doc(db, "users", user.uid));

                // Yeni kayıt sırasında rollback çıkmasın
                if (!userDoc.exists()) {
                    if (localStorage.getItem('pending_code') || localStorage.getItem('temp_username')) {
                        showStep('ui-setup');     // Yeni kayıt devam ediyor
                    } else {
                        showStep('ui-rollback');  // Gerçek rollback (eski hesap silinmiş)
                    }
                } 
                else if (userDoc.exists() && userDoc.data().setupComplete === true) {
                    showStep('ui-main');
                    document.getElementById('main-username').textContent = "@" + userDoc.data().username;
                    document.getElementById('main-avatar').src = userDoc.data().avatar;
                    document.getElementById('main-email').textContent = userDoc.data().email;
                } 
                else {
                    showStep('ui-setup');
                }
            } else {
                showStep('ui-wait');
                startVerificationTimer(user);
            }
        } else {
            showStep('ui-auth-tabs');
        }
    } catch (err) {
        console.error("Auth state error:", err);
        showStep('ui-auth-tabs');
    } finally {
        setTimeout(() => {
            if(loading) loading.classList.add('hidden');
        }, 1000);
    }
});

function startVerificationTimer(user) {
    clearInterval(timerInterval);
    timerInterval = setInterval(async () => {
        const end = localStorage.getItem('auth_timer_end');
        const remaining = Math.ceil((end - Date.now()) / 1000);
       
        if (remaining <= 0) {
            clearInterval(timerInterval);
            await deleteUser(user).catch(() => {});
            logout();
        } else {
            const timerEl = document.getElementById('timer-display');
            if(timerEl) timerEl.textContent = `00:${remaining.toString().padStart(2,'0')}`;
           
            if (remaining % 3 === 0) {
                await user.reload();
                if (user.emailVerified) location.reload();
            }
        }
    }, 1000);
}

const seeds = ["Felix", "Aneka", "Max", "Luna", "Jack", "Milo", "Oliver", "Zoe", "Ruby", "Leo", "Nova", "Atlas", "Echo", "Sage", "Blaze"];
const avatarList = document.getElementById('avatar-list');

if(avatarList) {
    seeds.forEach(s => {
        const img = document.createElement('img');
        img.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
        img.className = 'avatar-item';
        img.alt = "Avatar Option";
        if(s === "Felix") img.classList.add('selected');
       
        img.onclick = () => {
            document.querySelectorAll('.avatar-item').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            selectedAvatar = img.src;
        };
        avatarList.appendChild(img);
    });
}

window.addEventListener('load', () => {
    updateUIText();
    setTimeout(initRecaptchaWidgets, 1500);
});

setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    if (loading && !loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
    }
}, 8000);
