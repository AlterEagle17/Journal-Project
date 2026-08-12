// ============================================================================
// APPLICATION STATE
// ============================================================================

const APP_STATE = {
    currentUser: null,
    currentJournal: null,
    allTransactions: [],
    selectedDate: null,
    selectedTransactionType: null,
    currentMonth: new Date(),
    appScriptUrl: 'https://script.google.com/macros/s/AKfycbxfloFk7pDYDmEV4Ocigp-6pYlC9MMGe9qUvqZwQo2ISmplUuc57EjC9zdZ9gcWejm9Pg/exec'
};

// ============================================================================
// KOLKATA TIMEZONE
// ============================================================================

const KOLKATA_TIMEZONE = 'Asia/Kolkata';

function getKolkataDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: KOLKATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const result = {};

    parts.forEach(({ type, value }) => {
        if (type !== 'literal') {
            result[type] = value;
        }
    });

    return result;
}

function getKolkataDateString(date = new Date()) {
    const parts = getKolkataDateParts(date);

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function getTodayKolkataDateString() {
    return getKolkataDateString(new Date());
}

function isTodayKolkata(dateStr) {
    return dateStr === getTodayKolkataDateString();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    setDefaultDates();
    startKolkataClock();
    scheduleKolkataMidnightRefresh();
});

function setupEventListeners() {

    // Login
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function () {
            navigateToPage(this.dataset.page);
        });
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Create Journal
    const createJournalBtn = document.getElementById('createJournalBtn');

    if (createJournalBtn) {
        createJournalBtn.addEventListener(
            'click',
            openCreateJournalModal
        );
    }

    const closeCreateModal = document.getElementById('closeCreateModal');

    if (closeCreateModal) {
        closeCreateModal.addEventListener(
            'click',
            closeCreateJournalModal
        );
    }

    const cancelCreateModal = document.getElementById('cancelCreateModal');

    if (cancelCreateModal) {
        cancelCreateModal.addEventListener(
            'click',
            closeCreateJournalModal
        );
    }

    const createJournalForm =
        document.getElementById('createJournalForm');

    if (createJournalForm) {
        createJournalForm.addEventListener(
            'submit',
            handleCreateJournal
        );
    }

    // Calendar navigation
    const prevMonth = document.getElementById('prevMonth');

    if (prevMonth) {
        prevMonth.addEventListener('click', previousMonth);
    }

    const nextMonth = document.getElementById('nextMonth');

    if (nextMonth) {
        nextMonth.addEventListener('click', nextMonth);
    }

    // Quick Action - Profit
    const btnProfit = document.getElementById('btnProfit');

    if (btnProfit) {
        btnProfit.addEventListener('click', function () {
            selectTransactionType('PROFIT');
        });
    }

    // Quick Action - Loss
    const btnLoss = document.getElementById('btnLoss');

    if (btnLoss) {
        btnLoss.addEventListener('click', function () {
            selectTransactionType('LOSS');
        });
    }

    // Quick Action - Add Transaction
    const btnAddTransaction =
        document.getElementById('btnAddTransaction');

    if (btnAddTransaction) {
        btnAddTransaction.addEventListener(
            'click',
            handleAddTransaction
        );
    }

    // Modal close when clicking background
    const createJournalModal =
        document.getElementById('createJournalModal');

    if (createJournalModal) {
        createJournalModal.addEventListener('click', function (e) {
            if (e.target === this) {
                closeCreateJournalModal();
            }
        });
    }
}

// ============================================================================
// DEFAULT JOURNAL DATES
// ============================================================================

function setDefaultDates() {

    const today = getKolkataDateParts();

    const startDate =
        `${today.year}-${today.month}-${today.day}`;

    // Default journal duration: 30 days
    const nextDate = new Date(
        Date.UTC(
            Number(today.year),
            Number(today.month) - 1,
            Number(today.day) + 30
        )
    );

    const endDate = [
        nextDate.getUTCFullYear(),
        String(nextDate.getUTCMonth() + 1).padStart(2, '0'),
        String(nextDate.getUTCDate()).padStart(2, '0')
    ].join('-');

    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');

    if (startInput) {
        startInput.value = startDate;
    }

    if (endInput) {
        endInput.value = endDate;
    }
}

// ============================================================================
// KOLKATA DATE/TIME
// ============================================================================

function getKolkataLocalDate() {

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: KOLKATA_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(new Date());

    const dateParts = {};

    parts.forEach(({ type, value }) => {
        if (type !== 'literal') {
            dateParts[type] = value;
        }
    });

    return new Date(
        Date.UTC(
            Number(dateParts.year),
            Number(dateParts.month) - 1,
            Number(dateParts.day),
            Number(dateParts.hour),
            Number(dateParts.minute),
            Number(dateParts.second)
        )
    );
}

