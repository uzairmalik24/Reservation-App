// js/bookings.js - Booking Management

import { getState, setState, resetParticipantCounter } from './state.js';
import { formatDate, isEventPast, sortEventsByDate, validateParticipant, extractParticipantData } from './utils.js';
import { saveBookingToFirebase, updateBookingInFirebase, deleteBookingFromFirebase } from './firebase.js';
import { showMessage, showModal, showSection, generateParticipantHTML, setupCheckboxBehavior, showParticipantControls, renderParticipantDetails } from './ui.js';

// Book event - show booking form
export function bookEvent(eventId) {
    const events = getState('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setState('currentEventId', eventId);

    document.getElementById('bookingEventTitle').textContent = event.name;
    document.getElementById('bookingEventId').value = eventId;

    document.getElementById('bookingForm').reset();
    resetParticipantsForm();

    showSection('bookingForm');
}

// Reset participants form
export function resetParticipantsForm() {
    const container = document.getElementById('participantsContainer');
    resetParticipantCounter();
    container.innerHTML = '';

    const participantEntry = document.createElement('div');
    participantEntry.className = 'participant-entry';

    const baseHtml = generateParticipantHTML(0);

    const passwordHtml = `
    <div class="form-group">
        <label class="form-label">Password di modifica prenotazione *</label>
        <input type="text" id="bookingPassword" class="form-control" placeholder="Scegli una password per la modifica" required minlength="4">
        <span class="info-text">Ti servirà per modificare o cancellare la prenotazione</span>
    </div>
  `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = baseHtml;
    const nomeField = tempDiv.querySelector('.participant-name').closest('.form-group');
    nomeField.insertAdjacentHTML('afterend', passwordHtml);

    participantEntry.innerHTML = tempDiv.innerHTML;
    container.appendChild(participantEntry);
}

// Add participant to booking form
export function addParticipant() {
    const counter = getState('participantCounter');
    const newCounter = counter + 1;
    setState('participantCounter', newCounter);

    const container = document.getElementById('participantsContainer');
    const participantEntry = document.createElement('div');
    participantEntry.className = 'participant-entry';

    participantEntry.innerHTML = generateParticipantHTML(newCounter - 1);

    const removeButtonHtml = `
    <div class="remove-participant">
        <button type="button" class="btn btn--danger btn--sm" onclick="window.removeParticipantHandler(this)">Rimuovi Partecipante</button>
    </div>
  `;
    participantEntry.insertAdjacentHTML('beforeend', removeButtonHtml);

    container.appendChild(participantEntry);
    setupCheckboxBehavior(participantEntry);
}

// Remove participant from booking form
export function removeParticipant(button) {
    const participantEntry = button.closest('.participant-entry');
    participantEntry.remove();

    const entries = document.querySelectorAll('.participant-entry');
    entries.forEach((entry, index) => {
        const title = entry.querySelector('h4');
        if (index === 0) {
            title.textContent = 'Partecipante Principale';
        } else {
            title.textContent = `Partecipante ${index + 1}`;
        }
    });

    setState('participantCounter', entries.length);
}

// Submit booking
export async function submitBooking(e) {
    e.preventDefault();

    const bookingType = document.querySelector('input[name="bookingType"]:checked')?.value;
    const bookingPassword = document.getElementById('bookingPassword').value.trim();

    let globalMissingFields = [];
    if (!bookingType) globalMissingFields.push("Tipo di prenotazione");
    if (!bookingPassword || bookingPassword.length < 4) globalMissingFields.push("Password (min. 4 caratteri)");

    const participantEntries = document.querySelectorAll('#participantsContainer .participant-entry');
    const participants = [];

    participantEntries.forEach((entry, index) => {
        const missing = validateParticipant(entry);
        if (missing.length > 0) {
            const label = index === 0 ? "Partecipante Principale" : `Partecipante ${index + 1}`;
            globalMissingFields.push(`\n${label}: ${missing.join(', ')}`);
        }
    });

    if (globalMissingFields.length > 0) {
        showMessage(`Attenzione, mancano i seguenti campi: ${globalMissingFields.join('')}`, 'error');
        return;
    }

    participantEntries.forEach(entry => {
        participants.push(extractParticipantData(entry, bookingType));
    });

    if (participants.length === 0) return;

    const editingBookingId = getState('editingBookingId');
    const editMode = getState('editMode');

    try {
        if (editingBookingId) {
            await updateBookingInFirebase(editingBookingId, {
                eventId: document.getElementById('bookingEventId').value,
                participants,
                bookingPassword,
                updatedAt: new Date().toISOString()
            });
            showMessage(`Prenotazione aggiornata!\nRicorda la tua nuova password di modifica: ${bookingPassword}`, 'success');
            setState('editingBookingId', null);
            setState('editMode', null);
            if (editMode === 'admin') {
                updateAdminBookingsView();
                showSection('adminBookings');
            } else if (editMode === 'user') {
                const currentUserSearch = getState('currentUserSearch');
                if (currentUserSearch) {
                    const userBookings = findUserBookings(currentUserSearch.surname, currentUserSearch.password);
                    renderUserBookings(userBookings);
                }
                showSection('myBookingsResults');
            } else {
                showSection('home');
            }
        } else {
            await saveBookingToFirebase({
                eventId: document.getElementById('bookingEventId').value,
                participants,
                bookingPassword,
                createdAt: new Date().toISOString()
            });
            showMessage(`Prenotazione confermata!\nRicorda la tua password di modifica: ${bookingPassword}`, 'success');
            showSection('home');
        }
    } catch (error) {
        showMessage('Errore durante la prenotazione', 'error');
    }
}

// View participants (public view)
export function viewParticipants(eventId) {
    const events = getState('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setState('currentEventId', eventId);
    updateParticipantsView();
    showSection('participants');
}

// Update participants view
function updateParticipantsView() {
    const currentEventId = getState('currentEventId');
    const events = getState('events');
    const bookings = getState('bookings');

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    document.getElementById('participantsEventTitle').innerHTML = `
    <div style="text-align: center; line-height: 1.3; margin-bottom: 1rem;">
        <div style="font-size: 1.8rem; font-weight: 700; color: var(--purple); margin-bottom: 0.3rem;">Partecipanti</div>
        <div style="font-size: 1.4rem; font-weight: 600; color: var(--purple);">${event.name}</div>
    </div>
  `;

    const eventBookings = bookings[currentEventId] || [];
    const allParticipants = [];
    eventBookings.forEach(booking => {
        booking.participants.forEach(participant => {
            allParticipants.push({
                ...participant,
                bookingId: booking.id,
                createdAt: booking.createdAt || '2025-01-01T00:00:00.000Z'
            });
        });
    });

    allParticipants.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    document.getElementById('totalParticipants').textContent = allParticipants.length;
    document.getElementById('soloViaggio').textContent = allParticipants.filter(p => p.bookingType === 'Solo Viaggio').length;
    document.getElementById('soloBiglietto').textContent = allParticipants.filter(p => p.bookingType === 'Solo Biglietto').length;
    document.getElementById('bigliettoPiuViaggio').textContent = allParticipants.filter(p => p.bookingType === 'Biglietto + Viaggio').length;

    const participantsList = document.getElementById('participantsList');
    if (allParticipants.length === 0) {
        participantsList.innerHTML = '<p class="text-center">Nessun partecipante registrato per questo evento.</p>';
    } else {
        participantsList.innerHTML = allParticipants.map((participant, index) => `
      <div class="participant-item">
          <div>
              <div class="participant-name">${index + 1}. ${participant.name} ${participant.surname}</div>
          </div>
          <div class="participant-type">${participant.bookingType}</div>
      </div>
    `).join('');
    }
}

// View admin bookings
export function viewAdminBookings(eventId) {
    const events = getState('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setState('currentEventId', eventId);
    updateAdminBookingsView();
    showSection('adminBookings');
}

// Update admin bookings view
export function updateAdminBookingsView() {
    const currentEventId = getState('currentEventId');
    const events = getState('events');
    const bookings = getState('bookings');

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    document.getElementById('adminBookingsEventTitle').textContent = `Prenotazioni - ${event.name}`;

    const eventBookings = bookings[currentEventId] || [];
    eventBookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const participantsList = document.getElementById('adminParticipantsList');
    if (eventBookings.length === 0) {
        participantsList.innerHTML = '<p class="text-center">Nessuna prenotazione per questo evento.</p>';
        document.getElementById('adminTotalParticipants').textContent = 0;
        document.getElementById('adminSoloViaggio').textContent = 0;
        document.getElementById('adminSoloBiglietto').textContent = 0;
        document.getElementById('adminBigliettoPiuViaggio').textContent = 0;
        return;
    }

    let globalParticipantCounter = 1;
    participantsList.innerHTML = eventBookings.map((booking, bookingIndex) => {
        const principal = booking.participants[0];
        const participantsHtml = booking.participants.map((p) => {
            const currentCount = globalParticipantCounter++;
            return `
        <div class="booking-participant" style="border-top: 1px solid var(--gray-200); margin-top: 0.8rem; padding-top: 0.8rem; display: block;">
            <div class="booking-participant-name" style="font-size: 0.95rem;">${currentCount}. ${p.name} ${p.surname}</div>
            <div class="booking-participant-badge" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; margin-bottom: 0.6rem;">${p.bookingType}</div>
            <div class="booking-participant-details" style="font-size: 0.8rem; gap: 0.3rem 1rem;">
                <div class="booking-detail-item"><span>📅</span><span>${p.birthdate || 'N/D'}</span></div>
                <div class="booking-detail-item"><span>📍</span><span>${p.birthplace || 'N/D'} (${p.birthProvince || 'N/A'})</span></div>
                <div class="booking-detail-item"><span>🏠</span><span>${p.residencePlace || 'N/D'} (${p.residenceProvince || 'N/A'})</span></div>
                <div class="booking-detail-item"><span>📱</span><span>${p.phone || 'N/D'}</span></div>
                <div class="booking-detail-item"><span>✉️</span><span>${p.email || 'N/D'}</span></div>
                <div class="booking-detail-item"><span>🎫</span><span>AS Roma Card: ${p.romaCard ? (p.romaCardNumber || 'Sì') : 'No'}</span></div>
            </div>
        </div>
      `;
        }).join('');

        return `
      <div class="booking-item" style="background: white; margin-bottom: 1rem; border: 1px solid var(--gray-200);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
              <div>
                  <h4 style="color: var(--purple); margin-bottom: 0.5rem;">
                      Prenotazione #${bookingIndex + 1} - ${principal.surname} ${principal.name} 
                      <span style="font-weight: normal; color: var(--gray-500);">(${booking.participants.length} ${booking.participants.length > 1 ? 'persone' : 'persona'})</span>
                  </h4>
                  <div class="participants-in-booking">${participantsHtml}</div>
              </div>
              <div class="admin-event-actions">
                  <button class="btn btn--secondary btn--sm" onclick="window.editBookingHandler('${booking.id}')">Modifica Gruppo</button>
                  <button class="btn btn--danger btn--sm" onclick="window.deleteBookingHandler('${booking.id}')">Cancella Gruppo</button>
              </div>
          </div>
      </div>
    `;
    }).join('');

    const totalParticipants = eventBookings.reduce((sum, booking) => sum + booking.participants.length, 0);
    document.getElementById('adminTotalParticipants').textContent = totalParticipants;

    let soloViaggio = 0, soloBiglietto = 0, bigliettoPiuViaggio = 0;
    eventBookings.forEach(booking => {
        booking.participants.forEach(p => {
            if (p.bookingType === 'Solo Viaggio') soloViaggio++;
            if (p.bookingType === 'Solo Biglietto') soloBiglietto++;
            if (p.bookingType === 'Biglietto + Viaggio') bigliettoPiuViaggio++;
        });
    });
    document.getElementById('adminSoloViaggio').textContent = soloViaggio;
    document.getElementById('adminSoloBiglietto').textContent = soloBiglietto;
    document.getElementById('adminBigliettoPiuViaggio').textContent = bigliettoPiuViaggio;
}

// Search user bookings
export function searchUserBookings() {
    const surname = document.getElementById('searchSurname').value.trim();
    const password = document.getElementById('searchPassword').value.trim();

    if (!surname || !password) {
        showMessage('Compila cognome e password per cercare le prenotazioni', 'error');
        return;
    }

    const userBookings = findUserBookings(surname, password);

    if (userBookings.length === 0) {
        showMessage('Nessuna prenotazione trovata con questi dati', 'error');
        return;
    }

    setState('currentUserSearch', { surname, password });
    renderUserBookings(userBookings);
    showSection('myBookingsResults');
}

// Find user bookings
export function findUserBookings(surname, password) {
    const bookings = getState('bookings');
    const events = getState('events');
    const userBookings = [];

    Object.keys(bookings).forEach(eventId => {
        const event = events.find(e => e.id === eventId);
        if (!event) return;

        const eventBookings = bookings[eventId] || [];

        eventBookings.forEach(booking => {
            if (booking.bookingPassword === password) {
                const primaryParticipant = booking.participants[0];
                if (primaryParticipant && primaryParticipant.surname.toLowerCase() === surname.toLowerCase()) {
                    userBookings.push({ bookingId: booking.id, eventId, event, booking, userParticipant: primaryParticipant });
                }
            } else if (!booking.bookingPassword) {
                const primaryParticipant = booking.participants[0];
                if (primaryParticipant && primaryParticipant.surname.toLowerCase() === surname.toLowerCase()) {
                    userBookings.push({ bookingId: booking.id, eventId, event, booking, userParticipant: primaryParticipant, isLegacyBooking: true });
                }
            }
        });
    });

    return userBookings;
}

// Render user bookings
export function renderUserBookings(userBookings) {
    const container = document.getElementById('userBookingsList');
    const userDisplay = document.getElementById('userNameDisplay');
    const currentUserSearch = getState('currentUserSearch');

    userDisplay.textContent = `${currentUserSearch.surname} (password: ${currentUserSearch.password.substring(0, 2)}***)`;

    if (userBookings.length === 0) {
        container.innerHTML = '<p class="text-center">Nessuna prenotazione trovata.</p>';
        return;
    }

    userBookings.sort((a, b) => {
        const dateA = new Date(a.event.date + 'T' + a.event.time);
        const dateB = new Date(b.event.date + 'T' + b.event.time);
        return dateA - dateB;
    });

    container.innerHTML = userBookings.map(userBooking => {
        const { event, booking, bookingId, isLegacyBooking } = userBooking;
        const isPast = isEventPast(event);

        let legacyNotice = '';
        if (isLegacyBooking) {
            legacyNotice = `
        <div style="background: #fff3cd; padding: 1rem; border-radius: 8px; margin: 1rem 0; font-size: 0.9rem;">
            <strong>Nota:</strong> Questa prenotazione è stata creata con il sistema precedente.
        </div>
      `;
        }

        return `
      <div class="booking-item">
          <div class="booking-event-name">${event.name} ${isPast ? '(Evento Passato)' : ''}</div>
          ${event.competition ? `<div style="font-style: italic; color: var(--gray-600); margin: 0.5rem 0; font-size: 0.9rem;">${event.competition}</div>` : ''}
          <div class="booking-event-meta">📅 ${formatDate(event.date)} • 🕐 ${event.time} • 📍 ${event.location}</div>
          <div class="booking-participants">
              <strong>👥 Tutti i Partecipanti (${booking.participants.length})</strong>
              ${booking.participants.map((p, index) => renderParticipantDetails(p, index)).join('')}
          </div>
          ${legacyNotice}
          <div class="booking-actions">
              <button class="btn btn--secondary btn--sm" onclick="window.editUserBookingHandler('${bookingId}')">Modifica</button>
              <button class="btn btn--danger btn--sm" onclick="window.deleteUserBookingHandler('${bookingId}', '${event.id}')">Cancella</button>
          </div>
      </div>
    `;
    }).join('');
}

// Export functions (CSV, Print, WhatsApp) - Simplified versions
export function exportToCsv() {
    const currentEventId = getState('currentEventId');
    const events = getState('events');
    const bookings = getState('bookings');

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    const eventBookings = bookings[currentEventId] || [];
    const allParticipants = eventBookings.flatMap(b => b.participants);

    if (allParticipants.length === 0) {
        showMessage('Nessun partecipante da esportare', 'error');
        return;
    }

    let csvContent = "Cognome,Nome,Data di nascita,Luogo di nascita,Provincia di nascita,Luogo di residenza,Provincia di residenza,Email,Telefono,AS Roma Card,Numero AS Roma Card,Tipo prenotazione\n";

    allParticipants.forEach(p => {
        csvContent += `"${p.surname || ''}","${p.name || ''}","${p.birthdate || ''}","${p.birthplace || ''}","${p.birthProvince || ''}","${p.residencePlace || ''}","${p.residenceProvince || ''}","${p.email || ''}","${p.phone || ''}","${p.romaCard ? 'Sì' : 'No'}","${p.romaCardNumber || ''}","${p.bookingType || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `partecipanti_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function printList() {
    const currentEventId = getState('currentEventId');
    const events = getState('events');
    const bookings = getState('bookings');

    const event = events.find(e => e.id === currentEventId);
    if (!event) return;

    const eventBookings = bookings[currentEventId] || [];
    const allParticipants = [];

    eventBookings.forEach(booking => {
        booking.participants.forEach((participant, participantIndex) => {
            allParticipants.push({
                ...participant,
                createdAt: booking.createdAt || '2025-01-01T00:00:00.000Z',
                participantOrder: participantIndex
            });
        });
    });

    allParticipants.sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
        }
        return a.participantOrder - b.participantOrder;
    });

    let printContent = `
        <h2 style="color: #800020; text-align: center; border-bottom: 2px solid #800020; padding-bottom: 10px;">
            Lista Partecipanti - ${event.name}
        </h2>
        <div style="text-align: center; margin: 15px 0; font-size: 12px;">
            <p><strong>Data:</strong> ${formatDate(event.date)} | <strong>Ora:</strong> ${event.time} | <strong>Totale:</strong> ${allParticipants.length}</p>
        </div>
    `;

    if (allParticipants.length === 0) {
        printContent += '<p style="text-align: center; font-style: italic;">Nessun partecipante registrato.</p>';
    } else {
        printContent += `
            <table style="width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 15px;">
                <thead>
                    <tr style="background-color: #800020; color: white;">
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Nome</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Cognome</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Data Nascita</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Luogo e Prov. Nascita</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Luogo e Prov. Residenza</th>
                        <th style="border: 1px solid #ccc; padding: 5px; text-align: left;">Numero AS Roma Card</th>
                    </tr>
                </thead>
                <tbody>
        `;
        allParticipants.forEach((p, index) => {
            const rowColor = index % 2 === 0 ? '#f9f9f9' : '#ffffff';
            printContent += `
                <tr style="background-color: ${rowColor};">
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.name || ''}</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.surname || ''}</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.birthdate || ''}</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.birthplace || ''} (${p.birthProvince || ''})</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.residencePlace || ''} (${p.residenceProvince || ''})</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${p.romaCard ? (p.romaCardNumber || 'N/A') : 'No'}</td>
                </tr>
            `;
        });
        printContent += `</tbody></table>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><title>Lista Partecipanti - ${event.name}</title>
        <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Arial', sans-serif; line-height: 1.3; }
            table, th, td { border: 1px solid #ccc; }
        </style>
        </head><body>${printContent}</body></html>`);
    printWindow.document.close();
    printWindow.print();
}

export function shareWhatsapp() {
    const currentEventId = getState('currentEventId');
    const events = getState('events');
    const bookings = getState('bookings');

    const event = events.find(e => e.id === currentEventId);
    if (!event) {
        showMessage('Evento non trovato', 'error');
        return;
    }

    const eventBookings = bookings[currentEventId] || [];
    if (eventBookings.length === 0) {
        showMessage('Nessuna prenotazione da condividere', 'error');
        return;
    }

    eventBookings.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const totalParticipants = eventBookings.reduce((sum, b) => sum + b.participants.length, 0);

    // Build message using String.fromCodePoint to avoid encoding issues
    const lines = [];
    lines.push(String.fromCodePoint(0x1F49B) + String.fromCodePoint(0x2764) + ' ROMA CLUB CDLVI PARMA');
    lines.push('');
    lines.push(String.fromCodePoint(0x1F4CD) + ' EVENTO: ' + event.name);
    lines.push(String.fromCodePoint(0x1F4C5) + ' DATA: ' + formatDate(event.date));
    lines.push(String.fromCodePoint(0x1F552) + ' ORARIO: ' + event.time);
    lines.push(String.fromCodePoint(0x1F3DF) + ' LUOGO: ' + event.location);
    lines.push(String.fromCodePoint(0x1F465) + ' PARTECIPANTI: ' + totalParticipants);
    lines.push('');

    let counter = 1;
    eventBookings.forEach(booking => {
        booking.participants.forEach(p => {
            let emoji = '';
            if (p.bookingType === 'Biglietto + Viaggio') {
                emoji = String.fromCodePoint(0x1F697) + String.fromCodePoint(0x1F3AB); // 🚗🎫
            } else if (p.bookingType === 'Solo Biglietto') {
                emoji = String.fromCodePoint(0x1F3AB); // 🎫
            } else if (p.bookingType === 'Solo Viaggio') {
                emoji = String.fromCodePoint(0x1F697); // 🚗
            }

            lines.push(counter + '. ' + p.name + ' ' + p.surname);
            lines.push('   ' + emoji);
            counter++;
        });
    });

    lines.push(String.fromCodePoint(0x2501).repeat(22)); // ━ line
    lines.push(String.fromCodePoint(0x1F43A) + ' FORZA ROMA! ' + String.fromCodePoint(0x1F43A));
    lines.push(String.fromCodePoint(0x1F4F1) + ' romaclubcdlvi.it/trasferte');

    const whatsappText = lines.join('\n');
    const encodedText = encodeURIComponent(whatsappText);

    window.open('https://wa.me/?text=' + encodedText, '_blank');
    showMessage('Apri WhatsApp per condividere la lista', 'info');
}
