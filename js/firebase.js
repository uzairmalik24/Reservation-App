// js/firebase.js - Firebase Initialization & Database Operations

import { firebaseConfig } from './config.js';
import { setFirebaseInstances, setCurrentUser, setEvents, setBookings, getState } from './state.js';
import { updateStatus } from './ui.js';
import { renderEvents, populateCompetitionFilter, renderAdminEvents } from './events.js';

// Initialize Firebase
export async function initializeFirebase() {
    try {
        const app = firebase.initializeApp(firebaseConfig);
        const db = firebase.firestore();
        const auth = firebase.auth();

        setFirebaseInstances(app, db, auth);
        console.log("✅ Firebase inizializzato correttamente");
        console.log("🔐 Firebase Auth inizializzato");
        updateStatus('synced', 'Database connesso');

        // Setup auth state listener
        auth.onAuthStateChanged(user => {
            setCurrentUser(user);
            if (user) {
                console.log("👤 Admin autenticato:", user.email);
            } else {
                console.log("🚪 Admin disconnesso");
            }
        });

        await loadDataFromFirebase();
        setupRealtimeListeners();
    } catch (error) {
        console.error("❌ Errore Firebase:", error);
        updateStatus('error', 'Errore database - usando dati locali');
        loadDefaultData();
    }
}

// Load data from Firebase
export async function loadDataFromFirebase() {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) return;

    try {
        updateStatus("loading", "Caricamento dati...");

        // Load events
        const eventsSnapshot = await db.collection('events').orderBy('date').get();
        const events = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setEvents(events);

        // Load bookings
        const bookingsSnapshot = await db.collection('bookings').get();
        const bookings = {};
        bookingsSnapshot.docs.forEach(doc => {
            const bookingData = { id: doc.id, ...doc.data() };
            const eventId = bookingData.eventId;
            if (!bookings[eventId]) bookings[eventId] = [];
            bookings[eventId].push(bookingData);
        });
        setBookings(bookings);

        renderEvents();
        populateCompetitionFilter();
        if (getState('isAdmin')) renderAdminEvents();
        updateStatus("synced", "Dati sincronizzati");

    } catch (error) {
        console.error("❌ Errore caricamento dati:", error);
        updateStatus("error", "Errore caricamento");
    }
}

// Setup real-time listeners
export function setupRealtimeListeners() {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) return;

    // Real-time events listener
    db.collection('events').onSnapshot(snapshot => {
        const events = getState('events');

        snapshot.docChanges().forEach(change => {
            const eventData = { id: change.doc.id, ...change.doc.data() };
            const index = events.findIndex(e => e.id === eventData.id);

            if (change.type === 'added') {
                if (index === -1) {
                    events.push(eventData);
                } else {
                    events[index] = eventData;
                }
            } else if (change.type === 'modified') {
                if (index !== -1) {
                    events[index] = eventData;
                }
            } else if (change.type === 'removed') {
                if (index !== -1) {
                    events.splice(index, 1);
                }
            }
        });

        setEvents([...events]);
        renderEvents();
        populateCompetitionFilter();
        if (getState('isAdmin')) renderAdminEvents();
        updateStatus("synced", "Sincronizzato");
    }, error => {
        console.error("❌ Errore listener eventi:", error);
        updateStatus("error", "Errore sync eventi");
    });

    // Real-time bookings listener
    db.collection('bookings').onSnapshot(snapshot => {
        const bookings = {};
        snapshot.docs.forEach(doc => {
            const bookingData = { id: doc.id, ...doc.data() };
            const eventId = bookingData.eventId;
            if (!bookings[eventId]) bookings[eventId] = [];
            bookings[eventId].push(bookingData);
        });

        setBookings(bookings);
        renderEvents();
        if (getState('isAdmin')) renderAdminEvents();

    }, error => {
        console.error("❌ Errore listener prenotazioni:", error);
        updateStatus("error", "Errore sync prenotazioni");
    });
}

