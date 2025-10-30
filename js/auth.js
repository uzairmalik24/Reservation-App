// js/auth.js - Authentication Management

import { ADMIN_EMAIL } from './config.js';
import { getState } from './state.js';
import { updateStatus, showMessage, showSection } from './ui.js';
import { renderAdminEvents } from './events.js';

// Admin login
export async function adminLogin(password) {
    const auth = getState('auth');
    const isAuthReady = getState('isAuthReady');

    if (!isAuthReady) {
        showMessage('Sistema di autenticazione non pronto. Riprova.', 'error');
        return false;
    }

    if (!password) {
        showMessage('Inserisci la password', 'error');
        return false;
    }

    try {
        updateStatus('loading', 'Autenticazione...');
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, password);

        console.log('🎉 Login admin riuscito');
        showSection('adminDashboard');
        renderAdminEvents();
        showMessage('Accesso amministratore autorizzato', 'success');
        updateStatus('synced', 'Admin autenticato');
        return true;

    } catch (error) {
        console.error('❌ Errore login:', error);
        showMessage('Password errata o utente non trovato.', 'error');
        updateStatus('error', 'Autenticazione fallita');
        return false;
    }
}

// Admin logout
export async function adminLogout() {
    const auth = getState('auth');

    try {
        await auth.signOut();
        showMessage('Logout effettuato con successo', 'success');
        showSection('home');
    } catch (error) {
        showMessage('Errore durante il logout', 'error');
    }
}

// Check if user is admin
export function checkAdminAccess() {
    const isAdmin = getState('isAdmin');
    const currentUser = getState('currentUser');

    if (!isAdmin || !currentUser) {
        showMessage('Non autorizzato.', 'error');
        return false;
    }
    return true;
}