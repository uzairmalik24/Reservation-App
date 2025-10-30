// js/state.js - Application State Management

const state = {
    // Firebase instances
    app: null,
    db: null,
    auth: null,
    isFirebaseReady: false,
    isAuthReady: false,

    // User state
    currentUser: null,
    isAdmin: false,

    // Data
    events: [],
    bookings: {},

    // UI state
    currentSection: 'home',
    currentEventId: null,
    editingEventId: null,
    editingBookingId: null,
    editingUserBookingId: null,

    // User bookings search
    currentUserSearch: null,

    // Filters
    currentFilters: {
        month: '',
        competition: ''
    },

    // Caches
    bookingCache: null,
    participantCounter: 1
};

// Getters
export const getState = (key) => state[key];
export const getAllState = () => ({ ...state });

// Setters
export const setState = (key, value) => {
    state[key] = value;
};

export const updateState = (updates) => {
    Object.keys(updates).forEach(key => {
        state[key] = updates[key];
    });
};

// Specific state managers
export const setFirebaseInstances = (app, db, auth) => {
    state.app = app;
    state.db = db;
    state.auth = auth;
    state.isFirebaseReady = true;
    state.isAuthReady = true;
};

export const setCurrentUser = (user) => {
    state.currentUser = user;
    state.isAdmin = !!user;
};

export const setEvents = (events) => {
    state.events = events;
};

export const setBookings = (bookings) => {
    state.bookings = bookings;
};

export const setCurrentSection = (section) => {
    state.currentSection = section;
};

export const setFilters = (filters) => {
    state.currentFilters = { ...state.currentFilters, ...filters };
};

export const resetParticipantCounter = () => {
    state.participantCounter = 1;
};

export const incrementParticipantCounter = () => {
    state.participantCounter++;
    return state.participantCounter;
};