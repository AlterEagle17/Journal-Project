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
            appScriptUrl: 'https://script.google.com/macros/s/AKfycbxfloFk7pDYDmEV4Ocigp-6pYlC9MMGe9qUvqZwQo2ISmplUuc57EjJcZdz9gcWejm9Pg/exec'
        };

        // ============================================================================
        // INITIALIZATION
        // ============================================================================

        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
            setDefaultDates();
            startKolkataClock();
            scheduleKolkataMidnightRefresh();
        });

        function setupEventListeners() {
            // Login
            document.getElementById('loginForm').addEventListener('submit', handleLogin);

            // Navigation
            document.querySelectorAll('.nav-item').forEach(item => {
                item.addEventListener('click', function() {
                    navigateToPage(this.dataset.page);
                });
            });

            // Logout
            document.getElementById('logoutBtn').addEventListener('click', handleLogout);

            // Create Journal
            document.getElementById('createJournalBtn').addEventListener('click', openCreateJournalModal);
            document.getElementById('closeCreateModal').addEventListener('click', closeCreateJournalModal);
            document.getElementById('cancelCreateModal').addEventListener('click', closeCreateJournalModal);
            document.getElementById('createJournalForm').addEventListener('submit', handleCreateJournal);

            // Calendar Navigation
            document.getElementById('prevMonth').addEventListener('click', previousMonth);
            document.getElementById('nextMonth').addEventListener('click', nextMonth);

            // Quick Actions
            document.getElementById('btnProfit').addEventListener('click', function() {
                selectTransactionType('PROFIT');
            });
            document.getElementById('btnLoss').addEventListener('click', function() {
                selectTransactionType('LOSS');
            });
            document.getElementById('btnAddTransaction').addEventListener('click', handleAddTransaction);

            // Modal close on background click
            document.getElementById('createJournalModal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeCreateJournalModal();
                }
            });
        }

        function setDefaultDates() {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
            
            document.getElementById('startDate').valueAsDate = today;
            document.getElementById('endDate').valueAsDate = nextMonth;
        }

        const KOLKATA_TIMEZONE = 'Asia/Kolkata';

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

            return new Date(Date.UTC(
                parseInt(dateParts.year, 10),
                parseInt(dateParts.month, 10) - 1,
                parseInt(dateParts.day, 10),
                parseInt(dateParts.hour, 10),
                parseInt(dateParts.minute, 10),
                parseInt(dateParts.second, 10)
            ));
        }

        function formatKolkataCountdown(diffMs) {
            const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }

        function getKolkataCountdownText() {
            const now = getKolkataLocalDate();
            const year = now.getUTCFullYear();
            const month = now.getUTCMonth();
            const day = now.getUTCDate();
            const nextMidnight = new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
            const diff = nextMidnight - now;
            return `Day ends in ${formatKolkataCountdown(diff)}`;
        }

        function updateKolkataClock() {
            const now = getKolkataLocalDate();
            const timeString = new Intl.DateTimeFormat('en-IN', {
                timeZone: KOLKATA_TIMEZONE,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(now);

            const dateString = new Intl.DateTimeFormat('en-IN', {
                timeZone: KOLKATA_TIMEZONE,
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).format(now);

            const desktopTimeEl = document.getElementById('kolkataClockTime');
            const desktopDateEl = document.getElementById('kolkataClockDate');
            const desktopCountdownEl = document.getElementById('kolkataClockCountdown');
            const mobileTimeEl = document.getElementById('kolkataClockTimeMobile');
            const mobileCountdownEl = document.getElementById('kolkataClockCountdownMobile');

            if (desktopTimeEl) {
                desktopTimeEl.textContent = `Kolkata • ${timeString}`;
            }
            if (desktopDateEl) {
                desktopDateEl.textContent = dateString;
            }
            if (desktopCountdownEl) {
                desktopCountdownEl.textContent = getKolkataCountdownText();
            }
            if (mobileTimeEl) {
                mobileTimeEl.textContent = `Kolkata • ${timeString}`;
            }
            if (mobileCountdownEl) {
                mobileCountdownEl.textContent = getKolkataCountdownText();
            }
        }

        function startKolkataClock() {
            updateKolkataClock();
            setInterval(updateKolkataClock, 1000);
        }

        function getNextKolkataMidnight() {
            const now = getKolkataLocalDate();
            const year = now.getUTCFullYear();
            const month = now.getUTCMonth();
            const day = now.getUTCDate();
            return new Date(Date.UTC(year, month, day + 1, 0, 0, 0));
        }

        function scheduleKolkataMidnightRefresh() {
            const now = getKolkataLocalDate();
            const nextMidnight = getNextKolkataMidnight();
            const delay = Math.max(0, nextMidnight - now) + 50;

            setTimeout(async () => {
                updateKolkataClock();

                if (APP_STATE.currentJournal && document.getElementById('journalPage').classList.contains('active')) {
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
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('loginError');

            errorEl.classList.remove('show');

            if (!username || !password) {
                showLoginError('Please enter username and password');
                return;
            }

            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'login',
                        username: username,
                        password: password
                    })
                });

                const data = await response.json();

                if (data.status === 'success' && data.data.authenticated) {
                    APP_STATE.currentUser = username;
                    document.getElementById('currentUsername').textContent = username;
                    showApp();
                    loadJournals();
                } else {
                    showLoginError(data.data?.message || 'Login failed');
                }
            } catch (error) {
                showLoginError('Error: ' + error.message);
            }
        }

        function showLoginError(message) {
            const errorEl = document.getElementById('loginError');
            errorEl.textContent = message;
            errorEl.classList.add('show');
        }

        function handleLogout() {
            APP_STATE.currentUser = null;
            APP_STATE.currentJournal = null;
            document.getElementById('loginForm').reset();
            document.getElementById('loginError').classList.remove('show');
            document.getElementById('appContainer').style.display = 'none';
            document.getElementById('loginPage').style.display = 'flex';
            navigateToPage('dashboard');
        }

        // ============================================================================
        // NAVIGATION
        // ============================================================================

        function showApp() {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('appContainer').style.display = 'flex';
        }

        function navigateToPage(page) {
            // Update nav items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
                if (item.dataset.page === page) {
                    item.classList.add('active');
                }
            });

            // Hide all pages
            document.querySelectorAll('.page').forEach(p => {
                p.classList.remove('active');
            });

            // Show selected page
            if (page === 'dashboard') {
                document.getElementById('dashboardPage').classList.add('active');
                document.getElementById('pageTitle').textContent = 'Dashboard';
                loadJournals();
            } else if (page === 'journal') {
                if (!APP_STATE.currentJournal) {
                    alert('Please select a journal first');
                    navigateToPage('dashboard');
                    return;
                }
                document.getElementById('journalPage').classList.add('active');
                document.getElementById('pageTitle').textContent = APP_STATE.currentJournal.journalName;
                loadJournalDetails();
            }
        }

        // ============================================================================
        // JOURNALS
        // ============================================================================

        async function loadJournals() {
            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getJournals',
                        username: APP_STATE.currentUser
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    displayJournals(data.data.journals);
                }
            } catch (error) {
                console.error('Error loading journals:', error);
            }
        }

        function displayJournals(journals) {
            const container = document.getElementById('journalsContainer');
            
            if (journals.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1;">
                        <div class="empty-state">
                            <h2>No Journals Yet</h2>
                            <p>Create a new journal to start tracking your trading performance</p>
                        </div>
                    </div>
                `;
                return;
            }

            container.innerHTML = journals.map(journal => `
                <div class="journal-card">
                    <h3>${journal.journalName}</h3>
                    <p>Target: ₹${parseFloat(journal.targetAmount).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    <p>Period: ${formatDate(journal.startDate)} to ${formatDate(journal.endDate)}</p>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <div class="card-actions">
                        <button class="btn-small" onclick="openJournal('${journal.journalId}')">Open</button>
                        <button class="btn-small btn-delete" onclick="deleteJournal('${journal.journalId}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        async function openJournal(journalId) {
            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getJournalDetails',
                        journalId: journalId,
                        username: APP_STATE.currentUser
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    APP_STATE.currentJournal = data.data.journal;
                    APP_STATE.allTransactions = data.data.transactions;
                    APP_STATE.currentMonth = new Date(data.data.journal.startDate);
                    APP_STATE.selectedDate = null;
                    navigateToPage('journal');
                }
            } catch (error) {
                console.error('Error opening journal:', error);
            }
        }

        async function deleteJournal(journalId) {
            if (!confirm('Are you sure you want to delete this journal?')) {
                return;
            }

            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'deleteJournal',
                        journalId: journalId,
                        username: APP_STATE.currentUser
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    loadJournals();
                }
            } catch (error) {
                console.error('Error deleting journal:', error);
            }
        }

        // ============================================================================
        // CREATE JOURNAL
        // ============================================================================

        function openCreateJournalModal() {
            document.getElementById('createJournalModal').classList.add('active');
        }

        function closeCreateJournalModal() {
            document.getElementById('createJournalModal').classList.remove('active');
            document.getElementById('createJournalForm').reset();
            setDefaultDates();
        }

        async function handleCreateJournal(e) {
            e.preventDefault();

            const journalName = document.getElementById('journalName').value.trim();
            const targetAmount = parseFloat(document.getElementById('targetAmount').value);
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;

            if (!journalName || !targetAmount || !startDate || !endDate) {
                alert('Please fill all fields');
                return;
            }

            if (new Date(startDate) >= new Date(endDate)) {
                alert('End date must be after start date');
                return;
            }

            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'createJournal',
                        username: APP_STATE.currentUser,
                        journalName: journalName,
                        targetAmount: targetAmount,
                        startDate: startDate,
                        endDate: endDate
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    closeCreateJournalModal();
                    loadJournals();
                }
            } catch (error) {
                console.error('Error creating journal:', error);
                alert('Error creating journal');
            }
        }

        // ============================================================================
        // JOURNAL DETAILS & DISPLAY
        // ============================================================================

        async function loadJournalDetails() {
            if (!APP_STATE.currentJournal) return;

            updateJournalHeader();
            renderCalendar();
            updateRecentTransactions();
        }

        function updateJournalHeader() {
            const journal = APP_STATE.currentJournal;
            const stats = calculateStats();

            document.getElementById('journalTitle').textContent = journal.journalName;
            document.getElementById('statTarget').textContent = `₹${parseFloat(journal.targetAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('statNetPL').textContent = `₹${stats.netPL.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('statDaysCompleted').textContent = stats.daysCompleted;
            document.getElementById('statDaysRemaining').textContent = stats.daysRemaining;
            document.getElementById('statAmountNeeded').textContent = `₹${stats.amountStillNeeded.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('statProgress').textContent = `${stats.progressPercentage.toFixed(1)}%`;

            const progressPercentage = Math.min(100, stats.progressPercentage);
            document.getElementById('progressFill').style.width = progressPercentage + '%';
            document.getElementById('progressText').textContent = `${progressPercentage.toFixed(1)}% Complete`;

            // Update insights
            document.getElementById('insightAvgProfit').textContent = `₹${stats.avgProfitPerDay.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('insightRequiredPerDay').textContent = `₹${stats.requiredPerDay.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('insightBestDay').textContent = `₹${stats.bestDayAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('insightBestDayDate').textContent = stats.bestDay ? formatDate(stats.bestDay) : '-';
            document.getElementById('insightWorstDay').textContent = `₹${stats.worstDayAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('insightWorstDayDate').textContent = stats.worstDay ? formatDate(stats.worstDay) : '-';
        }

        function calculateStats() {
            const journal = APP_STATE.currentJournal;
            const transactions = APP_STATE.allTransactions;
            const startDate = new Date(journal.startDate);
            const endDate = new Date(journal.endDate);
            const today = new Date();

            let totalProfit = 0;
            let totalLoss = 0;
            let dailyNetProfit = {};

            transactions.forEach(txn => {
                const amount = parseFloat(txn.amount);
                if (!dailyNetProfit[txn.transactionDate]) {
                    dailyNetProfit[txn.transactionDate] = 0;
                }

                if (txn.type === 'PROFIT') {
                    totalProfit += amount;
                    dailyNetProfit[txn.transactionDate] += amount;
                } else if (txn.type === 'LOSS') {
                    totalLoss += amount;
                    dailyNetProfit[txn.transactionDate] -= amount;
                }
            });

            const netPL = totalProfit - totalLoss;
            const daysCompleted = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
            const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
            const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

            const amountStillNeeded = Math.max(0, journal.targetAmount - netPL);
            const progressPercentage = (netPL / journal.targetAmount) * 100;

            let bestDay = null;
            let bestDayAmount = -Infinity;
            let worstDay = null;
            let worstDayAmount = Infinity;

            for (let date in dailyNetProfit) {
                if (dailyNetProfit[date] > bestDayAmount) {
                    bestDayAmount = dailyNetProfit[date];
                    bestDay = date;
                }
                if (dailyNetProfit[date] < worstDayAmount) {
                    worstDayAmount = dailyNetProfit[date];
                    worstDay = date;
                }
            }

            const transactionCount = Object.keys(dailyNetProfit).length;
            const avgProfitPerDay = transactionCount > 0 ? netPL / transactionCount : 0;
            const requiredPerDay = daysRemaining > 0 ? amountStillNeeded / daysRemaining : 0;

            return {
                totalProfit,
                totalLoss,
                netPL,
                daysCompleted: Math.max(0, daysCompleted),
                daysRemaining: Math.max(0, daysRemaining),
                totalDays,
                amountStillNeeded,
                progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
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
            const year = APP_STATE.currentMonth.getFullYear();
            const month = APP_STATE.currentMonth.getMonth();

            document.getElementById('calendarMonth').textContent = new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();

            const stats = calculateStats();
            const dailyNetProfit = stats.dailyNetProfit;
            const journal = APP_STATE.currentJournal;

            let html = '';

            // Previous month's days
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            for (let i = startingDayOfWeek - 1; i >= 0; i--) {
                html += `<div class="calendar-day other-month"></div>`;
            }

            // Current month's days
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayAmount = dailyNetProfit[dateStr];
                let dayClass = '';
                let dayContent = `<div class="calendar-day-date">${day}</div>`;

                if (dayAmount !== undefined) {
                    const percentage = ((dayAmount / journal.targetAmount) * 100).toFixed(0);
                    if (dayAmount > 0) {
                        dayClass = 'profit';
                        dayContent += `<div class="calendar-day-amount">+₹${Math.abs(dayAmount).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>`;
                        dayContent += `<div class="calendar-day-percentage">${percentage}%</div>`;
                    } else if (dayAmount < 0) {
                        dayClass = 'loss';
                        dayContent += `<div class="calendar-day-amount">-₹${Math.abs(dayAmount).toLocaleString('en-IN', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</div>`;
                        dayContent += `<div class="calendar-day-percentage">${percentage}%</div>`;
                    } else {
                        dayClass = 'neutral';
                    }
                } else {
                    dayClass = 'neutral';
                }

                html += `<div class="calendar-day ${dayClass}" onclick="selectDate('${dateStr}')">${dayContent}</div>`;
            }

            // Next month's days
            const remainingDays = 42 - (startingDayOfWeek + daysInMonth);
            for (let i = 1; i <= remainingDays; i++) {
                html += `<div class="calendar-day other-month"></div>`;
            }

            document.getElementById('calendarDays').innerHTML = html;
        }

        function previousMonth() {
            APP_STATE.currentMonth.setMonth(APP_STATE.currentMonth.getMonth() - 1);
            renderCalendar();
        }

        function nextMonth() {
            APP_STATE.currentMonth.setMonth(APP_STATE.currentMonth.getMonth() + 1);
            renderCalendar();
        }

        async function selectDate(dateStr) {
            APP_STATE.selectedDate = dateStr;

            // Update calendar UI
            document.querySelectorAll('.calendar-day').forEach(day => {
                day.classList.remove('selected');
            });
            event.target.closest('.calendar-day').classList.add('selected');

            // Load transactions for this date
            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getTransactionsByDate',
                        journalId: APP_STATE.currentJournal.journalId,
                        username: APP_STATE.currentUser,
                        date: dateStr
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    displayDateTransactions(data.data, dateStr);
                }
            } catch (error) {
                console.error('Error loading transactions:', error);
            }
        }

        function displayDateTransactions(data, dateStr) {
            const container = document.getElementById('dateTransactionContainer');
            const listContainer = document.getElementById('dateTransactionList');
            const titleEl = document.getElementById('dateTransactionTitle');

            titleEl.textContent = `Transactions for ${formatDate(dateStr)}`;

            document.getElementById('dateTotalProfit').textContent = `₹${parseFloat(data.totalProfit).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            document.getElementById('dateTotalLoss').textContent = `₹${parseFloat(data.totalLoss).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;

            const netPL = data.netPL;
            const netPLEl = document.getElementById('dateNetPL');
            netPLEl.textContent = `₹${Math.abs(netPL).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            netPLEl.className = 'stat-value ' + (netPL > 0 ? 'profit' : netPL < 0 ? 'loss' : 'neutral');

            if (data.transactions.length > 0) {
                listContainer.innerHTML = data.transactions.map(txn => {
                    const time = new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                    const amount = parseFloat(txn.amount);
                    return `
                        <div class="transaction-item">
                            <div class="transaction-left">
                                <div class="transaction-type">${txn.type === 'PROFIT' ? '📈 Profit' : '📉 Loss'}</div>
                                <div class="transaction-time">${time}</div>
                            </div>
                            <div class="transaction-right">
                                <div class="transaction-amount ${txn.type === 'PROFIT' ? 'profit' : 'loss'}">
                                    ${txn.type === 'PROFIT' ? '+' : '-'}₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                listContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No transactions for this date</p>';
            }

            container.style.display = 'block';
        }

        // ============================================================================
        // QUICK ACTIONS
        // ============================================================================

        function selectTransactionType(type) {
            APP_STATE.selectedTransactionType = type;
            document.getElementById('btnProfit').classList.remove('selected');
            document.getElementById('btnLoss').classList.remove('selected');

            if (type === 'PROFIT') {
                document.getElementById('btnProfit').classList.add('selected');
            } else if (type === 'LOSS') {
                document.getElementById('btnLoss').classList.add('selected');
            }
        }

        async function handleAddTransaction() {
            if (!APP_STATE.selectedTransactionType) {
                alert('Please select PROFIT or LOSS');
                return;
            }

            const amount = parseFloat(document.getElementById('quickAmount').value);
            if (!amount || amount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            const today = new Date().toISOString().split('T')[0];

            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'addTransaction',
                        journalId: APP_STATE.currentJournal.journalId,
                        username: APP_STATE.currentUser,
                        type: APP_STATE.selectedTransactionType,
                        amount: amount,
                        transactionDate: today
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    // Clear form
                    document.getElementById('quickAmount').value = '';
                    selectTransactionType(null);

                    // Reload journal details to update everything
                    await refreshJournalData();
                }
            } catch (error) {
                console.error('Error adding transaction:', error);
                alert('Error adding transaction');
            }
        }

        async function refreshJournalData() {
            try {
                const response = await fetch(APP_STATE.appScriptUrl, {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'getJournalDetails',
                        journalId: APP_STATE.currentJournal.journalId,
                        username: APP_STATE.currentUser
                    })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    APP_STATE.currentJournal = data.data.journal;
                    APP_STATE.allTransactions = data.data.transactions;
                    updateJournalHeader();
                    renderCalendar();
                    updateRecentTransactions();
                }
            } catch (error) {
                console.error('Error refreshing data:', error);
            }
        }

        // ============================================================================
        // RECENT TRANSACTIONS
        // ============================================================================

        function updateRecentTransactions() {
            const container = document.getElementById('recentTransactionList');
            const transactions = APP_STATE.allTransactions
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 20);

            if (transactions.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No transactions yet</p>';
                return;
            }

            container.innerHTML = transactions.map(txn => {
                const time = new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                const date = formatDate(txn.transactionDate);
                const amount = parseFloat(txn.amount);
                return `
                    <div class="transaction-item">
                        <div class="transaction-left">
                            <div class="transaction-type">${txn.type === 'PROFIT' ? '📈 Profit' : '📉 Loss'}</div>
                            <div class="transaction-time">${date} at ${time}</div>
                        </div>
                        <div class="transaction-right">
                            <div class="transaction-amount ${txn.type === 'PROFIT' ? 'profit' : 'loss'}">
                                ${txn.type === 'PROFIT' ? '+' : '-'}₹${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // ============================================================================
        // UTILITIES
        // ============================================================================

        function formatDate(dateStr) {
            const options = { year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', options);
        }
