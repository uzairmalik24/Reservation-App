// js/ui.js - UI Rendering & DOM Manipulation

import { provinceItaliane } from './config.js';
import { getState } from './state.js';
import { formatDate, isEventPast } from './utils.js';

// Show/Hide sections
export function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => section.classList.add('hidden'));

    let sectionId = `${sectionName}Section`;
    if (sectionName === 'editAdminBooking') {
        sectionId = 'editAdminBookingSection';
    }

    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.remove('hidden');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Update status indicator
// In ui.js
export function updateStatus(status, message = '') {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;

    // Remove old classes
    indicator.classList.remove('loading', 'synced', 'error', 'hidden');
    indicator.classList.add('status-indicator', status);

    const span = indicator.querySelector('span');
    if (span) span.textContent = message || (status === 'loading' ? 'Caricamento...' : status.charAt(0).toUpperCase() + status.slice(1) + '...');

    // Auto-hide after 3s for success, or 5s max for stuck loading
    if (status === 'synced' || status === 'error') {
        setTimeout(() => hideStatusIndicator(), 3000);
    } else if (status === 'loading') {
        setTimeout(() => {
            if (indicator.classList.contains('loading')) {
                console.warn('Loading stuck >5s; auto-hiding.');
                hideStatusIndicator();
            }
        }, 5000);
    }
}

function hideStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

// Show message to user
export function showMessage(text, type = 'info') {
    const container = document.getElementById('messageContainer');
    const messageEl = document.getElementById('messageText');

    messageEl.textContent = text;
    messageEl.className = 'message';
    if (type === 'error') messageEl.classList.add('error');
    if (type === 'success') messageEl.classList.add('success');

    container.classList.remove('hidden');

    setTimeout(() => {
        container.classList.add('hidden');
    }, 6000);
}

// Show confirmation modal
export function showModal(title, message, onConfirm) {
    const modal = document.getElementById('modalContainer');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const confirmBtn = document.getElementById('modalConfirm');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    confirmBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    };

    modal.classList.remove('hidden');
}