function formatKolkataCountdown(diffMs) {

    const totalSeconds =
        Math.max(0, Math.floor(diffMs / 1000));

    const hours =
        String(Math.floor(totalSeconds / 3600))
            .padStart(2, '0');

    const minutes =
        String(
            Math.floor((totalSeconds % 3600) / 60)
        ).padStart(2, '0');

    const seconds =
        String(totalSeconds % 60)
            .padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}

function getKolkataCountdownText() {

    const now = getKolkataLocalDate();

    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    const nextMidnight =
        new Date(
            Date.UTC(
                year,
                month,
                day + 1,
                0,
                0,
                0
            )
        );

    const diff =
        nextMidnight.getTime() - now.getTime();

    return `Day ends in ${formatKolkataCountdown(diff)}`;
}

function updateKolkataClock() {

    const now = new Date();

    const timeString =
        new Intl.DateTimeFormat('en-IN', {
            timeZone: KOLKATA_TIMEZONE,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(now);

    const dateString =
        new Intl.DateTimeFormat('en-IN', {
            timeZone: KOLKATA_TIMEZONE,
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(now);

    const desktopTimeEl =
        document.getElementById('kolkataClockTime');

    const desktopDateEl =
        document.getElementById('kolkataClockDate');

    const desktopCountdownEl =
        document.getElementById(
            'kolkataClockCountdown'
        );

    const mobileTimeEl =
        document.getElementById(
            'kolkataClockTimeMobile'
        );

    const mobileCountdownEl =
        document.getElementById(
            'kolkataClockCountdownMobile'
        );

    if (desktopTimeEl) {
        desktopTimeEl.textContent =
            `Kolkata • ${timeString}`;
    }

    if (desktopDateEl) {
        desktopDateEl.textContent =
            dateString;
    }

    if (desktopCountdownEl) {
        desktopCountdownEl.textContent =
            getKolkataCountdownText();
    }

    if (mobileTimeEl) {
        mobileTimeEl.textContent =
            `Kolkata • ${timeString}`;
    }

    if (mobileCountdownEl) {
        mobileCountdownEl.textContent =
            getKolkataCountdownText();
    }
}

function startKolkataClock() {

    updateKolkataClock();

    setInterval(
        updateKolkataClock,
        1000
    );
}

function getNextKolkataMidnight() {

    const now =
        getKolkataLocalDate();

    const year =
        now.getUTCFullYear();

    const month =
        now.getUTCMonth();

    const day =
        now.getUTCDate();

    return new Date(
        Date.UTC(
            year,
            month,
            day + 1,
            0,
            0,
            0
        )
    );
}

function scheduleKolkataMidnightRefresh() {

    const now =
        getKolkataLocalDate();

    const nextMidnight =
        getNextKolkataMidnight();

    const delay =
        Math.max(
            0,
            nextMidnight.getTime() -
            now.getTime()
        ) + 100;

    setTimeout(async function () {

        updateKolkataClock();

        if (
            APP_STATE.currentJournal &&
            document
                .getElementById('journalPage')
                ?.classList
                .contains('active')
        ) {
            await refreshJournalData();
        }

        scheduleKolkataMidnightRefresh();

    }, delay);
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

async function handleLogin(e) {

    e.preventDefault();

    const username =
        document.getElementById('username')
            .value
            .trim();

    const password =
        document.getElementById('password')
            .value;

    const errorEl =
        document.getElementById('loginError');

    errorEl.classList.remove('show');

    if (!username || !password) {
        showLoginError(
            'Please enter username and password'
        );
        return;
    }

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'login',
                        username: username,
                        password: password
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success' &&
            data.data &&
            data.data.authenticated
        ) {

            APP_STATE.currentUser =
                username;

            const usernameEl =
                document.getElementById(
                    'currentUsername'
                );

            if (usernameEl) {
                usernameEl.textContent =
                    username;
            }

            showApp();

            loadJournals();

        } else {

            showLoginError(
                data.data?.message ||
                'Login failed'
            );
        }

    } catch (error) {

        showLoginError(
            'Error: ' + error.message
        );
    }
}

function showLoginError(message) {

    const errorEl =
        document.getElementById(
            'loginError'
        );

    errorEl.textContent =
        message;

    errorEl.classList.add('show');
}

function handleLogout() {

    APP_STATE.currentUser = null;
    APP_STATE.currentJournal = null;
    APP_STATE.allTransactions = [];
    APP_STATE.selectedDate = null;

    const loginForm =
        document.getElementById(
            'loginForm'
        );

    if (loginForm) {
        loginForm.reset();
    }

    const loginError =
        document.getElementById(
            'loginError'
        );

    if (loginError) {
        loginError.classList.remove('show');
    }

    document.getElementById(
        'appContainer'
    ).style.display = 'none';

    document.getElementById(
        'loginPage'
    ).style.display = 'flex';

    navigateToPage('dashboard');
}

// ============================================================================
// NAVIGATION
// ============================================================================

function showApp() {

    document.getElementById(
        'loginPage'
    ).style.display = 'none';

    document.getElementById(
        'appContainer'
    ).style.display = 'flex';
}

function navigateToPage(page) {

    // Update navigation
    document
        .querySelectorAll('.nav-item')
        .forEach(item => {

            item.classList.remove('active');

            if (
                item.dataset.page === page
            ) {
                item.classList.add('active');
            }
        });

    // Hide all pages
    document
        .querySelectorAll('.page')
        .forEach(p => {
            p.classList.remove('active');
        });

    // Dashboard
    if (page === 'dashboard') {

        document
            .getElementById('dashboardPage')
            .classList
            .add('active');

        document
            .getElementById('pageTitle')
            .textContent = 'Dashboard';

        loadJournals();

    }

    // Journal
    else if (page === 'journal') {

        if (!APP_STATE.currentJournal) {

            alert(
                'Please select a journal first'
            );

            navigateToPage('dashboard');

            return;
        }

        document
            .getElementById('journalPage')
            .classList
            .add('active');

        document
            .getElementById('pageTitle')
            .textContent =
            APP_STATE.currentJournal.journalName;

        loadJournalDetails();
    }
}

// ============================================================================
// JOURNALS
// ============================================================================

async function loadJournals() {

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getJournals',
                        username:
                            APP_STATE.currentUser
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            displayJournals(
                data.data.journals
            );
        }

    } catch (error) {

        console.error(
            'Error loading journals:',
            error
        );
    }
}

function displayJournals(journals) {

    const container =
        document.getElementById(
            'journalsContainer'
        );

    if (!container) {
        return;
    }

    if (
        !journals ||
        journals.length === 0
    ) {

        container.innerHTML = `
            <div style="grid-column:1/-1;">
                <div class="empty-state">
                    <h2>No Journals Yet</h2>
                    <p>
                        Create a new journal to start
                        tracking your performance
                    </p>
                </div>
            </div>
        `;

        return;
    }

    container.innerHTML =
        journals.map(journal => `

            <div class="journal-card">

                <h3>
                    ${escapeHtml(
                        journal.journalName
                    )}
                </h3>

                <p>
                    Target:
                    ₹${parseFloat(
                        journal.targetAmount || 0
                    ).toLocaleString(
                        'en-IN',
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )}
                </p>

                <p>
                    Period:
                    ${formatDate(
                        journal.startDate
                    )}
                    to
                    ${formatDate(
                        journal.endDate
                    )}
                </p>

                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>

                <div class="card-actions">

                    <button
                        class="btn-small"
                        onclick="openJournal('${journal.journalId}')"
                    >
                        Open
                    </button>

                    <button
                        class="btn-small btn-delete"
                        onclick="deleteJournal('${journal.journalId}')"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `).join('');
}

// ============================================================================
// OPEN JOURNAL
// ============================================================================

async function openJournal(journalId) {

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        action:
                            'getJournalDetails',

                        journalId:
                            journalId,

                        username:
                            APP_STATE.currentUser
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            APP_STATE.currentJournal =
                data.data.journal;

            APP_STATE.allTransactions =
                data.data.transactions || [];

            APP_STATE.currentMonth =
                new Date(
                    data.data.journal.startDate
                );

            APP_STATE.selectedDate =
                null;

            navigateToPage('journal');
        }

    } catch (error) {

        console.error(
            'Error opening journal:',
            error
        );
    }
}

