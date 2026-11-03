
/**
 * Format a fare for display. Amplitude receives numeric $price/$revenue + ISO $currency
 * (see https://amplitude.com/docs/data/currency-conversion).
 */
function formatFlightPrice(amount, currency) {
    return new Intl.NumberFormat('en', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
}

// Flight data — each route priced in a local ISO 4217 currency for Amplitude conversion
const propertyData = {
    1: {
        title: "New York → London",
        priceAmount: 349,
        currency: "USD",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "JFK → LHR",
        type: "Economy",
        beds: 0,
        baths: 7,
        sqft: "7h 15m",
        schedule: "Morning departure",
        flightNumber: "NS 214",
        description: "Morning nonstop to London Heathrow. Soft leather seats, complimentary snacks, and free seat selection within your cabin.",
        features: ["Nonstop", "Wi‑Fi available", "USB power", "Extra legroom option", "Free carry-on"]
    },
    2: {
        title: "Chicago → Madrid",
        priceAmount: 265,
        currency: "EUR",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "ORD → MAD",
        type: "Economy",
        beds: 1,
        baths: 11,
        sqft: "11h 40m",
        schedule: "Afternoon",
        flightNumber: "NS 508",
        description: "One convenient connection into Madrid. Ideal for city breaks with solid fare value across the Atlantic.",
        features: ["1 stop", "Checked bag option", "Mobile boarding pass", "Seat map available", "Onboard entertainment"]
    },
    3: {
        title: "Los Angeles → Tokyo",
        priceAmount: 132000,
        currency: "JPY",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "LAX → HND",
        type: "Business",
        beds: 0,
        baths: 11,
        sqft: "11h 05m",
        schedule: "Overnight",
        flightNumber: "NS 71",
        description: "Lie-flat Business overnight to Haneda. Priority check-in, lounge access, and a multi-course meal service.",
        features: ["Lie-flat seat", "Lounge access", "Priority boarding", "Premium dining", "Amenity kit"]
    },
    4: {
        title: "Boston → Dublin",
        priceAmount: 320,
        currency: "GBP",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "BOS → DUB",
        type: "Economy",
        beds: 0,
        baths: 6,
        sqft: "6h 20m",
        schedule: "Evening",
        flightNumber: "NS 336",
        description: "Evening nonstop into Dublin — arrive ready for the day. Popular with weekend travelers and visiting friends.",
        features: ["Nonstop", "Evening departure", "Free carry-on", "Snack service", "USB power"]
    },
    5: {
        title: "Miami → Lisbon",
        priceAmount: 185,
        currency: "EUR",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "MIA → LIS",
        type: "Economy",
        beds: 2,
        baths: 14,
        sqft: "14h 10m",
        schedule: "Redeye",
        flightNumber: "NS 902",
        description: "Our lowest fare to Lisbon via two short connections. Perfect when price matters more than speed.",
        features: ["2 stops", "Budget fare", "Mobile boarding pass", "Carry-on included", "Flexible date change (fee)"]
    },
    6: {
        title: "San Francisco → Singapore",
        priceAmount: 1680,
        currency: "SGD",
        get price() { return formatFlightPrice(this.priceAmount, this.currency); },
        location: "SFO → SIN",
        type: "First",
        beds: 0,
        baths: 16,
        sqft: "16h 45m",
        schedule: "Flagship suite",
        flightNumber: "NS 1",
        description: "Flagship First Suite nonstop to Singapore. Private suite doors, chef-curated dining, and dedicated cabin crew.",
        features: ["Private suite", "Chef dining", "Chauffeur transfer", "Spa amenity kit", "Priority everything"]
    }
};

function stopsLabel(stops) {
    if (stops === 0) return 'Nonstop';
    if (stops === 1) return '1 stop';
    return `${stops} stops`;
}

function renderFlightCards() {
    const grid = document.getElementById('propertyGrid');
    if (!grid) return;

    grid.innerHTML = Object.keys(propertyData).map((id) => {
        const flight = propertyData[id];
        const cabinClass = flight.type.toLowerCase();
        return `
            <div class="flight-card" data-price="${flight.priceAmount}" data-bedrooms="${flight.beds}" data-type="${cabinClass}" data-currency="${flight.currency}"
                onclick="ClickFeatureProperty(${id})">
                <div class="flight-route-visual ${cabinClass}"></div>
                <div class="flight-info">
                    <div class="flight-type">${flight.type}</div>
                    <div class="fare-block">
                        <div class="flight-price">${flight.price}</div>
                        <span class="currency-chip">${flight.currency}</span>
                    </div>
                    <p class="fare-meta">${flight.priceAmount.toLocaleString('en')} ${flight.currency} local fare</p>
                    <h3 class="flight-title">${flight.title}</h3>
                    <p class="flight-location">${flight.location} · ${stopsLabel(flight.beds)}</p>
                    <p class="flight-features">${flight.sqft} · ${flight.schedule} · ${flight.flightNumber}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Login Management Functions (GLOBAL SCOPE)
function openLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    clearLoginError();
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

function clearLoginError() {
    const errorDiv = document.getElementById('loginError');
    errorDiv.classList.remove('show');
}

// Travel partner data for account-level reporting (Amplitude group IDs unchanged)
const estateAgents = {
    'premium-properties': 'Skyline Travel Group',
    'downtown-realty': 'Metro Booking Co.',
    'riverside-homes': 'Harbor Voyages',
    'luxury-estates': 'Summit Concierge Air'
};

/** Plan type for Amplitude user property `plan_type` (persisted in localStorage). */
const PLAN_FREE = 'free';
const PLAN_FREE_TRIAL = 'free trial';
const PLAN_PREMIUM = 'premium';

function getPlanType() {
    return localStorage.getItem('planType') || PLAN_FREE;
}

function setPlanType(value) {
    localStorage.setItem('planType', value);
    const user = getCurrentUser();
    if (user) {
        user.planType = value;
        localStorage.setItem('userSession', JSON.stringify(user));
    }
}

function login(name, userId, password, estateAgentId) {
    
    // Store user session with travel partner information
    const userSession = {
        name: name.trim(),
        userId: userId.trim(),
        password: password, // In real app, never store passwords!
        estateAgentId: estateAgentId,
        estateAgentName: estateAgents[estateAgentId] || estateAgentId,
        loginTime: new Date().toISOString(),
        sessionId: 'session_' + Date.now(),
        planType: getPlanType()
    };
    
    localStorage.setItem('userSession', JSON.stringify(userSession));
    
    // Use Amplitude identify to set user identity and properties
    if (typeof amplitude !== 'undefined') {
        // Set the user ID
        amplitude.setUserId(userId.trim());
        
        // Set user properties (plan_type: identify before any events so charts reflect the right segment)
        const userObj = new amplitude.Identify();
        userObj.set('userName', name.trim());
        userObj.set('loginMethod', 'form');
        userObj.set('plan_type', getPlanType());
        amplitude.identify(userObj);
        
        // Set user to company group for account-level reporting (using "company" as group type)
        amplitude.setGroup('company', estateAgentId);
        
        // Set group properties for the travel partner company
        const groupObj = new amplitude.Identify();
        groupObj.set('name', estateAgents[estateAgentId] || estateAgentId);
        groupObj.set('companyId', estateAgentId);
        groupObj.set('industry', 'Airlines');
        groupObj.set('type', 'Travel Partner');
        amplitude.groupIdentify('company', estateAgentId, groupObj);
        
        // Send login event
        amplitude.track('User Logged In', {
            loginMethod: 'form'
        });
        
        console.log('=== AMPLITUDE DEBUG ===');
        console.log('User ID set:', userId.trim());
        console.log('User properties set:', { userName: name.trim(), loginMethod: 'form' });
        console.log('Group assignment - Type: company, ID:', estateAgentId);
        console.log('Group properties set:', { 
            name: estateAgents[estateAgentId], 
            companyId: estateAgentId, 
            industry: 'Airlines',
            type: 'Travel Partner' 
        });
        console.log('=== END AMPLITUDE DEBUG ===');
    }
    
    console.log('User logged in:', userSession);
    updateUserDisplay();
    return true;
}

function logout() {
    const user = getCurrentUser();
    
    // Clear session
    localStorage.removeItem('userSession');
    
    // Hide user display
    const userStatus = document.getElementById('userStatus');
    if (userStatus) {
        userStatus.classList.add('hidden');
    }
    
    console.log('User logged out');
    alert('You have been logged out successfully!');
}

function getCurrentUser() {
    const sessionData = localStorage.getItem('userSession');
    return sessionData ? JSON.parse(sessionData) : null;
}

function updateUserDisplay() {
    const user = getCurrentUser();
    const userStatus = document.getElementById('userStatus');
    const userWelcome = document.getElementById('userWelcome');
    const estateAgentDisplay = document.getElementById('estateAgentDisplay');
    const planLabel = document.getElementById('planLabel');
    const subscribeBtn = document.getElementById('subscribeBtn');
    const upgradePremiumBtn = document.getElementById('upgradePremiumBtn');
    const subscribeNavItem = document.getElementById('subscribeNavItem');
    const premiumNavItem = document.getElementById('premiumNavItem');

    const plan = getPlanType();

    if (planLabel) {
        if (plan === PLAN_PREMIUM) {
            planLabel.textContent = 'Plan: Premium';
        } else if (plan === PLAN_FREE_TRIAL) {
            planLabel.textContent = `Plan: ${PLAN_FREE_TRIAL}`;
        } else {
            planLabel.textContent = `Plan: ${PLAN_FREE}`;
        }
    }
    if (subscribeBtn) {
        subscribeBtn.style.display = plan === PLAN_FREE ? 'inline-block' : 'none';
    }
    if (upgradePremiumBtn) {
        upgradePremiumBtn.style.display = plan === PLAN_FREE_TRIAL ? 'inline-block' : 'none';
    }
    if (subscribeNavItem) {
        subscribeNavItem.style.display = plan === PLAN_FREE ? 'list-item' : 'none';
    }
    if (premiumNavItem) {
        premiumNavItem.style.display = plan === PLAN_FREE_TRIAL ? 'list-item' : 'none';
    }

    if (user && userStatus && userWelcome && estateAgentDisplay) {
        estateAgentDisplay.textContent = `Account: ${user.estateAgentName}`;
        userWelcome.textContent = `Welcome, ${user.name}`;
        userStatus.classList.remove('hidden');
    }
}

/**
 * Upgrade plan to free trial: Identify first (recommended), then log the event.
 * The new plan_type applies to this event and all subsequent events until changed again.
 */
function startFreeTrial() {
    if (getPlanType() === PLAN_PREMIUM) {
        alert('You already have Premium.');
        return;
    }
    if (getPlanType() === PLAN_FREE_TRIAL) {
        alert('You are already on a free trial.');
        return;
    }

    if (typeof amplitude !== 'undefined') {
        const identify = new amplitude.Identify().set('plan_type', PLAN_FREE_TRIAL);
        amplitude.identify(identify);

        amplitude.track('Start Free Trial', {
            source: 'pricing_page',
        });
    }

    setPlanType(PLAN_FREE_TRIAL);
    updateUserDisplay();
    alert('You are now on a free trial. Enjoy full access!');
}

/**
 * Upgrade from free trial to premium: Identify first, then log the event.
 */
function upgradeToPremium() {
    if (getPlanType() === PLAN_PREMIUM) {
        alert('You already have Premium.');
        return;
    }
    if (getPlanType() !== PLAN_FREE_TRIAL) {
        alert('Upgrade to Premium is available during your free trial.');
        return;
    }

    if (typeof amplitude !== 'undefined') {
        const identify = new amplitude.Identify().set('plan_type', PLAN_PREMIUM);
        amplitude.identify(identify);

        amplitude.track('Upgrade to Premium', {
            source: 'pricing_page',
            previous_plan: PLAN_FREE_TRIAL,
        });
    }

    setPlanType(PLAN_PREMIUM);
    updateUserDisplay();
    alert('Welcome to Premium! You now have full access.');
}

function getUserInfo() {
    return getCurrentUser();
}

// Custom Amplitude Event Function
function ClickFeatureProperty(propertyId) {
    const property = propertyData[propertyId];
    
    // Send custom event to Amplitude using Browser SDK 2
    if (typeof amplitude !== 'undefined') {
        amplitude.track('Clicked Featured Flight', {
            propertyId: propertyId,
            propertyTitle: property.title,
            propertyPrice: property.price,
            propertyType: property.type,
            propertyLocation: property.location,
            propertyBedrooms: property.beds,
            propertyBathrooms: property.baths,
            propertySqft: property.sqft,
            $price: property.priceAmount,
            $currency: property.currency,
            pageSection: 'featured_flights',
            action: 'click',
            elementType: 'flight_card'
        });
        
        console.log('Amplitude Clicked Featured Flight event sent for flight:', propertyId);
    } else {
        console.log('Amplitude not loaded - Clicked Featured Flight event for flight:', propertyId);
    }
    
    // Continue with existing functionality
    openPropertyModal(propertyId);
}

// Filter functions
function applyFilters() {
    const priceFilter = document.getElementById('priceFilter').value;
    const bedroomFilter = document.getElementById('bedroomFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;
    
    const propertyCards = document.querySelectorAll('.flight-card');
    let visibleCount = 0;
    
    propertyCards.forEach(card => {
        let show = true;
        
        // Price / fare filter
        if (priceFilter) {
            const price = parseInt(card.dataset.price);
            const [min, max] = priceFilter.split('-').map(p => parseInt(p));
            if (max) {
                show = show && (price >= min && price <= max);
            } else {
                show = show && (price >= min);
            }
        }
        
        // Stops filter (dataset key kept as bedrooms for Amplitude parity)
        if (bedroomFilter) {
            const bedrooms = parseInt(card.dataset.bedrooms);
            show = show && (bedrooms >= parseInt(bedroomFilter));
        }
        
        // Cabin / type filter
        if (typeFilter) {
            show = show && (card.dataset.type === typeFilter);
        }
        
        if (show) {
            card.classList.remove('hidden');
            visibleCount++;
        } else {
            card.classList.add('hidden');
        }
    });
    
    // Show/hide no results message
    const noResults = document.getElementById('noResults');
    if (visibleCount === 0) {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
    
    // Track FilterApplied event with only 4 properties
    if (typeof amplitude !== 'undefined') {
        const filterEventData = {};
        
        // Add propertyTypeSelected if type filter is applied
        if (typeFilter) {
            filterEventData.propertyTypeSelected = typeFilter;
        }
        
        // Add bedroomCountSelected if bedroom filter is applied
        if (bedroomFilter) {
            filterEventData.bedroomCountSelected = parseInt(bedroomFilter);
        }
        
        // Add priceMin and priceMax if price filter is applied
        if (priceFilter) {
            if (priceFilter.includes('-')) {
                const [min, max] = priceFilter.split('-');
                filterEventData.priceMin = parseInt(min);
                filterEventData.priceMax = parseInt(max);
            } else {
                // For "500000-999999" case where it's "500000+"
                filterEventData.priceMin = parseInt(priceFilter);
            }
        }
        
        // Only send event if at least one filter is applied
        if (Object.keys(filterEventData).length > 0) {
            amplitude.track('Apply Flight Filters', filterEventData);
            console.log('Amplitude Apply Flight Filters event sent:', filterEventData);
        }
    } else {
        console.log('Amplitude not loaded - Apply Flight Filters event skipped');
    }
}

function clearFilters() {
    document.getElementById('priceFilter').value = '';
    document.getElementById('bedroomFilter').value = '';
    document.getElementById('typeFilter').value = '';
    
    const propertyCards = document.querySelectorAll('.flight-card');
    propertyCards.forEach(card => {
        card.classList.remove('hidden');
    });
    
    document.getElementById('noResults').style.display = 'none';
}

// Modal functions
function openPropertyModal(propertyId) {
    const property = propertyData[propertyId];
    const modal = document.getElementById('propertyModal');
    const modalContent = document.getElementById('modalContent');
    
    modalContent.innerHTML = `
        <h2>${property.title}</h2>
        <div class="modal-fare">
            <div class="fare-block">
                <div class="flight-price">${property.price}</div>
                <span class="currency-chip">${property.currency}</span>
            </div>
            <div class="modal-fare-meta">
                <span class="flight-type">${property.type}</span>
                <p class="fare-meta">${property.priceAmount.toLocaleString('en')} ${property.currency} · charged in local currency</p>
            </div>
        </div>
        <p class="flight-location">${property.location} · ${stopsLabel(property.beds)}</p>
        <div class="modal-meta-row">
            <span>${property.sqft}</span>
            <span>${property.schedule}</span>
            <span>${property.flightNumber}</span>
        </div>
        <h3 class="modal-section-title">Flight details</h3>
        <p class="modal-description">${property.description}</p>
        <h3 class="modal-section-title">Included</h3>
        <ul class="modal-features">
            ${property.features.map(feature => `<li>${feature}</li>`).join('')}
        </ul>
        <div class="modal-actions">
            <button class="btn" onclick="buyFlight(${propertyId})">Buy Flight · ${property.price}</button>
            <button class="btn-secondary" onclick="scheduleViewing('${property.title.replace(/'/g, "\\'")}',${propertyId})">Hold Seat</button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

/**
 * Purchase a flight. Sends Amplitude revenue fields for currency conversion:
 * $currency (ISO 4217) + $price + $revenue
 * https://amplitude.com/docs/data/currency-conversion
 */
function passengerFromUser(user) {
    if (!user || !user.name) {
        return { firstName: 'Guest', lastName: 'Traveler' };
    }
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0], lastName: parts[0] };
    }
    return {
        firstName: parts[0],
        lastName: parts.slice(1).join(' '),
    };
}

