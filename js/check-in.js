let activeBooking = null;
let pendingCheckIn = { bags: 0, seat: '14C' };

function setActiveStep(step) {
    document.querySelectorAll('.checkin-step').forEach((el) => {
        el.classList.toggle('active', el.dataset.step === String(step));
    });
}

function showSection(sectionId) {
    ['stepLookup', 'stepDetails', 'stepConfirm', 'stepDone'].forEach((id) => {
        document.getElementById(id).classList.toggle('hidden', id !== sectionId);
    });
}

function showCheckinError(message) {
    const el = document.getElementById('checkinLookupError');
    el.textContent = message;
    el.classList.remove('hidden');
}

function hideCheckinError() {
    document.getElementById('checkinLookupError').classList.add('hidden');
}

function renderFlightSummary(booking, extraHtml) {
    const withFlight = attachFlightDetails(booking);
    const flight = withFlight.flight;
    if (!flight) {
        return `<p>Booking ${booking.bookingId}</p>${extraHtml || ''}`;
    }
    return `
        <p class="booking-ref">Reference: <strong>${booking.bookingId}</strong></p>
        <h2 class="booking-route">${flight.title}</h2>
        <p class="flight-location">${flight.location} · ${flight.flightNumber}</p>
        <p class="booking-passenger">${booking.passengerFirstName} ${booking.passengerLastName}</p>
        ${extraHtml || ''}
    `;
}

function startCheckInFlow(booking) {
    activeBooking = booking;
    setAmplitudeBookingGroup(booking);
    trackCheckInEvent('Check-in Started', booking, { source: 'check_in_page' });

    if (booking.checkedIn) {
        showSection('stepDone');
        setActiveStep(3);
        document.getElementById('boardingPassContent').innerHTML = renderFlightSummary(booking, `
            <p class="booking-status">Already checked in · Seat ${booking.seat}</p>
        `);
        trackCheckInEvent('Check-in Viewed Boarding Pass', booking, { already_checked_in: true });
        return;
    }

    document.getElementById('flightSummary').innerHTML = renderFlightSummary(booking);
    showSection('stepDetails');
    setActiveStep(2);
}

document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const prefillId = params.get('booking');
    const prefillLast = params.get('lastName');
    if (prefillId) {
        document.getElementById('checkinBookingId').value = prefillId;
    }
    if (prefillLast) {
        document.getElementById('checkinLastName').value = prefillLast;
    }

    document.getElementById('checkinLookupForm').addEventListener('submit', function (e) {
        e.preventDefault();
        hideCheckinError();
        const bookingId = document.getElementById('checkinBookingId').value;
        const lastName = document.getElementById('checkinLastName').value;

        trackBookingLookupAttempt(bookingId, 'check_in_page');
        const result = lookupBooking(bookingId, lastName);
        trackBookingLookupResult(bookingId, result, 'check_in_page');

        if (!result.ok) {
            if (result.error === 'name_mismatch') {
                showCheckinError('Last name does not match this booking.');
            } else {
                showCheckinError('Booking not found. You can retrieve it from My booking first.');
            }
            return;
        }

        startCheckInFlow(result.booking);
    });

    document.getElementById('backToLookup').addEventListener('click', function () {
        activeBooking = null;
        showSection('stepLookup');
        setActiveStep(1);
    });

    document.getElementById('checkinDetailsForm').addEventListener('submit', function (e) {
        e.preventDefault();
        if (!activeBooking) {
            return;
        }
        pendingCheckIn = {
            bags: document.getElementById('bagCount').value,
            seat: document.getElementById('seatChoice').value,
        };
        trackCheckInEvent('Check-in Details Submitted', activeBooking, {
            bags: Number(pendingCheckIn.bags),
            seat: pendingCheckIn.seat,
        });

        document.getElementById('confirmSummary').innerHTML = renderFlightSummary(activeBooking, `
            <p class="booking-status">Bags: ${pendingCheckIn.bags} · Seat: ${pendingCheckIn.seat}</p>
        `);
        showSection('stepConfirm');
        setActiveStep(3);
    });

    document.getElementById('completeCheckIn').addEventListener('click', function () {
        if (!activeBooking) {
            return;
        }
        const outcome = completeCheckIn(activeBooking.bookingId, pendingCheckIn);
        if (!outcome.ok) {
            alert(outcome.error === 'already_checked_in'
                ? 'This booking is already checked in.'
                : 'Could not complete check-in.');
            return;
        }
        activeBooking = outcome.booking;
        trackCheckInEvent('Check-in Completed', activeBooking, {
            bags: activeBooking.bags,
            seat: activeBooking.seat,
        });

        document.getElementById('boardingPassContent').innerHTML = renderFlightSummary(activeBooking, `
            <p class="booking-status">Seat <strong>${activeBooking.seat}</strong> · ${activeBooking.bags} checked bag(s)</p>
            <p class="section-lead">Show this screen at the gate. Have a great flight.</p>
        `);
        showSection('stepDone');
    });

    if (prefillId && prefillLast) {
        document.getElementById('checkinLookupForm').requestSubmit();
    }
});