// ============================================================================
// DELETE JOURNAL
// ============================================================================

async function deleteJournal(journalId) {

    if (
        !confirm(
            'Are you sure you want to delete this journal?'
        )
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        action:
                            'deleteJournal',

                        journalId:
                            journalId,

                        username:
                            APP_STATE.currentUser
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            if (
                APP_STATE.currentJournal &&
                APP_STATE.currentJournal.journalId ===
                    journalId
            ) {
                APP_STATE.currentJournal =
                    null;

                APP_STATE.allTransactions =
                    [];

                APP_STATE.selectedDate =
                    null;
            }

            loadJournals();

        } else {

            alert(
                data.data?.message ||
                'Failed to delete journal'
            );
        }

    } catch (error) {

        console.error(
            'Error deleting journal:',
            error
        );

        alert(
            'Error deleting journal'
        );
    }
}

// ============================================================================
// CREATE JOURNAL MODAL
// ============================================================================

function openCreateJournalModal() {

    const modal =
        document.getElementById(
            'createJournalModal'
        );

    if (!modal) {
        return;
    }

    setDefaultDates();

    modal.classList.add('show');
}

function closeCreateJournalModal() {

    const modal =
        document.getElementById(
            'createJournalModal'
        );

    if (!modal) {
        return;
    }

    modal.classList.remove('show');
}

