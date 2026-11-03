function renderBookingCard(booking) {
    const withFlight = attachFlightDetails(booking);
    const flight = withFlight.flight;
    const checkInLabel = booking.checkedIn
        ? `Checked in · Seat ${booking.seat || '—'}`
        : 'Not checked in yet';

    return `
        <div class="booking-card">
            <p class="booking-ref">Reference: <strong>${booking.bookingId}</strong></p>
            <p class="booking-passenger">${booking.passengerFirstName} ${booking.passengerLastName}</p>
            <p class="booking-status">${checkInLabel}</p>
            ${flight ? `
                <h2 class="booking-route">${flight.title}</h2>
                <p class="flight-location">${flight.location} · ${flight.flightNumber} · ${flight.type}</p>
                <p class="flight-features">${flight.sqft} · ${flight.schedule}</p>
            ` : '<p class="flight-location">Flight details unavailable</p>'}
            <div class="form-actions">
                <a class="btn" href="check-in.html?booking=${encodeURIComponent(booking.bookingId)}&lastName=${encodeURIComponent(booking.passengerLastName)}">Check in</a>
                <a class="btn-secondary" href="index.html">Book another flight</a>
            </div>
        </div>
    `;
}

function showRetrieveError(message) {
    const el = document.getElementById('retrieveError');
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideRetrieveError() {
    document.getElementById('retrieveError').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const prefillId = params.get('booking');
    const prefillLast = params.get('lastName');
    if (prefillId) {
        document.getElementById('bookingId').value = prefillId;
    }
    if (prefillLast) {
        document.getElementById('lastName').value = prefillLast;
    }

    document.getElementById('retrieveForm').addEventListener('submit', function (e) {
        e.preventDefault();
        hideRetrieveError();
        const bookingId = document.getElementById('bookingId').value;
        const lastName = document.getElementById('lastName').value;

        trackBookingLookupAttempt(bookingId, 'retrieve_page');
        const result = lookupBooking(bookingId, lastName);
        trackBookingLookupResult(bookingId, result, 'retrieve_page');

        const resultEl = document.getElementById('bookingResult');
        if (!result.ok) {
            resultEl.classList.add('hidden');
            if (result.error === 'name_mismatch') {
                showRetrieveError('Last name does not match this booking. Please try again.');
            } else {
                showRetrieveError('We could not find that booking reference. Check the code and try again.');
            }
            return;
        }

        resultEl.innerHTML = renderBookingCard(result.booking);
        resultEl.classList.remove('hidden');
    });
});