function buyFlight(propertyId) {
    const property = propertyData[propertyId];
    const user = getCurrentUser();
    const passenger = passengerFromUser(user);

    let booking = null;
    if (typeof createBookingFromFlight === 'function') {
        booking = createBookingFromFlight(propertyId, passenger, user);
    }

    let bookingMsg = '';
    if (booking) {
        bookingMsg =
            `\n\nBooking reference: ${booking.bookingId}` +
            `\nPassenger: ${booking.passengerFirstName} ${booking.passengerLastName}` +
            '\n\nAnyone with this reference can retrieve or check in (demo: book as User A, check in as User B).';
    } else if (typeof createBookingFromFlight === 'function') {
        bookingMsg = '\n\nWarning: booking could not be saved in this browser (storage blocked). Demo bookings NS-DEMO01 still work.';
    }
    alert(`Purchase confirmed for "${property.title}" — ${property.price} (${property.currency}).${bookingMsg}`);

    if (typeof amplitude !== 'undefined') {
        const eventProps = {
            $price: property.priceAmount,
            $revenue: property.priceAmount,
            $currency: property.currency,
            propertyId: propertyId,
            propertyTitle: property.title,
            propertyPrice: property.price,
            propertyType: property.type,
            propertyLocation: property.location,
            propertyBedrooms: property.beds,
            propertyBathrooms: property.baths,
            propertySqft: property.sqft,
        };

        if (booking && typeof trackBuyFlightWithBooking === 'function') {
            trackBuyFlightWithBooking(booking, eventProps);
        } else {
            amplitude.track('Buy Flight', eventProps);
        }

        console.log('Amplitude Buy Flight event sent:', {
            flightId: propertyId,
            booking_reference: booking && booking.bookingId,
            $price: property.priceAmount,
            $revenue: property.priceAmount,
            $currency: property.currency,
        });
    } else {
        console.log('Amplitude not loaded - Buy Flight event for flight:', propertyId);
    }
    closePropertyModal();
}