// ============================================================================
// CREATE JOURNAL
// ============================================================================

async function handleCreateJournal(e) {

    e.preventDefault();

    const journalName =
        document.getElementById(
            'journalName'
        ).value.trim();

    const targetAmount =
        parseFloat(
            document.getElementById(
                'targetAmount'
            ).value
        );

    const startDate =
        document.getElementById(
            'startDate'
        ).value;

    const endDate =
        document.getElementById(
            'endDate'
        ).value;

    if (!journalName) {

        alert(
            'Please enter a journal name'
        );

        return;
    }

    if (
        !Number.isFinite(targetAmount) ||
        targetAmount <= 0
    ) {

        alert(
            'Target amount must be greater than 0'
        );

        return;
    }

    if (!startDate || !endDate) {

        alert(
            'Please select start and end dates'
        );

        return;
    }

    if (endDate < startDate) {

        alert(
            'End date cannot be before start date'
        );

        return;
    }

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',
                    body: JSON.stringify({

                        action:
                            'createJournal',

                        username:
                            APP_STATE.currentUser,

                        journalName:
                            journalName,

                        targetAmount:
                            targetAmount,

                        startDate:
                            startDate,

                        endDate:
                            endDate

                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            closeCreateJournalModal();

            const form =
                document.getElementById(
                    'createJournalForm'
                );

            if (form) {
                form.reset();
            }

            setDefaultDates();

            await loadJournals();

        } else {

            alert(
                data.data?.message ||
                'Failed to create journal'
            );
        }

    } catch (error) {

        console.error(
            'Error creating journal:',
            error
        );

        alert(
            'Error creating journal'
        );
    }
}

// ============================================================================
// UTILITY
// ============================================================================

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ============================================================================
// JOURNAL DETAILS & DISPLAY
// ============================================================================

async function loadJournalDetails() {

    if (!APP_STATE.currentJournal) {
        return;
    }

    updateJournalHeader();
    renderCalendar();
    updateRecentTransactions();
}

function updateJournalHeader() {

    const journal =
        APP_STATE.currentJournal;

    const stats =
        calculateStats();

    document.getElementById(
        'journalTitle'
    ).textContent =
        journal.journalName;

    document.getElementById(
        'statTarget'
    ).textContent =
        `₹${parseFloat(
            journal.targetAmount
        ).toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'statNetPL'
    ).textContent =
        `${stats.netPL < 0 ? '-' : stats.netPL > 0 ? '+' : ''}₹${Math.abs(
            stats.netPL
        ).toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'statDaysCompleted'
    ).textContent =
        stats.daysCompleted;

    document.getElementById(
        'statDaysRemaining'
    ).textContent =
        stats.daysRemaining;

    document.getElementById(
        'statAmountNeeded'
    ).textContent =
        `₹${stats.amountStillNeeded.toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'statProgress'
    ).textContent =
        `${stats.progressPercentage.toFixed(1)}%`;

    const progressPercentage =
        Math.min(
            100,
            stats.progressPercentage
        );

    document.getElementById(
        'progressFill'
    ).style.width =
        progressPercentage + '%';

    document.getElementById(
        'progressText'
    ).textContent =
        `${progressPercentage.toFixed(1)}% Complete`;

    // Insights

    document.getElementById(
        'insightAvgProfit'
    ).textContent =
        `₹${stats.avgProfitPerDay.toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'insightRequiredPerDay'
    ).textContent =
        `₹${stats.requiredPerDay.toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'insightBestDay'
    ).textContent =
        `${stats.bestDayAmount < 0 ? '-' : stats.bestDayAmount > 0 ? '+' : ''}₹${Math.abs(
            stats.bestDayAmount
        ).toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'insightBestDayDate'
    ).textContent =
        stats.bestDay
            ? formatDate(stats.bestDay)
            : '-';

    document.getElementById(
        'insightWorstDay'
    ).textContent =
        `${stats.worstDayAmount < 0 ? '-' : stats.worstDayAmount > 0 ? '+' : ''}₹${Math.abs(
            stats.worstDayAmount
        ).toLocaleString(
            'en-IN',
            {
                minimumFractionDigits: 2
            }
        )}`;

    document.getElementById(
        'insightWorstDayDate'
    ).textContent =
        stats.worstDay
            ? formatDate(stats.worstDay)
            : '-';
}

// ============================================================================
// CALCULATE STATISTICS
// ============================================================================

