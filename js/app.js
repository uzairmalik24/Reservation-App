// js/app.js - Main Application Initialization & Event Listeners

import { initializeFirebase } from './firebase.js';
import { getState, setState, resetParticipantCounter } from './state.js';
import { showSection, showMessage, setupCheckboxBehavior, generateParticipantHTML, showModal } from './ui.js';
import { formatBirthdateInput, generateId } from './utils.js';
import { adminLogin, adminLogout, checkAdminAccess } from './auth.js';
import { renderEvents, renderAdminEvents, handleFilterChange, editEvent, deleteEvent, saveEvent } from './events.js';
import {
    bookEvent, addParticipant, removeParticipant, submitBooking,
    viewParticipants, viewAdminBookings, searchUserBookings,
    exportToCsv, printList, shareWhatsapp, updateAdminBookingsView, findUserBookings, renderUserBookings,
    resetParticipantsForm
} from './bookings.js';
import { updateBookingInFirebase, deleteBookingFromFirebase } from './firebase.js';

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Roma Club CDLVI application...');

    // Initialize Firebase
    await initializeFirebase();

    // Setup date input auto-formatting
    setupDateInput();

    // Setup navigation
    setupNavigation();

    // Setup filters
    setupFilters();

    // Setup forms
    setupForms();

    // Setup global handlers
    setupGlobalHandlers();

    // Setup checkbox behavior
    setupCheckboxBehavior();

    // Setup modal
    setupModal();

    // Setup mutation observer for dynamic content
    setupMutationObserver();

    // Show home section
    showSection('home');

    console.log('✅ Application initialized successfully');
});

// Setup navigation
function setupNavigation() {
    document.getElementById('homeBtn').addEventListener('click', () => showSection('home'));

    document.getElementById('myBookingsBtn').addEventListener('click', () => showSection('myBookingsSearch'));

    document.getElementById('adminBtn').addEventListener('click', () => {
        if (getState('isAdmin') && getState('currentUser')) {
            showSection('adminDashboard');
            renderAdminEvents();
        } else {
            showSection('adminLogin');
        }
    });

    // Back buttons
    document.getElementById('backFromParticipants').addEventListener('click', () => showSection('home'));
    document.getElementById('backFromAdminBookings').addEventListener('click', () => showSection('adminDashboard'));
    document.getElementById('cancelSearchBookings').addEventListener('click', () => showSection('home'));
    document.getElementById('backToSearchBookings').addEventListener('click', () => showSection('myBookingsSearch'));
}

// Setup filters
function setupFilters() {
    document.getElementById('monthFilter').addEventListener('change', handleFilterChange);
    document.getElementById('competitionFilter').addEventListener('change', handleFilterChange);
}

