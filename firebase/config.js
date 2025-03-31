import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: 'AIzaSyC8fok9-HjSp65TrWrVLcD9eceD7ZerMo0',
    authDomain: 'pathapp-2b091.firebaseapp.com',
    projectId: 'pathapp-2b091',
    storageBucket: 'pathapp-2b091.firebasestorage.app',
    messagingSenderId: '',
    appId: '1:162139209795:ios:5391cac6386e0285a314f6',
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Auth 인스턴스 생성
const auth = getAuth(app);

export { auth };
