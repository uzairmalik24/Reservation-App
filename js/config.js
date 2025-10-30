// js/config.js - Firebase & App Configuration

export const firebaseConfig = {
    apiKey: "AIzaSyC0Qlwy7c9orClYmYYayViaMTgTvjU_hZY",
    authDomain: "trasferte-cdlvi.firebaseapp.com",
    projectId: "trasferte-cdlvi",
    storageBucket: "trasferte-cdlvi.firebasestorage.app",
    messagingSenderId: "1038544385148",
    appId: "1:1038544385148:web:8905c0fb6c96de63ce45f9"
};

export const ADMIN_EMAIL = 'direttivo@romaclubcdlvi.it';

export const provinceItaliane = [
    "AG", "AL", "AN", "AO", "AR", "AP", "AT", "AV", "BA", "BT", "BL", "BN", "BG", "BI", "BO", "BZ", "BS", "BR", "CA", "CL", "CB", "CI",
    "CE", "CT", "CZ", "CH", "CO", "CS", "CR", "KR", "CN", "EN", "FM", "FE", "FI", "FG", "FC", "FR", "GE", "GO", "GR", "IM", "IS", "SP",
    "AQ", "LT", "LE", "LC", "LI", "LO", "LU", "MC", "MN", "MS", "MT", "ME", "MI", "MO", "MB", "NA", "NO", "NU", "OG", "OT", "OR", "PD",
    "PA", "PR", "PV", "PG", "PU", "PE", "PC", "PI", "PT", "PN", "PZ", "PO", "RG", "RA", "RC", "RE", "RI", "RN", "RM", "RO", "SA", "VS",
    "SS", "SV", "SI", "SR", "SO", "SU", "TA", "TE", "TR", "TO", "TP", "TN", "TV", "TS", "UD", "VA", "VE", "VB", "VC", "VR", "VV", "VI", "VT"
].sort();

export const COMPETITIONS = [
    "Campionato di Serie A",
    "Europa League",
    "Coppa Italia",
    "Champions League",
    "Conference League",
    "Amichevole"
];

export const BOOKING_TYPES = [
    "Solo Viaggio",
    "Solo Biglietto",
    "Biglietto + Viaggio"
];

export const MONTHS = [
    { value: "01", label: "Gennaio" },
    { value: "02", label: "Febbraio" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Aprile" },
    { value: "05", label: "Maggio" },
    { value: "06", label: "Giugno" },
    { value: "07", label: "Luglio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Settembre" },
    { value: "10", label: "Ottobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Dicembre" }
];