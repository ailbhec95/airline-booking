/** Amplitude group type for booking-level (Accounts add-on) analytics */
const AMPLITUDE_BOOKING_GROUP = 'booking';

const DEMO_BOOKINGS = {
    'NS-DEMO01': {
        bookingId: 'NS-DEMO01',
        propertyId: 1,
        passengerLastName: 'Rivera',
        passengerFirstName: 'Alex',
        status: 'confirmed',
        checkedIn: false,
        createdAt: '2026-11-01T10:00:00.000Z',
    },
    'NS-DEMO02': {
        bookingId: 'NS-DEMO02',
        propertyId: 4,
        passengerLastName: 'Chen',
        passengerFirstName: 'Jordan',
        status: 'confirmed',
        checkedIn: true,
        checkedInAt: '2026-11-02T14:30:00.000Z',
        seat: '12A',
        bags: 1,
        createdAt: '2026-10-28T09:15:00.000Z',
    },
};

const BOOKINGS_STORAGE_KEY = 'northstarBookings';

function generateBookingId() {
    const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NS-${segment}`;
}

function getAllBookings() {
    try {
        const stored = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || '{}');
        return { ...DEMO_BOOKINGS, ...stored };
    } catch {
        return { ...DEMO_BOOKINGS };
    }
}

function saveBooking(booking) {
    const stored = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || '{}');
    stored[booking.bookingId] = booking;
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(stored));
}

function createBookingFromFlight(propertyId, passenger) {
    const bookingId = generateBookingId();
    const booking = {
        bookingId,
        propertyId: Number(propertyId),
        passengerFirstName: passenger.firstName || 'Guest',
        passengerLastName: passenger.lastName || 'Traveler',
        status: 'confirmed',
        checkedIn: false,
        createdAt: new Date().toISOString(),
    };
    saveBooking(booking);
    return booking;
}

function lookupBooking(bookingId, lastName) {
    const id = (bookingId || '').trim().toUpperCase();
    const booking = getAllBookings()[id];
    if (!booking) {
        return { ok: false, error: 'not_found' };
    }
    if (lastName) {
        const normalized = lastName.trim().toLowerCase();
        if (booking.passengerLastName.toLowerCase() !== normalized) {
            return { ok: false, error: 'name_mismatch' };
        }
    }
    return { ok: true, booking };
}

function attachFlightDetails(booking) {
    if (typeof propertyData === 'undefined' || !propertyData[booking.propertyId]) {
        return { ...booking, flight: null };
    }
    return { ...booking, flight: propertyData[booking.propertyId] };
}

function completeCheckIn(bookingId, options) {
    const id = bookingId.trim().toUpperCase();
    const all = getAllBookings();
    const booking = all[id];
    if (!booking) {
        return { ok: false, error: 'not_found' };
    }
    if (booking.checkedIn) {
        return { ok: false, error: 'already_checked_in', booking };
    }
    const updated = {
        ...booking,
        checkedIn: true,
        checkedInAt: new Date().toISOString(),
        seat: options.seat || '14C',
        bags: options.bags != null ? Number(options.bags) : 0,
    };
    saveBooking(updated);
    return { ok: true, booking: updated };
}

/**
 * Assign user to booking group and set group properties (Accounts add-on).
 * booking_reference is the canonical group property for the PNR / record locator.
 */
function setAmplitudeBookingGroup(booking) {
    if (typeof amplitude === 'undefined' || !booking) {
        return;
    }
    const bookingId = booking.bookingId;
    amplitude.setGroup(AMPLITUDE_BOOKING_GROUP, bookingId);

    const withFlight = attachFlightDetails(booking);
    const groupObj = new amplitude.Identify();
    groupObj.set('booking_reference', bookingId);
    groupObj.set('booking_status', booking.status);
    groupObj.set('checked_in', !!booking.checkedIn);
    if (withFlight.flight) {
        groupObj.set('route', withFlight.flight.title);
        groupObj.set('flight_number', withFlight.flight.flightNumber);
        groupObj.set('cabin', withFlight.flight.type);
    }
    amplitude.groupIdentify(AMPLITUDE_BOOKING_GROUP, bookingId, groupObj);
}

function trackBookingEvent(eventName, booking, extraProps) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    const withFlight = attachFlightDetails(booking);
    const props = {
        booking_reference: booking.bookingId,
        booking_id: booking.bookingId,
        checked_in: !!booking.checkedIn,
        ...extraProps,
    };
    if (withFlight.flight) {
        props.flight_id = String(booking.propertyId);
        props.route = withFlight.flight.title;
        props.flight_number = withFlight.flight.flightNumber;
    }
    amplitude.track(eventName, props);
}

function trackBookingLookupAttempt(bookingId, source) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    amplitude.track('Booking Lookup Started', {
        booking_reference: bookingId.trim().toUpperCase(),
        source: source || 'retrieve_page',
    });
}

function trackBookingLookupResult(bookingId, result, source) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    const id = bookingId.trim().toUpperCase();
    if (result.ok) {
        setAmplitudeBookingGroup(result.booking);
        trackBookingEvent('Booking Retrieved', result.booking, { source: source || 'retrieve_page' });
    } else {
        amplitude.track('Booking Lookup Failed', {
            booking_reference: id,
            failure_reason: result.error,
            source: source || 'retrieve_page',
        });
    }
}

function trackCheckInEvent(eventName, booking, extraProps) {
    if (booking) {
        setAmplitudeBookingGroup(booking);
    }
    trackBookingEvent(eventName, booking, extraProps);
}