function calculateStats() {

    const journal =
        APP_STATE.currentJournal;

    const transactions =
        APP_STATE.allTransactions || [];

    const startDate =
        new Date(
            journal.startDate +
            'T00:00:00Z'
        );

    const endDate =
        new Date(
            journal.endDate +
            'T00:00:00Z'
        );

    const todayDateStr =
        getTodayKolkataDateString();

    const today =
        new Date(
            todayDateStr +
            'T00:00:00Z'
        );

    let totalProfit = 0;
    let totalLoss = 0;

    const dailyNetProfit = {};

    transactions.forEach(txn => {

        const amount =
            parseFloat(txn.amount) || 0;

        const date =
            String(
                txn.transactionDate
            ).slice(0, 10);

        if (
            !Object.prototype.hasOwnProperty.call(
                dailyNetProfit,
                date
            )
        ) {
            dailyNetProfit[date] = 0;
        }

        if (txn.type === 'PROFIT') {

            totalProfit += amount;

            dailyNetProfit[date] += amount;

        } else if (txn.type === 'LOSS') {

            totalLoss += amount;

            dailyNetProfit[date] -= amount;
        }
    });

    const netPL =
        totalProfit - totalLoss;

    const daysCompleted =
        Math.floor(
            (
                today.getTime() -
                startDate.getTime()
            ) /
            (1000 * 60 * 60 * 24)
        );

    const daysRemaining =
        Math.ceil(
            (
                endDate.getTime() -
                today.getTime()
            ) /
            (1000 * 60 * 60 * 24)
        );

    const totalDays =
        Math.ceil(
            (
                endDate.getTime() -
                startDate.getTime()
            ) /
            (1000 * 60 * 60 * 24)
        );

    const target =
        parseFloat(
            journal.targetAmount
        ) || 0;

    const amountStillNeeded =
        Math.max(
            0,
            target - netPL
        );

    const progressPercentage =
        target > 0
            ? (netPL / target) * 100
            : 0;

    let bestDay = null;
    let bestDayAmount = -Infinity;

    let worstDay = null;
    let worstDayAmount = Infinity;

    for (
        const date in dailyNetProfit
    ) {

        const value =
            dailyNetProfit[date];

        if (
            value > bestDayAmount
        ) {
            bestDayAmount = value;
            bestDay = date;
        }

        if (
            value < worstDayAmount
        ) {
            worstDayAmount = value;
            worstDay = date;
        }
    }

    // No transaction days
    if (
        Object.keys(
            dailyNetProfit
        ).length === 0
    ) {
        bestDayAmount = 0;
        worstDayAmount = 0;
    }

    const transactionDayCount =
        Object.keys(
            dailyNetProfit
        ).length;

    const avgProfitPerDay =
        transactionDayCount > 0
            ? netPL / transactionDayCount
            : 0;

    const requiredPerDay =
        daysRemaining > 0
            ? amountStillNeeded /
              daysRemaining
            : 0;

    return {

        totalProfit,

        totalLoss,

        netPL,

        daysCompleted:
            Math.max(
                0,
                daysCompleted
            ),

        daysRemaining:
            Math.max(
                0,
                daysRemaining
            ),

        totalDays,

        amountStillNeeded,

        progressPercentage:
            Math.min(
                100,
                Math.max(
                    0,
                    progressPercentage
                )
            ),

        dailyNetProfit,

        bestDay,

        bestDayAmount,

        worstDay,

        worstDayAmount,

        avgProfitPerDay,

        requiredPerDay
    };
}

// ============================================================================
// CALENDAR
// ============================================================================