// Generate participant HTML form
export function generateParticipantHTML(participantIndex, data = {}, isAdminContext = false) {
    const p = {
        surname: data.surname || '', name: data.name || '', birthdate: data.birthdate || '',
        birthplace: data.birthplace || '', birthProvince: data.birthProvince || '',
        residencePlace: data.residencePlace || '', residenceProvince: data.residenceProvince || '',
        email: data.email || '', phone: data.phone || '',
        romaCard: data.romaCard === true, romaCardNumber: data.romaCardNumber || ''
    };

    const provinceOptions = provinceItaliane.map(prov =>
        `<option value="${prov}" ${p.birthProvince === prov ? 'selected' : ''}>${prov}</option>`
    ).join('');
    const residenceProvinceOptions = provinceItaliane.map(prov =>
        `<option value="${prov}" ${p.residenceProvince === prov ? 'selected' : ''}>${prov}</option>`
    ).join('');

    const romaCardNumberId = `participant-romacard-number-${participantIndex}`;
    const title = (participantIndex === 0) ? 'Partecipante Principale' : `Partecipante ${participantIndex + 1}`;

    const headerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 1px solid var(--gray-200); padding-bottom: 0.8rem;">
        <h4 style="color: var(--purple); margin: 0;">${title}</h4>
    </div>
  `;

    return `
    ${headerHTML}
    <div class="form-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem 1.5rem;">
        <div class="form-group">
            <label class="form-label">Cognome *</label>
            <input type="text" class="form-control participant-surname" placeholder="Cognome" value="${p.surname}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Nome *</label>
            <input type="text" class="form-control participant-name" placeholder="Nome" value="${p.name}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Data di nascita (GG/MM/AAAA) *</label>
            <input type="text" class="form-control participant-birthdate" placeholder="GG/MM/AAAA" maxlength="10" value="${p.birthdate}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Luogo di nascita *</label>
            <input type="text" class="form-control participant-birthplace" placeholder="Luogo di nascita" value="${p.birthplace}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Provincia di nascita *</label>
            <select class="form-control participant-birth-province" required>
                <option value="">Seleziona provincia...</option>
                ${provinceOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Luogo di residenza *</label>
            <input type="text" class="form-control participant-residence-place" placeholder="Luogo di residenza" value="${p.residencePlace}" required>
        </div>
         <div class="form-group">
            <label class="form-label">Provincia di residenza *</label>
            <select class="form-control participant-residence-province" required>
                <option value="">Seleziona provincia...</option>
                ${residenceProvinceOptions}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Email *</label>
            <input type="email" class="form-control participant-email" placeholder="indirizzo@email.com" value="${p.email}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Telefono *</label>
            <input type="tel" class="form-control participant-phone" placeholder="Numero di 10 cifre" value="${p.phone}" required maxlength="10" oninput="this.value = this.value.replace(/[^0-9]/g, '');">
        </div>
        <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">Titolare AS Roma Card *</label>
            <div class="checkbox-group">
                <div class="checkbox-row">
                    <label class="checkbox-label">
                        <input type="checkbox" class="participant-romacard-si" ${p.romaCard ? 'checked' : ''} onchange="var el = document.getElementById('${romaCardNumberId}'); if (el) el.style.display = this.checked ? 'block' : 'none';">
                        Sì
                    </label>
                    <label class="checkbox-label">
                        <input type="checkbox" class="participant-romacard-no" ${!p.romaCard ? 'checked' : ''} onchange="var el = document.getElementById('${romaCardNumberId}'); if (el) el.style.display = this.checked ? 'none' : 'block';">
                        No
                    </label>
                </div>
            </div>
        </div>
        <div class="form-group" id="${romaCardNumberId}" style="display: ${p.romaCard ? 'block' : 'none'}; grid-column: 1 / -1;">
            <label class="form-label">Numero AS Roma Card *</label>
            <input type="text" inputmode="numeric" pattern="[0-9]*" class="form-control participant-romacard-number" placeholder="Le 12 cifre della tessera" value="${p.romaCardNumber}" maxlength="12" oninput="this.value = this.value.replace(/[^0-9]/g, '');">
            <span class="info-text">Obbligatorio se sei titolare di AS Roma Card</span>
        </div>
    </div>
  `;
}

// Setup checkbox behavior
export function setupCheckboxBehavior(container = document) {
    container.querySelectorAll('.participant-romacard-si').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                const entry = this.closest('.participant-entry, .edit-participant-entry, .edit-admin-participant-entry');
                if (entry) {
                    const noCheckbox = entry.querySelector('.participant-romacard-no');
                    if (noCheckbox) noCheckbox.checked = false;
                }
            }
        });
    });

    container.querySelectorAll('.participant-romacard-no').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (this.checked) {
                const entry = this.closest('.participant-entry, .edit-participant-entry, .edit-admin-participant-entry');
                if (entry) {
                    const siCheckbox = entry.querySelector('.participant-romacard-si');
                    if (siCheckbox) siCheckbox.checked = false;
                }
            }
        });
    });
}

// Show participant controls
export function showParticipantControls() {
    const controls = document.getElementById('participantControls');
    if (!controls) return console.error('participantControls non trovato!');
    controls.style.display = 'flex';
}

// Render participant details in booking view
export function renderParticipantDetails(participant, index) {
    return `
    <div class="booking-participant">
        <div class="booking-participant-name">
            ${index + 1}. ${participant.name} ${participant.surname} ${index === 0 ? '(Principale)' : ''}
        </div>
        <div class="booking-participant-badge">
            ${participant.bookingType}
        </div>
        <div class="booking-participant-details">
            <div class="booking-detail-item">
                <span>📅</span>
                <span>${participant.birthdate}</span>
            </div>
            <div class="booking-detail-item">
                <span>📍</span>
                <span>${participant.birthplace} (${participant.birthProvince})</span>
            </div>
            <div class="booking-detail-item">
                <span>🏠</span>
                <span>${participant.residencePlace} (${participant.residenceProvince})</span>
            </div>
            <div class="booking-detail-item">
                <span>📱</span>
                <span>${participant.phone}</span>
            </div>
            <div class="booking-detail-item">
                <span>✉️</span>
                <span>${participant.email}</span>
            </div>
            <div class="booking-detail-item">
                <span>🎫</span>
                <span>AS Roma Card: ${participant.romaCard ? (participant.romaCardNumber || 'N/D') : 'No'}</span>
            </div>
        </div>
    </div>
  `;
}