// Keep legacy name for any older callers
function contactAboutProperty(_propertyTitle, propertyId) {
    buyFlight(propertyId);
}

function scheduleViewing(propertyTitle, propertyId) {
    alert(`Seat held for "${propertyTitle}"! We'll email you to confirm within 15 minutes.`);

    const property = propertyData[propertyId];
    
    // Send custom event to Amplitude using Browser SDK 2
    if (typeof amplitude !== 'undefined') {
        amplitude.track('Hold Seat', {
            propertyId: propertyId,
            propertyTitle: property.title,
            propertyPrice: property.price,
            propertyType: property.type,
            propertyLocation: property.location,
            propertyBedrooms: property.beds,
            propertyBathrooms: property.baths,
            propertySqft: property.sqft
      
        });
        
        console.log('Amplitude Hold Seat event sent for flight:', propertyId);
    } else {
        console.log('Amplitude not loaded - Hold Seat event for flight:', propertyId);
    }
    closePropertyModal();
}

// DOM Content Loaded Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    renderFlightCards();

    // Check for existing user session and display if found
    updateUserDisplay();
    
    // Handle login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const estateAgentId = document.getElementById('estateAgent').value;
            const name = document.getElementById('loginName').value;
            const userId = document.getElementById('loginUserId').value;
            const password = document.getElementById('loginPassword').value;
            
            if (!estateAgentId) {
                showLoginError('Please select a travel partner.');
                return;
            }
            
            if (login(name, userId, password, estateAgentId)) {
                closeLoginModal();
                this.reset();
                alert(`Welcome, ${name}! You are now logged in to ${estateAgents[estateAgentId]}.`);
            }
        });
    }
    
    // Handle contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            this.reset();
        });
    }
    
    // Close modal when clicking outside of it
    window.onclick = function(event) {
        const loginModal = document.getElementById('loginModal');
        const propertyModal = document.getElementById('propertyModal');
        
        if (event.target === loginModal) {
            closeLoginModal();
        }
        if (event.target === propertyModal) {
            closePropertyModal();
        }
    }
});
