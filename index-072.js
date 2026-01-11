
if (window.location.href !== "https://burakgtx.github.io/kayit.html") {
    document.documentElement.innerHTML = ""; 
    window.stop();
    throw new Error("x"); 
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




window.switchAuth = (type) => {
    document.getElementById('panel-reg').classList.toggle('hidden', type !== 'reg');
    document.getElementById('panel-login').classList.toggle('hidden', type !== 'login');
    document.getElementById('tab-reg').classList.toggle('active', type === 'reg');
    document.getElementById('tab-login').classList.toggle('active', type === 'login');
};


window.initiateAuth = async () => {
    const email = document.getElementById('reg-email').value.trim();
    if(!email) return notify("Lütfen e-posta girin!", "error");
    
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    try {
        const res = await createUserWithEmailAndPassword(auth, email, code);
        await sendEmailVerification(res.user);
        
        localStorage.setItem('auth_timer_end', Date.now() + 120000);
        localStorage.setItem('pending_code', code);
        
        notify("Doğrulama maili iletildi!", "info");
    } catch (e) {
        let msg = "Kayıt hatası!";
        if(e.code === 'auth/email-already-in-use') msg = "Bu mail zaten kullanımda.";
        notify(msg, "error");
    }
};


window.loginWithCode = async () => {
    const email = document.getElementById('login-email').value.trim();
    const code = document.getElementById('login-code').value.trim();
    
    if(!email || !code) return notify("Alanları doldurun!", "error");

    try {
        await signInWithEmailAndPassword(auth, email, code);
        localStorage.setItem('perm_code', code); 
    } catch (e) { 
        notify("E-posta veya kod hatalı!", "error"); 
    }
};


window.goToCodeStep = async () => {
    const rawUsername = document.getElementById('setup-username').value.trim().toLowerCase();
    const username = rawUsername.replace(/[^a-z0-9_]/g, '');

    if (username.length < 3 || username.length > 15) return notify("3-15 karakter olmalı!", "error");
    
    try {
        
        const nameSnap = await getDoc(doc(db, "usernames", username));
        if (nameSnap.exists()) return notify("Bu isim başkasına ait!", "error");

        localStorage.setItem('temp_username', username);
        localStorage.setItem('temp_avatar', selectedAvatar);
        
        document.getElementById('generated-code-display').textContent = localStorage.getItem('pending_code');
        showStep('ui-show-code');


        let count = 10;
        const btn = document.getElementById('btn-finish-setup');
        btn.disabled = true;
        
        const timer = setInterval(() => {
            count--;
            btn.textContent = `Kodu Kaydedin (${count}s)`;
            if (count <= 0) {
                clearInterval(timer);
                btn.disabled = false;
                btn.textContent = "Kurulumu Tamamla";
                btn.onclick = finalizeAccount;
            }
        }, 1000);
    } catch (e) { 
        notify("Bağlantı hatası: " + e.code, "error"); 
    }
};


const finalizeAccount = async () => {
    const user = auth.currentUser;
    const username = localStorage.getItem('temp_username');
    const avatar = localStorage.getItem('temp_avatar');
    const code = localStorage.getItem('pending_code');

    if(!user || !username) return;

    try {

        await setDoc(doc(db, "usernames", username), {
            uid: user.uid,
            createdAt: new Date().toISOString()
        });

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
        
        notify("Hesap aktive edildi!", "success");
        setTimeout(() => location.reload(), 1500);
    } catch (e) { 
        notify("Yetki Hatası (Permission Denied)!", "error"); 
    }
};


window.logout = () => signOut(auth).then(() => { 
    localStorage.clear(); 
    location.reload(); 
});


window.copyCode = () => {
    const code = localStorage.getItem('pending_code');
    navigator.clipboard.writeText(code);
    notify("Kod panoya kopyalandı!", "success");
};

window.copyCodeFromMain = () => {
    const code = localStorage.getItem('perm_code');
    if(code) {
        navigator.clipboard.writeText(code);
        notify("Erişim kodu kopyalandı!", "success");
    }
};


function showStep(id) {
    const steps = ['ui-auth-tabs', 'ui-wait', 'ui-setup', 'ui-show-code', 'ui-main'];
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

onAuthStateChanged(auth, async (user) => {
    const loading = document.getElementById('loading-screen');
    
    try {
        if (user) {
            if (user.emailVerified) {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (userDoc.exists() && userDoc.data().setupComplete) {
                    showStep('ui-main');
                    document.getElementById('main-username').textContent = "@" + userDoc.data().username;
                    document.getElementById('main-avatar').src = userDoc.data().avatar;
                    document.getElementById('main-email').textContent = userDoc.data().email;
                } else { 
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
        console.error("Auth State Error:", err);
        showStep('ui-auth-tabs');
    } finally {
        // Yükleme ekranını kapat
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

const seeds = ["Felix", "Aneka", "Max", "Luna", "Jack", "Milo", "Oliver", "Zoe"];
const avatarList = document.getElementById('avatar-list');

if(avatarList) {
    seeds.forEach(s => {
        const img = document.createElement('img');
        img.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`;
        img.className = 'avatar-item';
        img.alt = "User Avatar Option";
        if(s === "Felix") img.classList.add('selected');
        
        img.onclick = () => {
            document.querySelectorAll('.avatar-item').forEach(i => i.classList.remove('selected'));
            img.classList.add('selected');
            selectedAvatar = img.src;
        };
        avatarList.appendChild(img);
    });
}

setTimeout(() => {
    const loading = document.getElementById('loading-screen');
    if (loading && !loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
        console.warn("Loading screen closed by fail-safe.");
    }
}, 5000);