// Save event to Firebase
export async function saveEventToFirebase(eventData) {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) {
        throw new Error("Database non disponibile");
    }

    try {
        updateStatus("loading", "Salvando evento...");

        if (eventData.id && eventData.id.startsWith('id-')) {
            const { id, ...dataWithoutId } = eventData;
            const docRef = await db.collection('events').add(dataWithoutId);
            updateStatus("synced", "Evento salvato");
            return docRef.id;
        } else {
            const { id, ...dataWithoutId } = eventData;
            await db.collection('events').doc(id).update(dataWithoutId);
            updateStatus("synced", "Evento aggiornato");
            return id;
        }
    } catch (error) {
        console.error("❌ Errore salvataggio evento:", error);
        updateStatus("error", "Errore salvataggio");
        throw error;
    }
}

// Save booking to Firebase
export async function saveBookingToFirebase(bookingData) {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) {
        throw new Error("Database non disponibile");
    }

    try {
        updateStatus("loading", "Salvando prenotazione...");
        await db.collection('bookings').add(bookingData);
        updateStatus("synced", "Prenotazione salvata");
    } catch (error) {
        console.error("❌ Errore salvataggio prenotazione:", error);
        updateStatus("error", "Errore salvataggio");
        throw error;
    }
}

// Update booking in Firebase
export async function updateBookingInFirebase(bookingId, bookingData) {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) return;

    try {
        updateStatus("loading", "Aggiornando prenotazione...");
        await db.collection('bookings').doc(bookingId).update(bookingData);
        updateStatus("synced", "Prenotazione aggiornata");
    } catch (error) {
        console.error("❌ Errore aggiornamento prenotazione:", error);
        updateStatus("error", "Errore aggiornamento");
        throw error;
    }
}

// Delete event from Firebase
export async function deleteEventFromFirebase(eventId) {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) return;

    try {
        updateStatus("loading", "Cancellando evento...");

        await db.collection('events').doc(eventId).delete();

        const bookingsSnapshot = await db.collection('bookings').where('eventId', '==', eventId).get();
        const batch = db.batch();
        bookingsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        updateStatus("synced", "Evento cancellato");

    } catch (error) {
        console.error("❌ Errore cancellazione evento:", error);
        updateStatus("error", "Errore cancellazione");
        throw error;
    }
}

// Delete booking from Firebase
export async function deleteBookingFromFirebase(bookingId) {
    const db = getState('db');
    const isFirebaseReady = getState('isFirebaseReady');

    if (!isFirebaseReady) {
        throw new Error('Firebase non pronto per la cancellazione');
    }

    if (!bookingId || typeof bookingId !== 'string') {
        throw new Error('BookingId non valido per cancellazione');
    }

    try {
        console.log('🔄 Firebase: inizio cancellazione booking', bookingId);
        updateStatus('loading', 'Cancellando prenotazione...');

        const docRef = db.collection('bookings').doc(bookingId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error('Prenotazione non trovata nel database');
        }

        await docRef.delete();
        console.log('✅ Firebase: booking cancellato con successo', bookingId);

        updateStatus('synced', 'Prenotazione cancellata');

    } catch (error) {
        console.error('❌ Firebase: errore cancellazione', error);
        updateStatus('error', 'Errore cancellazione');
        throw new Error(`Cancellazione fallita: ${error.message}`);
    }
}

// Load default data fallback
function loadDefaultData() {
    const events = [
        {
            id: "event-1",
            name: "Roma vs Juventus",
            competition: "Campionato di Serie A",
            date: "2025-09-15",
            time: "20:45",
            location: "Stadio Olimpico, Roma",
            description: "Derby d'Italia allo Stadio Olimpico"
        }
    ];

    setEvents(events);
    setBookings({});

    renderEvents();
    populateCompetitionFilter();
    if (getState('isAdmin')) renderAdminEvents();
}