function renderCalendar() {

    const year =
        APP_STATE.currentMonth
            .getFullYear();

    const month =
        APP_STATE.currentMonth
            .getMonth();

    const monthTitle =
        new Date(
            year,
            month,
            1
        ).toLocaleDateString(
            'en-IN',
            {
                month: 'long',
                year: 'numeric'
            }
        );

    const calendarMonth =
        document.getElementById(
            'calendarMonth'
        );

    if (calendarMonth) {
        calendarMonth.textContent =
            monthTitle;
    }

    const firstDay =
        new Date(
            year,
            month,
            1
        );

    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );

    const daysInMonth =
        lastDay.getDate();

    const startingDayOfWeek =
        firstDay.getDay();

    const stats =
        calculateStats();

    const dailyNetProfit =
        stats.dailyNetProfit;

    const journal =
        APP_STATE.currentJournal;

    let html = '';

    // Previous month
    for (
        let i = startingDayOfWeek - 1;
        i >= 0;
        i--
    ) {
        html += `
            <div class="calendar-day other-month"></div>
        `;
    }

    // Current month
    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const dateStr =
            `${year}-${String(
                month + 1
            ).padStart(2, '0')}-${String(
                day
            ).padStart(2, '0')}`;

        const hasTransactions =
            Object.prototype.hasOwnProperty.call(
                dailyNetProfit,
                dateStr
            );

        const dayAmount =
            hasTransactions
                ? dailyNetProfit[dateStr]
                : null;

        const isToday =
            isTodayKolkata(
                dateStr
            );

        let dayClass =
            isToday
                ? 'today'
                : '';

        let dayContent = `
            <div class="calendar-day-date">
                ${day}
            </div>
        `;

        // -----------------------------------------------------
        // PROFIT
        // -----------------------------------------------------

        if (
            hasTransactions &&
            dayAmount > 0
        ) {

            dayClass += ' profit';

            dayContent += `
                <div class="calendar-day-amount">
                    +₹${Math.abs(
                        dayAmount
                    ).toLocaleString(
                        'en-IN',
                        {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }
                    )}
                </div>

                <div class="calendar-day-status">
                    PROFIT
                </div>
            `;
        }

        // -----------------------------------------------------
        // LOSS
        // -----------------------------------------------------

        else if (
            hasTransactions &&
            dayAmount < 0
        ) {

            dayClass += ' loss';

            dayContent += `
                <div class="calendar-day-amount">
                    -₹${Math.abs(
                        dayAmount
                    ).toLocaleString(
                        'en-IN',
                        {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                        }
                    )}
                </div>

                <div class="calendar-day-status">
                    LOSS
                </div>
            `;
        }

        // -----------------------------------------------------
        // ZERO NET P/L
        // -----------------------------------------------------

        else if (
            hasTransactions &&
            dayAmount === 0
        ) {

            dayClass += ' neutral';

            dayContent += `
                <div class="calendar-day-amount">
                    ₹0
                </div>

                <div class="calendar-day-status">
                    NET P/L
                </div>
            `;
        }

        // -----------------------------------------------------
        // NO ENTRY
        // -----------------------------------------------------

        else {

            dayClass +=
                ' neutral empty';

            dayContent += `
                <div class="calendar-day-amount">
                    No Entry
                </div>
            `;

            if (isToday) {

                dayContent += `
                    <div class="calendar-day-status">
                        TODAY
                    </div>
                `;
            }
        }

        // Today + transaction
        if (
            isToday &&
            hasTransactions
        ) {

            dayContent += `
                <div class="calendar-day-status">
                    TODAY
                </div>
            `;
        }

        // Selected date
        if (
            APP_STATE.selectedDate ===
            dateStr
        ) {
            dayClass += ' selected';
        }

        html += `
            <div
                class="calendar-day ${dayClass}"
                onclick="selectDate('${dateStr}', this)"
            >
                ${dayContent}
            </div>
        `;
    }

    // Fill remaining calendar cells
    const usedCells =
        startingDayOfWeek +
        daysInMonth;

    const remainingDays =
        42 - usedCells;

    for (
        let i = 1;
        i <= remainingDays;
        i++
    ) {

        html += `
            <div class="calendar-day other-month"></div>
        `;
    }

    const calendarDays =
        document.getElementById(
            'calendarDays'
        );

    if (calendarDays) {
        calendarDays.innerHTML =
            html;
    }
}

// ============================================================================
// CALENDAR NAVIGATION
// ============================================================================

function previousMonth() {

    APP_STATE.currentMonth.setMonth(
        APP_STATE.currentMonth.getMonth() - 1
    );

    renderCalendar();
}

function nextMonth() {

    APP_STATE.currentMonth.setMonth(
        APP_STATE.currentMonth.getMonth() + 1
    );

    renderCalendar();
}

// ============================================================================
// SELECT CALENDAR DATE
// ============================================================================

async function selectDate(
    dateStr,
    dayElement
) {

    APP_STATE.selectedDate =
        dateStr;

    // Remove previous selection
    document
        .querySelectorAll(
            '.calendar-day'
        )
        .forEach(day => {
            day.classList.remove(
                'selected'
            );
        });

    // Add selected state
    if (dayElement) {

        dayElement.classList.add(
            'selected'
        );
    }

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',

                    body: JSON.stringify({

                        action:
                            'getTransactionsByDate',

                        journalId:
                            APP_STATE
                                .currentJournal
                                .journalId,

                        username:
                            APP_STATE.currentUser,

                        date:
                            dateStr
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            displayDateTransactions(
                data.data,
                dateStr
            );
        }

    } catch (error) {

        console.error(
            'Error loading transactions:',
            error
        );
    }
}

// ============================================================================
// DATE TRANSACTION DETAILS
// ============================================================================