// Setup forms
function setupForms() {
    // Admin login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value.trim();
        await adminLogin(password);
    });

    document.getElementById('cancelLogin').addEventListener('click', () => showSection('home'));

    // Admin dashboard
    document.getElementById('addEventBtn').addEventListener('click', () => {
        setState('editingEventId', null);
        document.getElementById('eventFormTitle').textContent = 'Aggiungi Nuovo Evento';
        document.getElementById('eventForm').reset();
        showSection('eventForm');
    });

    document.getElementById('logoutBtn').addEventListener('click', adminLogout);

    // Event form
    document.getElementById('eventForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!checkAdminAccess()) return;

        const editingEventId = getState('editingEventId');
        const eventData = {
            id: editingEventId || generateId(),
            name: document.getElementById('eventName').value.trim(),
            competition: document.getElementById('eventCompetition').value.trim(),
            date: document.getElementById('eventDate').value,
            time: `${document.getElementById('eventHour').value}:${document.getElementById('eventMinute').value}`,
            location: document.getElementById('eventLocation').value.trim(),
            description: document.getElementById('eventDescription').value.trim()
        };

        if (!eventData.name || !eventData.date || !eventData.time.includes(':') || !eventData.location) {
            showMessage('Compila tutti i campi obbligatori', 'error');
            return;
        }

        try {
            await saveEvent(eventData);
        } catch (error) {
            console.error('Error saving event:', error);
        }
    });

    document.getElementById('cancelEventForm').addEventListener('click', () => showSection('adminDashboard'));

    // Booking form
    document.getElementById('addParticipantBtn').addEventListener('click', addParticipant);
    document.getElementById('bookingForm').addEventListener('submit', submitBooking);
    document.getElementById('cancelBooking').addEventListener('click', () => showSection('home'));

    // User bookings search
    document.getElementById('searchBookingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        searchUserBookings();
    });

    // User edit form - assuming shared with bookingForm for simplicity; adjust if separate form exists
    // If separate form, replace with specific IDs
    document.getElementById('addParticipant').addEventListener('click', addParticipant); // Reuse addParticipant for edit

    document.getElementById('removeParticipant').addEventListener('click', () => {
        // Reuse remove logic; find the last participant-entry and remove
        const lastEntry = document.querySelector('#participantsContainer .participant-entry:last-child');
        if (lastEntry && document.querySelectorAll('#participantsContainer .participant-entry').length > 1) {
            removeParticipant(lastEntry.querySelector('.btn--danger') || { closest: () => lastEntry });
        } else {
            showMessage('Non puoi rimuovere il partecipante principale', 'error');
        }
    });

    // Admin bookings actions
    document.getElementById('printListBtn').addEventListener('click', printList);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCsv);
    document.getElementById('shareWhatsappBtn').addEventListener('click', shareWhatsapp);
}

// Helper function to populate a participant entry
function populateParticipant(entry, participant, isFirst = false) {
    const nameInput = entry.querySelector('.participant-name');
    if (nameInput) nameInput.value = participant.name || '';
    const surnameInput = entry.querySelector('.participant-surname');
    if (surnameInput) surnameInput.value = participant.surname || '';
    const birthdateInput = entry.querySelector('.participant-birthdate');
    if (birthdateInput) birthdateInput.value = participant.birthdate || '';
    const birthplaceInput = entry.querySelector('.participant-birthplace');
    if (birthplaceInput) birthplaceInput.value = participant.birthplace || '';
    const birthProvinceInput = entry.querySelector('.participant-birth-province');
    if (birthProvinceInput) birthProvinceInput.value = participant.birthProvince || '';
    const residencePlaceInput = entry.querySelector('.participant-residence-place');
    if (residencePlaceInput) residencePlaceInput.value = participant.residencePlace || '';
    const residenceProvinceInput = entry.querySelector('.participant-residence-province');
    if (residenceProvinceInput) residenceProvinceInput.value = participant.residenceProvince || '';
    const phoneInput = entry.querySelector('.participant-phone');
    if (phoneInput) phoneInput.value = participant.phone || '';
    const emailInput = entry.querySelector('.participant-email');
    if (emailInput) emailInput.value = participant.email || '';
    const romaCardCheckbox = entry.querySelector('.participant-roma-card');
    if (romaCardCheckbox) {
        romaCardCheckbox.checked = !!participant.romaCard;
    }
    const romaCardNumberInput = entry.querySelector('.participant-roma-card-number');
    if (romaCardNumberInput) {
        romaCardNumberInput.value = participant.romaCardNumber || '';
    }
    setupCheckboxBehavior(entry); // Handles visibility of romaCardNumber
}

// Setup date input auto-formatting
function setupDateInput() {
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('participant-birthdate')) {
            formatBirthdateInput(e);
        }
    });
}

