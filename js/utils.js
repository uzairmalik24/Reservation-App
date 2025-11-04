// js/utils.js - Utility Functions

// ID Generation
export function generateId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Date Formatting
export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

export function validateDate(dateString) {
    const regex = /^([0-2][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
    if (!regex.test(dateString)) return false;

    const [day, month, year] = dateString.split('/').map(Number);
    const date = new Date(year, month - 1, day);

    // Allow years from 1900 to 2299
    if (year < 1900 || year > 2299) {
        return false;
    }

    // Check for impossible dates like 31/02/2025
    return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day;
}


// Email Validation
export function validateEmail(email) {
    const regex = /\S+@\S+\.\S+/;
    return regex.test(email);
}

// Event Utilities
export function isEventPast(event) {
    if (!event || typeof event.date !== 'string' || typeof event.time !== 'string') {
        console.warn("isEventPast: dati evento non validi", event);
        return false;
    }
    try {
        const eventDateTime = new Date(event.date + 'T' + event.time);
        if (isNaN(eventDateTime.getTime())) {
            console.warn("isEventPast: data/ora non valida", event.date, event.time);
            return false;
        }
        const now = new Date();
        return eventDateTime < now;
    } catch (e) {
        console.error("isEventPast: errore nel parsing data/ora", e, event);
        return false;
    }
}

export function sortEventsByDate(eventsList) {
    return eventsList.sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        if (isNaN(dateA.getTime())) return 1;
        if (isNaN(dateB.getTime())) return -1;
        return dateA - dateB;
    });
}

// Participant Validation
export function validateParticipant(entry) {
    const missingFields = [];
    const fields = [
        { selector: '.participant-surname', name: 'Cognome' },
        { selector: '.participant-name', name: 'Nome' },
        { selector: '.participant-birthdate', name: 'Data di nascita', isDate: true },
        { selector: '.participant-birthplace', name: 'Luogo di nascita' },
        { selector: '.participant-birth-province', name: 'Provincia di nascita' },
        { selector: '.participant-residence-place', name: 'Luogo di residenza' },
        { selector: '.participant-residence-province', name: 'Provincia di residenza' },
        { selector: '.participant-email', name: 'Email', isEmail: true },
        { selector: '.participant-phone', name: 'Telefono', isPhone: true }
    ];

    fields.forEach(field => {
        const input = entry.querySelector(field.selector);
        if (!input || !input.value.trim()) {
            missingFields.push(field.name);
        } else if (field.isDate && !validateDate(input.value.trim())) {
            missingFields.push(field.name + " (formato non valido, usare GG/MM/AAAA)");
        } else if (field.isEmail && !validateEmail(input.value.trim())) {
            missingFields.push(field.name + " (formato non valido)");
        } else if (field.isPhone && input.value.trim().length !== 10) {
            missingFields.push(field.name + " (deve essere di 10 cifre)");
        }
    });

    const romacardSi = entry.querySelector('.participant-romacard-si');
    const romacardNo = entry.querySelector('.participant-romacard-no');
    if (!romacardSi || !romacardNo || (!romacardSi.checked && !romacardNo.checked)) {
        missingFields.push('AS Roma Card');
    }

    if (romacardSi && romacardSi.checked) {
        const romaCardNumberInput = entry.querySelector('.participant-romacard-number');
        if (!romaCardNumberInput || !romaCardNumberInput.value.trim()) {
            missingFields.push('Numero AS Roma Card');
        } else if (romaCardNumberInput.value.trim().length !== 12) {
            missingFields.push('Numero AS Roma Card (deve essere di 12 cifre)');
        }
    }

    return missingFields;
}

// Extract participant data from form entry
export function extractParticipantData(entry, bookingType) {
    return {
        name: entry.querySelector('.participant-name').value.trim(),
        surname: entry.querySelector('.participant-surname').value.trim(),
        phone: entry.querySelector('.participant-phone').value.trim(),
        birthplace: entry.querySelector('.participant-birthplace').value.trim(),
        birthdate: entry.querySelector('.participant-birthdate').value.trim(),
        birthProvince: entry.querySelector('.participant-birth-province').value,
        residencePlace: entry.querySelector('.participant-residence-place').value.trim(),
        residenceProvince: entry.querySelector('.participant-residence-province').value,
        email: entry.querySelector('.participant-email').value.trim(),
        romaCard: entry.querySelector('.participant-romacard-si').checked,
        romaCardNumber: entry.querySelector('.participant-romacard-si').checked
            ? entry.querySelector('.participant-romacard-number').value.trim()
            : '',
        bookingType
    };
}

// Auto-format birthdate input (DD/MM/YYYY)
export function formatBirthdateInput(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length > 2) value = value.slice(0, 2) + '/' + value.slice(2);
    if (value.length > 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
    e.target.value = value.slice(0, 10);
}