function displayDateTransactions(
    data,
    dateStr
) {

    const container =
        document.getElementById(
            'dateTransactionContainer'
        );

    const listContainer =
        document.getElementById(
            'dateTransactionList'
        );

    const titleEl =
        document.getElementById(
            'dateTransactionTitle'
        );

    if (!container) {
        return;
    }

    if (titleEl) {

        titleEl.textContent =
            `Transactions for ${formatDate(
                dateStr
            )}`;
    }

    const totalProfit =
        parseFloat(
            data.totalProfit
        ) || 0;

    const totalLoss =
        parseFloat(
            data.totalLoss
        ) || 0;

    const netPL =
        parseFloat(
            data.netPL
        ) || 0;

    const totalProfitEl =
        document.getElementById(
            'dateTotalProfit'
        );

    const totalLossEl =
        document.getElementById(
            'dateTotalLoss'
        );

    const netPLEl =
        document.getElementById(
            'dateNetPL'
        );

    if (totalProfitEl) {

        totalProfitEl.textContent =
            `₹${totalProfit.toLocaleString(
                'en-IN',
                {
                    minimumFractionDigits: 2
                }
            )}`;
    }

    if (totalLossEl) {

        totalLossEl.textContent =
            `₹${totalLoss.toLocaleString(
                'en-IN',
                {
                    minimumFractionDigits: 2
                }
            )}`;
    }

    if (netPLEl) {

        netPLEl.textContent =
            `${
                netPL < 0
                    ? '-'
                    : netPL > 0
                        ? '+'
                        : ''
            }₹${Math.abs(
                netPL
            ).toLocaleString(
                'en-IN',
                {
                    minimumFractionDigits: 2
                }
            )}`;

        netPLEl.className =
            'stat-value ' +
            (
                netPL > 0
                    ? 'profit'
                    : netPL < 0
                        ? 'loss'
                        : 'neutral'
            );
    }

    const transactions =
        data.transactions || [];

    if (
        transactions.length > 0
    ) {

        listContainer.innerHTML =
            transactions
                .map(txn => {

                    const time =
                        new Date(
                            txn.timestamp
                        ).toLocaleTimeString(
                            'en-IN',
                            {
                                hour:
                                    '2-digit',

                                minute:
                                    '2-digit',

                                timeZone:
                                    'Asia/Kolkata'
                            }
                        );

                    const amount =
                        parseFloat(
                            txn.amount
                        ) || 0;

                    return `
                        <div class="transaction-item">

                            <div class="transaction-left">

                                <div class="transaction-type">
                                    ${
                                        txn.type === 'PROFIT'
                                            ? '📈 Profit'
                                            : '📉 Loss'
                                    }
                                </div>

                                <div class="transaction-time">
                                    ${time}
                                </div>

                            </div>

                            <div class="transaction-right">

                                <div
                                    class="transaction-amount ${
                                        txn.type === 'PROFIT'
                                            ? 'profit'
                                            : 'loss'
                                    }"
                                >
                                    ${
                                        txn.type === 'PROFIT'
                                            ? '+'
                                            : '-'
                                    }₹${amount.toLocaleString(
                                        'en-IN',
                                        {
                                            minimumFractionDigits: 2
                                        }
                                    )}
                                </div>

                            </div>

                        </div>
                    `;
                })
                .join('');

    } else {

        listContainer.innerHTML = `
            <p
                style="
                    color: var(--text-secondary);
                    text-align: center;
                    padding: 20px;
                "
            >
                No transactions for this date
            </p>
        `;
    }

    container.style.display =
        'block';
}

// ============================================================================
// QUICK ACTIONS
// ============================================================================

function selectTransactionType(type) {

    APP_STATE.selectedTransactionType =
        type;

    const profitButton =
        document.getElementById(
            'btnProfit'
        );

    const lossButton =
        document.getElementById(
            'btnLoss'
        );

    if (profitButton) {

        profitButton.classList.remove(
            'selected'
        );
    }

    if (lossButton) {

        lossButton.classList.remove(
            'selected'
        );
    }

    if (
        type === 'PROFIT' &&
        profitButton
    ) {

        profitButton.classList.add(
            'selected'
        );
    }

    if (
        type === 'LOSS' &&
        lossButton
    ) {

        lossButton.classList.add(
            'selected'
        );
    }
}

