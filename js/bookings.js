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

function normalizeBookingId(raw) {
    return (raw || '').trim().toUpperCase();
}

function readStoredBookings() {
    try {
        const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
        if (!raw) {
            return {};
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return {};
        }
        const normalized = {};
        Object.keys(parsed).forEach((key) => {
            const entry = parsed[key];
            if (!entry || !entry.bookingId) {
                return;
            }
            const id = normalizeBookingId(entry.bookingId);
            normalized[id] = { ...entry, bookingId: id };
        });
        return normalized;
    } catch (err) {
        console.warn('Could not read booking storage, using empty store.', err);
        return {};
    }
}

function generateBookingId() {
    const segment = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NS-${segment}`;
}

function getAllBookings() {
    const stored = readStoredBookings();
    return { ...DEMO_BOOKINGS, ...stored };
}

function saveBooking(booking) {
    const id = normalizeBookingId(booking.bookingId);
    if (!id) {
        return false;
    }
    const record = { ...booking, bookingId: id };
    const stored = readStoredBookings();
    stored[id] = record;
    try {
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(stored));
        return true;
    } catch (err) {
        console.error('Could not save booking to localStorage.', err);
        return false;
    }
}

function createBookingFromFlight(propertyId, passenger, bookedBy) {
    const bookingId = generateBookingId();
    const booking = {
        bookingId,
        propertyId: Number(propertyId),
        passengerFirstName: passenger.firstName || 'Guest',
        passengerLastName: passenger.lastName || 'Traveler',
        bookedByUserId: bookedBy && bookedBy.userId ? bookedBy.userId : null,
        bookedByName: bookedBy && bookedBy.name ? bookedBy.name : null,
        status: 'confirmed',
        checkedIn: false,
        createdAt: new Date().toISOString(),
    };
    const saved = saveBooking(booking);
    if (!saved) {
        return null;
    }
    return booking;
}

function lookupBooking(bookingId, lastName) {
    const id = normalizeBookingId(bookingId);
    if (!id) {
        return { ok: false, error: 'not_found' };
    }
    const booking = getAllBookings()[id];
    if (!booking) {
        return { ok: false, error: 'not_found' };
    }
    const last = (lastName || '').trim();
    if (last) {
        const normalized = last.toLowerCase();
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
function bookingEventOptions(bookingId) {
    const id = normalizeBookingId(bookingId);
    if (!id) {
        return undefined;
    }
    return {
        groups: {
            [AMPLITUDE_BOOKING_GROUP]: id,
        },
    };
}

function setAmplitudeBookingGroupForId(bookingId) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    const id = normalizeBookingId(bookingId);
    if (!id) {
        return;
    }
    amplitude.setGroup(AMPLITUDE_BOOKING_GROUP, id);
}

function setAmplitudeBookingGroup(booking) {
    if (typeof amplitude === 'undefined' || !booking) {
        return;
    }
    const bookingId = normalizeBookingId(booking.bookingId);
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

function buildBookingEventProps(booking, extraProps) {
    const withFlight = attachFlightDetails(booking);
    const props = {
        booking_reference: booking.bookingId,
        checked_in: !!booking.checkedIn,
        ...extraProps,
    };
    if (withFlight.flight) {
        props.flight_id = String(booking.propertyId);
        props.route = withFlight.flight.title;
        props.flight_number = withFlight.flight.flightNumber;
    }
    return props;
}

function trackBookingEvent(eventName, booking, extraProps) {
    if (typeof amplitude === 'undefined' || !booking) {
        return;
    }
    setAmplitudeBookingGroup(booking);
    const props = buildBookingEventProps(booking, extraProps);
    amplitude.track(eventName, props, bookingEventOptions(booking.bookingId));
}

function trackBookingLookupAttempt(bookingId, source) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    const id = normalizeBookingId(bookingId);
    setAmplitudeBookingGroupForId(id);
    amplitude.track(
        'Booking Lookup Started',
        {
            booking_reference: id,
            source: source || 'retrieve_page',
        },
        bookingEventOptions(id)
    );
}

function trackBookingLookupResult(bookingId, result, source) {
    if (typeof amplitude === 'undefined') {
        return;
    }
    const id = normalizeBookingId(bookingId);
    if (result.ok) {
        trackBookingEvent('Booking Retrieved', result.booking, {
            source: source || 'retrieve_page',
        });
    } else {
        setAmplitudeBookingGroupForId(id);
        amplitude.track(
            'Booking Lookup Failed',
            {
                booking_reference: id,
                failure_reason: result.error,
                source: source || 'retrieve_page',
            },
            bookingEventOptions(id)
        );
    }
}

function trackCheckInEvent(eventName, booking, extraProps) {
    trackBookingEvent(eventName, booking, extraProps);
}

/** Set booking group before track so group-scoped analysis ties events across users. */
function trackBuyFlightWithBooking(booking, flightEventProps) {
    if (typeof amplitude === 'undefined' || !booking) {
        return;
    }
    setAmplitudeBookingGroup(booking);
    const base = buildBookingEventProps(booking, { source: 'buy_flight' });
    const buyProps = { ...flightEventProps, ...base };
    const options = bookingEventOptions(booking.bookingId);

    amplitude.track('Buy Flight', buyProps, options);
    amplitude.track(
        'Booking Created',
        buildBookingEventProps(booking, { source: 'buy_flight' }),
        options
    );
}