// Setup global handlers (for onclick attributes)
function setupGlobalHandlers() {
    window.bookEventHandler = bookEvent;
    window.viewParticipantsHandler = viewParticipants;
    window.viewAdminBookingsHandler = viewAdminBookings;
    window.editEventHandler = editEvent;
    window.deleteEventHandler = deleteEvent;
    window.removeParticipantHandler = removeParticipant;

    // Admin edit booking handler
    window.editBookingHandler = async (bookingId) => {
        const currentEventId = getState('currentEventId');
        const bookings = getState('bookings');
        const eventBookings = bookings[currentEventId] || [];
        const booking = eventBookings.find(b => b.id === bookingId);
        if (!booking) {
            showMessage('Prenotazione non trovata', 'error');
            return;
        }

        setState('editingBookingId', bookingId);
        setState('editingEventId', currentEventId);
        setState('editMode', 'admin');

        const events = getState('events');
        const event = events.find(e => e.id === currentEventId);
        if (!event) return;

        document.getElementById('bookingEventTitle').textContent = `Modifica Prenotazione - ${event.name}`;
        document.getElementById('bookingEventId').value = currentEventId;

        document.getElementById('bookingForm').reset();
        const container = document.getElementById('participantsContainer');
        container.innerHTML = '';
        resetParticipantCounter();

        // Add first participant with password HTML
        const firstEntry = document.createElement('div');
        firstEntry.className = 'participant-entry';
        const baseHtml = generateParticipantHTML(0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = baseHtml;
        const nomeField = tempDiv.querySelector('.participant-name').closest('.form-group');
        nomeField.insertAdjacentHTML('afterend', `
            <div class="form-group">
                <label class="form-label">Password di modifica prenotazione *</label>
                <input type="text" id="bookingPassword" class="form-control" placeholder="Scegli una password per la modifica" required minlength="4" value="${booking.bookingPassword || ''}">
                <span class="info-text">Ti servirà per modificare o cancellare la prenotazione</span>
            </div>
        `);
        firstEntry.innerHTML = tempDiv.innerHTML;
        populateParticipant(firstEntry, booking.participants[0], true);
        const firstTitle = firstEntry.querySelector('h4');
        firstTitle.textContent = 'Partecipante Principale';
        container.appendChild(firstEntry);

        // Add additional participants
        booking.participants.slice(1).forEach((participant, index) => {
            addParticipant();
            const entries = document.querySelectorAll('.participant-entry');
            const entry = entries[index + 1];
            populateParticipant(entry, participant);
            const title = entry.querySelector('h4');
            title.textContent = `Partecipante ${index + 2}`;
            const removeButtonHtml = `
                <div class="remove-participant">
                    <button type="button" class="btn btn--danger btn--sm" onclick="window.removeParticipantHandler(this)">Rimuovi Partecipante</button>
                </div>
            `;
            entry.insertAdjacentHTML('beforeend', removeButtonHtml);
        });

        setState('participantCounter', booking.participants.length);

        // Set booking type
        const type = booking.participants[0].bookingType;
        document.querySelector(`input[name="bookingType"][value="${type}"]`).checked = true;

        showSection('bookingForm');
    };

    // Admin delete booking handler
    window.deleteBookingHandler = async (bookingId) => {
        showModal(
            'Conferma Cancellazione',
            'Sei sicuro di voler cancellare questa prenotazione? L\'operazione è irreversibile.',
            async () => {
                try {
                    await deleteBookingFromFirebase(bookingId, getState('currentEventId'));
                    showMessage('Prenotazione cancellata con successo', 'success');
                    updateAdminBookingsView();
                } catch (error) {
                    showMessage(`Errore nella cancellazione: ${error.message}`, 'error');
                }
            }
        );
    };

    // User edit booking handler
    window.editUserBookingHandler = async (bookingId) => {
        const currentUserSearch = getState('currentUserSearch');
        if (!currentUserSearch) {
            showMessage('Sessione di ricerca scaduta. Ricerca nuovamente le prenotazioni.', 'error');
            showSection('myBookingsSearch');
            return;
        }

        const bookings = getState('bookings');
        const eventId = getState('editingEventId') || Object.keys(bookings).find(key => bookings[key].some(b => b.id === bookingId)); // Fallback find event
        if (!eventId) {
            showMessage('Evento non trovato per questa prenotazione', 'error');
            return;
        }

        const eventBookings = bookings[eventId] || [];
        const booking = eventBookings.find(b => b.id === bookingId);
        if (!booking || booking.bookingPassword !== currentUserSearch.password) {
            showMessage('Prenotazione non trovata o password non valida', 'error');
            return;
        }

        setState('editingBookingId', bookingId);
        setState('editingEventId', eventId);
        setState('editMode', 'user');

        const events = getState('events');
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        document.getElementById('bookingEventTitle').textContent = `Modifica la tua Prenotazione - ${event.name}`;
        document.getElementById('bookingEventId').value = eventId;

        document.getElementById('bookingForm').reset();
        const container = document.getElementById('participantsContainer');
        container.innerHTML = '';
        resetParticipantCounter();

        // Similar to admin edit, add first participant
        const firstEntry = document.createElement('div');
        firstEntry.className = 'participant-entry';
        const baseHtml = generateParticipantHTML(0);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = baseHtml;
        const nomeField = tempDiv.querySelector('.participant-name').closest('.form-group');
        nomeField.insertAdjacentHTML('afterend', `
            <div class="form-group">
                <label class="form-label">Password di modifica prenotazione *</label>
                <input type="text" id="bookingPassword" class="form-control" placeholder="Scegli una password per la modifica" required minlength="4" value="${booking.bookingPassword || ''}">
                <span class="info-text">Ti servirà per modificare o cancellare la prenotazione</span>
            </div>
        `);
        firstEntry.innerHTML = tempDiv.innerHTML;
        populateParticipant(firstEntry, booking.participants[0], true);
        const firstTitle = firstEntry.querySelector('h4');
        firstTitle.textContent = 'Partecipante Principale';
        container.appendChild(firstEntry);

        // Add additional
        booking.participants.slice(1).forEach((participant, index) => {
            addParticipant();
            const entries = document.querySelectorAll('.participant-entry');
            const entry = entries[index + 1];
            populateParticipant(entry, participant);
            const title = entry.querySelector('h4');
            title.textContent = `Partecipante ${index + 2}`;
            const removeButtonHtml = `
                <div class="remove-participant">
                    <button type="button" class="btn btn--danger btn--sm" onclick="window.removeParticipantHandler(this)">Rimuovi Partecipante</button>
                </div>
            `;
            entry.insertAdjacentHTML('beforeend', removeButtonHtml);
        });

        setState('participantCounter', booking.participants.length);

        // Set booking type
        const type = booking.participants[0].bookingType;
        document.querySelector(`input[name="bookingType"][value="${type}"]`).checked = true;

        showSection('bookingForm');
    };

    // User delete booking handler
    window.deleteUserBookingHandler = async (bookingId, eventId) => {
        const currentUserSearch = getState('currentUserSearch');
        if (!currentUserSearch) {
            showMessage('Sessione di ricerca scaduta. Ricerca nuovamente le prenotazioni.', 'error');
            return;
        }

        showModal(
            'Conferma Cancellazione',
            'Sei sicuro di voler cancellare questa prenotazione? L\'operazione è irreversibile.',
            async () => {
                try {
                    await deleteBookingFromFirebase(bookingId, eventId);
                    showMessage('Prenotazione cancellata con successo', 'success');
                    const userBookings = findUserBookings(currentUserSearch.surname, currentUserSearch.password);
                    renderUserBookings(userBookings);
                } catch (error) {
                    showMessage(`Errore nella cancellazione: ${error.message}`, 'error');
                }
            }
        );
    };
}

// Setup modal
function setupModal() {
    document.getElementById('modalCancel').addEventListener('click', () => {
        document.getElementById('modalContainer').classList.add('hidden');
    });
}

// Setup mutation observer
function setupMutationObserver() {
    const observer = new MutationObserver(() => setupCheckboxBehavior());
    observer.observe(document.body, { childList: true, subtree: true });
}