async function handleAddTransaction() {

    if (
        !APP_STATE.currentJournal
    ) {

        alert(
            'Please select a journal first'
        );

        return;
    }

    if (
        !APP_STATE.selectedTransactionType
    ) {

        alert(
            'Please select PROFIT or LOSS'
        );

        return;
    }

    const amount =
        parseFloat(
            document.getElementById(
                'quickAmount'
            ).value
        );

    if (
        !Number.isFinite(amount) ||
        amount <= 0
    ) {

        alert(
            'Please enter a valid amount'
        );

        return;
    }

    // IMPORTANT:
    // Always use Kolkata date.
    // Never use toISOString().split('T')[0]
    // because that returns UTC date.

    const today =
        getTodayKolkataDateString();

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',

                    body: JSON.stringify({

                        action:
                            'addTransaction',

                        journalId:
                            APP_STATE
                                .currentJournal
                                .journalId,

                        username:
                            APP_STATE.currentUser,

                        type:
                            APP_STATE
                                .selectedTransactionType,

                        amount:
                            amount,

                        transactionDate:
                            today
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            document.getElementById(
                'quickAmount'
            ).value = '';

            selectTransactionType(
                null
            );

            // Immediately reload everything
            await refreshJournalData();

            // If today's calendar cell is visible,
            // visually select it.
            if (
                isTodayKolkata(today)
            ) {

                const todayCell =
                    document.querySelector(
                        `.calendar-day[onclick*="${today}"]`
                    );

                if (todayCell) {

                    todayCell.classList.add(
                        'selected'
                    );
                }
            }

        } else {

            alert(
                data.data?.message ||
                'Failed to add transaction'
            );
        }

    } catch (error) {

        console.error(
            'Error adding transaction:',
            error
        );

        alert(
            'Error adding transaction'
        );
    }
}

// ============================================================================
// REFRESH JOURNAL DATA
// ============================================================================

async function refreshJournalData() {

    if (
        !APP_STATE.currentJournal
    ) {
        return;
    }

    try {

        const response =
            await fetch(
                APP_STATE.appScriptUrl,
                {
                    method: 'POST',

                    body: JSON.stringify({

                        action:
                            'getJournalDetails',

                        journalId:
                            APP_STATE
                                .currentJournal
                                .journalId,

                        username:
                            APP_STATE.currentUser
                    })
                }
            );

        const data =
            await response.json();

        if (
            data.status === 'success'
        ) {

            APP_STATE.currentJournal =
                data.data.journal;

            APP_STATE.allTransactions =
                data.data.transactions || [];

            updateJournalHeader();

            renderCalendar();

            updateRecentTransactions();

            // Restore selected date
            if (
                APP_STATE.selectedDate
            ) {

                const selectedCell =
                    document.querySelector(
                        `.calendar-day[onclick*="${APP_STATE.selectedDate}"]`
                    );

                if (selectedCell) {

                    selectedCell.classList.add(
                        'selected'
                    );
                }
            }
        }

    } catch (error) {

        console.error(
            'Error refreshing data:',
            error
        );
    }
}

// ============================================================================
// RECENT TRANSACTIONS
// ============================================================================

function updateRecentTransactions() {

    const container =
        document.getElementById(
            'recentTransactionList'
        );

    if (!container) {
        return;
    }

    const transactions =
        [
            ...(APP_STATE.allTransactions || [])
        ]
            .sort(
                (a, b) =>
                    new Date(
                        b.timestamp
                    ) -
                    new Date(
                        a.timestamp
                    )
            )
            .slice(0, 20);

    if (
        transactions.length === 0
    ) {

        container.innerHTML = `
            <p
                style="
                    color: var(--text-secondary);
                    text-align: center;
                    padding: 20px;
                "
            >
                No transactions yet
            </p>
        `;

        return;
    }

    container.innerHTML =
        transactions
            .map(txn => {

                const time =
                    new Date(
                        txn.timestamp
                    ).toLocaleTimeString(
                        'en-IN',
                        {
                            hour:
                                '2-digit',

                            minute:
                                '2-digit',

                            timeZone:
                                'Asia/Kolkata'
                        }
                    );

                const date =
                    formatDate(
                        txn.transactionDate
                    );

                const amount =
                    parseFloat(
                        txn.amount
                    ) || 0;

                return `
                    <div class="transaction-item">

                        <div class="transaction-left">

                            <div class="transaction-type">
                                ${
                                    txn.type === 'PROFIT'
                                        ? '📈 Profit'
                                        : '📉 Loss'
                                }
                            </div>

                            <div class="transaction-time">
                                ${date} at ${time}
                            </div>

                        </div>

                        <div class="transaction-right">

                            <div
                                class="transaction-amount ${
                                    txn.type === 'PROFIT'
                                        ? 'profit'
                                        : 'loss'
                                }"
                            >
                                ${
                                    txn.type === 'PROFIT'
                                        ? '+'
                                        : '-'
                                }₹${amount.toLocaleString(
                                    'en-IN',
                                    {
                                        minimumFractionDigits: 2
                                    }
                                )}
                            </div>

                        </div>

                    </div>
                `;
            })
            .join('');
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDate(dateStr) {

    if (!dateStr) {
        return '-';
    }

    const cleanDate =
        String(
            dateStr
        ).slice(0, 10);

    const options = {
        year:
            'numeric',

        month:
            'short',

        day:
            'numeric',

        timeZone:
            'Asia/Kolkata'
    };

    return new Date(
        cleanDate +
        'T00:00:00'
    ).toLocaleDateString(
        'en-IN',
        options
    );
}
