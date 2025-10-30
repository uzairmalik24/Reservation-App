// js/events.js - Event Management

import { getState, setFilters, setState } from './state.js';
import { formatDate, isEventPast, sortEventsByDate, generateId } from './utils.js';
import { saveEventToFirebase, deleteEventFromFirebase } from './firebase.js';
import { showMessage, showModal, showSection } from './ui.js';

// Render events with filters
export function renderEvents() {
    const container = document.getElementById('eventsContainer');
    const events = getState('events');
    const bookings = getState('bookings');
    const currentFilters = getState('currentFilters');

    let futureEvents = events.filter(event => !isEventPast(event));
    futureEvents = filterEvents(futureEvents, currentFilters);

    if (futureEvents.length === 0) {
        let message = 'Nessun evento disponibile';
        if (currentFilters.month || currentFilters.competition) {
            message += ' per i filtri selezionati';
        }
        message += '.';
        container.innerHTML = `<p class="text-center">${message}</p>`;
        return;
    }

    const sortedEvents = sortEventsByDate([...futureEvents]);

    container.innerHTML = sortedEvents.map(event => {
        const eventBookings = bookings[event.id] || [];
        const totalParticipants = eventBookings.reduce((sum, booking) => sum + booking.participants.length, 0);

        return `
      <div class="event-card">
          <h3 class="event-card__title">${event.name}</h3>
          ${event.competition ? `<div class="event-card__competition">${event.competition}</div>` : ''}
          <div class="event-card__meta">
              <div>📅 ${formatDate(event.date)}</div>
              <div>🕐 ${event.time}</div>
              <div>📍 ${event.location}</div>
              <div>👥 ${totalParticipants} partecipant${totalParticipants !== 1 ? 'i' : 'e'}</div>
          </div>
          ${event.description ? `<p class="event-card__description">${event.description}</p>` : ''}
          <div class="event-card__actions">
              <button class="btn btn--primary" onclick="window.bookEventHandler('${event.id}')">Prenota</button>
              <button class="btn btn--secondary" onclick="window.viewParticipantsHandler('${event.id}')">Vedi Partecipanti</button>
          </div>
      </div>
    `;
    }).join('');
}

// Render admin events list
export function renderAdminEvents() {
    const container = document.getElementById('adminEventsList');
    const events = getState('events');
    const bookings = getState('bookings');

    if (events.length === 0) {
        container.innerHTML = '<p class="text-center">Nessun evento creato.</p>';
        return;
    }

    const futureEvents = [];
    const pastEvents = [];
    events.forEach(event => {
        if (isEventPast(event)) {
            pastEvents.push(event);
        } else {
            futureEvents.push(event);
        }
    });

    const sortedEvents = [...sortEventsByDate(futureEvents), ...sortEventsByDate(pastEvents)];

    container.innerHTML = sortedEvents.map(event => {
        const isPast = isEventPast(event);
        const eventBookings = bookings[event.id] || [];
        const totalParticipants = eventBookings.reduce((sum, booking) => sum + booking.participants.length, 0);

        return `
      <div class="admin-event-item">
          <div class="admin-event-info">
              <h3>${event.name} ${isPast ? '<span style="color: var(--gray-500); font-weight: normal;">(Passato)</span>' : ''}</h3>
              ${event.competition ? `<div style="font-style: italic; color: var(--gray-600); margin: 0.5rem 0; font-size: 0.9rem;">${event.competition}</div>` : ''}
              <div class="admin-event-meta">
                  📅 ${formatDate(event.date)} • 🕐 ${event.time}<br>
                  📍 ${event.location}<br>
                  👥 ${totalParticipants} partecipanti
                  ${event.description ? `<br>📝 ${event.description}` : ''}
              </div>
          </div>
          <div class="admin-event-actions">
              <button class="btn btn--primary btn--sm" onclick="window.viewAdminBookingsHandler('${event.id}')">Prenotazioni</button>
              <button class="btn btn--secondary btn--sm" onclick="window.editEventHandler('${event.id}')">Modifica</button>
              <button class="btn btn--danger btn--sm" onclick="window.deleteEventHandler('${event.id}')">Cancella</button>
          </div>
      </div>
    `;
    }).join('');
}

// Filter events
function filterEvents(eventsToFilter, filters) {
    let filteredEvents = [...eventsToFilter];

    if (filters.month) {
        filteredEvents = filteredEvents.filter(event => {
            const eventMonth = event.date.split('-')[1];
            return eventMonth === filters.month;
        });
    }

    if (filters.competition) {
        filteredEvents = filteredEvents.filter(event => {
            return event.competition && event.competition.trim() === filters.competition;
        });
    }

    return filteredEvents;
}

// Populate competition filter
export function populateCompetitionFilter() {
    const competitionSelect = document.getElementById('competitionFilter');
    const events = getState('events');
    const competitions = new Set();

    events.forEach(event => {
        if (event.competition && event.competition.trim()) {
            competitions.add(event.competition.trim());
        }
    });

    const currentValue = competitionSelect.value;
    competitionSelect.innerHTML = '<option value="">Tutte le competizioni</option>';

    Array.from(competitions).sort().forEach(competition => {
        const option = document.createElement('option');
        option.value = competition;
        option.textContent = competition;
        competitionSelect.appendChild(option);
    });

    if (currentValue && competitions.has(currentValue)) {
        competitionSelect.value = currentValue;
    }
}

// Handle filter changes
export function handleFilterChange() {
    const month = document.getElementById('monthFilter').value;
    const competition = document.getElementById('competitionFilter').value;
    setFilters({ month, competition });
    renderEvents();
}

// Create/Edit event
export async function saveEvent(eventData) {
    try {
        const id = await saveEventToFirebase(eventData);
        showMessage(eventData.id ? 'Evento aggiornato con successo' : 'Evento creato con successo', 'success');
        showSection('adminDashboard');
        return id;
    } catch (error) {
        showMessage('Errore durante il salvataggio dell\'evento', 'error');
        throw error;
    }
}

// Edit event
export function editEvent(eventId) {
    const events = getState('events');
    const event = events.find(e => e.id === eventId);

    if (!event) {
        showMessage('Evento non trovato', 'error');
        return;
    }

    setState('editingEventId', eventId);

    document.getElementById('eventName').value = event.name || '';
    document.getElementById('eventDate').value = event.date || '';
    document.getElementById('eventLocation').value = event.location || '';
    document.getElementById('eventDescription').value = event.description || '';

    if (event.time) {
        const [hour, minute] = event.time.split(':');
        document.getElementById('eventHour').value = hour;
        document.getElementById('eventMinute').value = minute;
    }

    document.getElementById('eventCompetition').value = event.competition || '';
    document.getElementById('eventFormTitle').textContent = 'Modifica Evento';

    showSection('eventForm');
}

// Delete event
export async function deleteEvent(eventId) {
    const events = getState('events');
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    showModal(
        'Cancella Evento',
        `Sei sicuro di voler cancellare l'evento "${event.name}"? Tutte le prenotazioni associate verranno eliminate.`,
        async () => {
            try {
                await deleteEventFromFirebase(eventId);
                const index = events.findIndex(e => e.id === eventId);
                if (index !== -1) {
                    events.splice(index, 1);
                }
                showMessage('Evento cancellato con successo', 'success');
                renderAdminEvents();
            } catch (error) {
                showMessage('Errore durante la cancellazione dell\'evento', 'error');
            }
        }
    );
}