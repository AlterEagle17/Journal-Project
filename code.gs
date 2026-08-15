// ============================================================================
// PROFIT JOURNAL - GOOGLE APPS SCRIPT BACKEND
// ============================================================================
// IMPORTANT:
// - Preserves existing Users / Journals / Transactions data
// - Uses Asia/Kolkata for application date logic
// - A day ends exactly at 12:00 AM IST
// - Backend validates journal ownership
// - Existing sheet structure is preserved
// ============================================================================


// ============================================================================
// CONFIGURATION
// ============================================================================

const SPREADSHEET_ID =
  SpreadsheetApp.getActiveSpreadsheet().getId();

const USERS_SHEET = 'Users';
const JOURNALS_SHEET = 'Journals';
const TRANSACTIONS_SHEET = 'Transactions';

const APP_TIMEZONE = 'Asia/Kolkata';


// ============================================================================
// INITIALIZATION
// ============================================================================

function initializeSheets() {

  const spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();


  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  let usersSheet =
    spreadsheet.getSheetByName(
      USERS_SHEET
    );

  if (!usersSheet) {

    usersSheet =
      spreadsheet.insertSheet(
        USERS_SHEET
      );

    usersSheet.appendRow([
      'Username',
      'Password'
    ]);
  }


  // ----------------------------------------------------------
  // JOURNALS
  // ----------------------------------------------------------

  let journalsSheet =
    spreadsheet.getSheetByName(
      JOURNALS_SHEET
    );

  if (!journalsSheet) {

    journalsSheet =
      spreadsheet.insertSheet(
        JOURNALS_SHEET
      );

    journalsSheet.appendRow([
      'JournalID',
      'Username',
      'JournalName',
      'TargetAmount',
      'StartDate',
      'EndDate',
      'CreatedAt'
    ]);
  }


  // ----------------------------------------------------------
  // TRANSACTIONS
  // ----------------------------------------------------------

  let transactionsSheet =
    spreadsheet.getSheetByName(
      TRANSACTIONS_SHEET
    );

  if (!transactionsSheet) {

    transactionsSheet =
      spreadsheet.insertSheet(
        TRANSACTIONS_SHEET
      );

    transactionsSheet.appendRow([
      'TransactionID',
      'JournalID',
      'Username',
      'Type',
      'Amount',
      'TransactionDate',
      'Timestamp'
    ]);
  }
}


// ============================================================================
// MAIN POST API
// ============================================================================

function doPost(e) {

  try {

    initializeSheets();


    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return sendError(
        'Invalid request'
      );
    }


    const params =
      JSON.parse(
        e.postData.contents
      );

    const action =
      params.action;


    // ----------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------

    if (action === 'login') {

      return handleLogin(
        params.username,
        params.password
      );
    }


    // ----------------------------------------------------------
    // GET JOURNALS
    // ----------------------------------------------------------

    if (action === 'getJournals') {

      return handleGetJournals(
        params.username
      );
    }


    // ----------------------------------------------------------
    // CREATE JOURNAL
    // ----------------------------------------------------------

    if (action === 'createJournal') {

      return handleCreateJournal(
        params.username,
        params.journalName,
        params.targetAmount,
        params.startDate,
        params.endDate
      );
    }


    // ----------------------------------------------------------
    // DELETE JOURNAL
    // ----------------------------------------------------------

    if (action === 'deleteJournal') {

      return handleDeleteJournal(
        params.journalId,
        params.username
      );
    }


    // ----------------------------------------------------------
    // JOURNAL DETAILS
    // ----------------------------------------------------------

    if (
      action === 'getJournalDetails'
    ) {

      return handleGetJournalDetails(
        params.journalId,
        params.username
      );
    }


    // ----------------------------------------------------------
    // ADD TRANSACTION
    // ----------------------------------------------------------

    if (
      action === 'addTransaction'
    ) {

      return handleAddTransaction(
        params.journalId,
        params.username,
        params.type,
        params.amount
      );
    }


    // ----------------------------------------------------------
    // GET TRANSACTIONS
    // ----------------------------------------------------------

    if (
      action === 'getTransactions'
    ) {

      return handleGetTransactions(
        params.journalId,
        params.username
      );
    }


    // ----------------------------------------------------------
    // GET TRANSACTIONS BY DATE
    // ----------------------------------------------------------

    if (
      action ===
      'getTransactionsByDate'
    ) {

      return handleGetTransactionsByDate(
        params.journalId,
        params.username,
        params.date
      );
    }


    return sendError(
      'Unknown action'
    );

  } catch (error) {

    console.error(
      error
    );

    return sendError(
      error.message ||
      String(error)
    );
  }
}


// ============================================================================
// LOGIN
// ============================================================================

function handleLogin(
  username,
  password
) {

  if (
    !username ||
    !password
  ) {

    return sendError(
      'Username and password are required'
    );
  }


  const usersSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        USERS_SHEET
      );


  if (!usersSheet) {

    return sendError(
      'Users sheet not found'
    );
  }


  const data =
    usersSheet
      .getDataRange()
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const storedUsername =
      String(
        data[i][0]
      ).trim();

    const storedPassword =
      String(
        data[i][1]
      );


    if (
      storedUsername ===
        String(username).trim() &&
      storedPassword ===
        String(password)
    ) {

      return sendSuccess({

        authenticated:
          true,

        username:
          storedUsername,

        message:
          'Login successful'

      });
    }
  }


  return sendSuccess({

    authenticated:
      false,

    message:
      'Invalid username or password'

  });
}


// ============================================================================
// GET JOURNALS
// ============================================================================

function handleGetJournals(
  username
) {

  if (!username) {

    return sendError(
      'Username is required'
    );
  }


  const journalsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        JOURNALS_SHEET
      );


  const data =
    journalsSheet
      .getDataRange()
      .getValues();


  const journals = [];


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (
      String(data[i][1]).trim() ===
      String(username).trim()
    ) {

      journals.push({

        journalId:
          data[i][0],

        journalName:
          data[i][2],

        targetAmount:
          parseFloat(
            data[i][3]
          ) || 0,

        startDate:
          normalizeDateString(
            data[i][4]
          ),

        endDate:
          normalizeDateString(
            data[i][5]
          ),

        createdAt:
          data[i][6]

      });
    }
  }


  return sendSuccess({

    journals:
      journals,

    count:
      journals.length

  });
}


// ============================================================================
// CREATE JOURNAL
// ============================================================================

function handleCreateJournal(
  username,
  journalName,
  targetAmount,
  startDate,
  endDate
) {

  if (
    !username ||
    !journalName ||
    targetAmount === undefined ||
    targetAmount === null ||
    !startDate ||
    !endDate
  ) {

    return sendError(
      'All journal fields are required'
    );
  }


  const amount =
    parseFloat(
      targetAmount
    );


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return sendError(
      'Target amount must be greater than 0'
    );
  }


  if (
    endDate < startDate
  ) {

    return sendError(
      'End date cannot be before start date'
    );
  }


  const journalsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        JOURNALS_SHEET
      );


  const journalId =
    'J_' +
    Utilities
      .getUuid()
      .substring(
        0,
        8
      );


  const createdAt =
    new Date()
      .toISOString();


  journalsSheet.appendRow([

    journalId,

    username,

    String(
      journalName
    ).trim(),

    amount,

    normalizeDateString(
      startDate
    ),

    normalizeDateString(
      endDate
    ),

    createdAt

  ]);


  return sendSuccess({

    journalId:
      journalId,

    message:
      'Journal created successfully'

  });
}


// ============================================================================
// DELETE JOURNAL
// ============================================================================

function handleDeleteJournal(
  journalId,
  username
) {

  if (
    !journalId ||
    !username
  ) {

    return sendError(
      'JournalID and username are required'
    );
  }


  const journalsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        JOURNALS_SHEET
      );


  const data =
    journalsSheet
      .getDataRange()
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (
      data[i][0] === journalId &&
      String(data[i][1]).trim() ===
        String(username).trim()
    ) {

      journalsSheet.deleteRow(
        i + 1
      );


      return sendSuccess({

        message:
          'Journal deleted successfully'

      });
    }
  }


  return sendError(
    'Journal not found or unauthorized'
  );
}


// ============================================================================
// GET JOURNAL DETAILS
// ============================================================================

function handleGetJournalDetails(
  journalId,
  username
) {

  if (
    !journalId ||
    !username
  ) {

    return sendError(
      'JournalID and username are required'
    );
  }


  const journalsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        JOURNALS_SHEET
      );


  const journalData =
    journalsSheet
      .getDataRange()
      .getValues();


  let journalDetails =
    null;


  for (
    let i = 1;
    i < journalData.length;
    i++
  ) {

    if (
      journalData[i][0] ===
        journalId &&

      String(
        journalData[i][1]
      ).trim() ===
        String(username).trim()
    ) {

      journalDetails = {

        journalId:
          journalData[i][0],

        journalName:
          journalData[i][2],

        targetAmount:
          parseFloat(
            journalData[i][3]
          ) || 0,

        startDate:
          normalizeDateString(
            journalData[i][4]
          ),

        endDate:
          normalizeDateString(
            journalData[i][5]
          ),

        createdAt:
          journalData[i][6]

      };

      break;
    }
  }


  if (!journalDetails) {

    return sendError(
      'Journal not found or unauthorized'
    );
  }


  const transactions =
    getTransactionsForJournal(
      journalId,
      username
    );


  const stats =
    calculateJournalStats(
      journalDetails,
      transactions
    );


  return sendSuccess({

    journal:
      journalDetails,

    stats:
      stats,

    transactions:
      transactions

  });
}


// ============================================================================
// JOURNAL STATISTICS
// ============================================================================

function calculateJournalStats(
  journal,
  transactions
) {

  const startDate =
    parseDateOnly(
      journal.startDate
    );


  const endDate =
    parseDateOnly(
      journal.endDate
    );


  // IMPORTANT:
  // Current date is always Asia/Kolkata.

  const todayString =
    getKolkataDateString();


  const today =
    parseDateOnly(
      todayString
    );


  let totalProfit =
    0;

  let totalLoss =
    0;


  const dailyNetProfit =
    {};


  for (
    const txn of transactions
  ) {

    const txnDate =
      normalizeDateString(
        txn.transactionDate
      );


    const amount =
      parseFloat(
        txn.amount
      ) || 0;


    if (
      !Object.prototype
        .hasOwnProperty.call(
          dailyNetProfit,
          txnDate
        )
    ) {

      dailyNetProfit[
        txnDate
      ] = 0;
    }


    if (
      txn.type === 'PROFIT'
    ) {

      totalProfit +=
        amount;

      dailyNetProfit[
        txnDate
      ] += amount;

    }

    else if (
      txn.type === 'LOSS'
    ) {

      totalLoss +=
        amount;

      dailyNetProfit[
        txnDate
      ] -= amount;
    }
  }


  const netPL =
    totalProfit -
    totalLoss;


  const daysCompleted =
    Math.floor(
      (
        today.getTime() -
        startDate.getTime()
      ) /
      86400000
    );


  const daysRemaining =
    Math.ceil(
      (
        endDate.getTime() -
        today.getTime()
      ) /
      86400000
    );


  const totalDays =
    Math.ceil(
      (
        endDate.getTime() -
        startDate.getTime()
      ) /
      86400000
    );


  const target =
    parseFloat(
      journal.targetAmount
    ) || 0;


  const amountStillNeeded =
    Math.max(
      0,
      target -
      netPL
    );


  const progressPercentage =
    target > 0
      ? (
          netPL /
          target
        ) * 100
      : 0;


  let bestDay =
    null;

  let bestDayAmount =
    -Infinity;


  let worstDay =
    null;

  let worstDayAmount =
    Infinity;


  for (
    const date in
    dailyNetProfit
  ) {

    const value =
      dailyNetProfit[
        date
      ];


    if (
      value >
      bestDayAmount
    ) {

      bestDayAmount =
        value;

      bestDay =
        date;
    }


    if (
      value <
      worstDayAmount
    ) {

      worstDayAmount =
        value;

      worstDay =
        date;
    }
  }


  const transactionDayCount =
    Object.keys(
      dailyNetProfit
    ).length;


  if (
    transactionDayCount === 0
  ) {

    bestDayAmount = 0;
    worstDayAmount = 0;
  }


  const avgProfitPerDay =
    transactionDayCount > 0
      ? netPL /
        transactionDayCount
      : 0;


  const requiredPerDay =
    daysRemaining > 0
      ? amountStillNeeded /
        daysRemaining
      : 0;


  return {

    totalProfit:
      totalProfit,

    totalLoss:
      totalLoss,

    netPL:
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

    totalDays:
      totalDays,

    amountStillNeeded:
      amountStillNeeded,

    progressPercentage:
      Math.min(
        100,
        Math.max(
          0,
          progressPercentage
        )
      ),

    dailyNetProfit:
      dailyNetProfit,

    bestDay:
      bestDay,

    bestDayAmount:
      bestDayAmount,

    worstDay:
      worstDay,

    worstDayAmount:
      worstDayAmount,

    avgProfitPerDay:
      avgProfitPerDay,

    requiredPerDay:
      requiredPerDay,

    totalTransactions:
      transactions.length
  };
}


// ============================================================================
// ADD TRANSACTION
// ============================================================================

function handleAddTransaction(
  journalId,
  username,
  type,
  amount
) {

  if (
    !journalId ||
    !username ||
    !type ||
    amount === undefined ||
    amount === null
  ) {

    return sendError(
      'All transaction fields are required'
    );
  }


  if (
    type !== 'PROFIT' &&
    type !== 'LOSS'
  ) {

    return sendError(
      'Type must be PROFIT or LOSS'
    );
  }


  const parsedAmount =
    parseFloat(
      amount
    );


  if (
    !Number.isFinite(
      parsedAmount
    ) ||
    parsedAmount <= 0
  ) {

    return sendError(
      'Amount must be greater than 0'
    );
  }


  // ----------------------------------------------------------
  // VERIFY JOURNAL OWNERSHIP
  // ----------------------------------------------------------

  const journal =
    findOwnedJournal(
      journalId,
      username
    );


  if (!journal) {

    return sendError(
      'Journal not found or unauthorized'
    );
  }


  // ----------------------------------------------------------
  // IMPORTANT:
  // DO NOT TRUST THE BROWSER'S DATE.
  //
  // The backend decides today's date using
  // Asia/Kolkata.
  //
  // Therefore:
  //
  // 11 Aug 11:59:59 PM IST
  //     = 11 Aug
  //
  // 12 Aug 12:00:00 AM IST
  //     = 12 Aug
  // ----------------------------------------------------------

  const transactionDate =
    getKolkataDateString();


  const transactionsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        TRANSACTIONS_SHEET
      );


  const transactionId =
    'T_' +
    Utilities
      .getUuid()
      .substring(
        0,
        8
      );


  const timestamp =
    new Date()
      .toISOString();


  transactionsSheet.appendRow([

    transactionId,

    journalId,

    username,

    type,

    parsedAmount,

    transactionDate,

    timestamp

  ]);


  return sendSuccess({

    transactionId:
      transactionId,

    transactionDate:
      transactionDate,

    timestamp:
      timestamp,

    message:
      'Transaction added successfully'

  });
}


// ============================================================================
// GET TRANSACTIONS
// ============================================================================

function handleGetTransactions(
  journalId,
  username
) {

  if (
    !journalId ||
    !username
  ) {

    return sendError(
      'JournalID and username are required'
    );
  }


  if (
    !findOwnedJournal(
      journalId,
      username
    )
  ) {

    return sendError(
      'Journal not found or unauthorized'
    );
  }


  const transactions =
    getTransactionsForJournal(
      journalId,
      username
    );


  transactions.sort(
    function(a, b) {

      return (
        new Date(
          b.timestamp
        ) -
        new Date(
          a.timestamp
        )
      );
    }
  );


  return sendSuccess({

    transactions:
      transactions,

    count:
      transactions.length

  });
}


// ============================================================================
// GET TRANSACTIONS BY DATE
// ============================================================================

function handleGetTransactionsByDate(
  journalId,
  username,
  date
) {

  if (
    !journalId ||
    !username ||
    !date
  ) {

    return sendError(
      'JournalID, username, and date are required'
    );
  }


  if (
    !findOwnedJournal(
      journalId,
      username
    )
  ) {

    return sendError(
      'Journal not found or unauthorized'
    );
  }


  const requestedDate =
    normalizeDateString(
      date
    );


  const transactionsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        TRANSACTIONS_SHEET
      );


  const data =
    transactionsSheet
      .getDataRange()
      .getValues();


  const transactions = [];


  let totalProfit =
    0;

  let totalLoss =
    0;


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    const rowJournalId =
      data[i][1];

    const rowUsername =
      String(
        data[i][2]
      ).trim();

    const rowDate =
      normalizeDateString(
        data[i][5]
      );


    if (
      rowJournalId ===
        journalId &&

      rowUsername ===
        String(username).trim() &&

      rowDate ===
        requestedDate
    ) {

      const amount =
        parseFloat(
          data[i][4]
        ) || 0;


      const type =
        String(
          data[i][3]
        ).toUpperCase();


      transactions.push({

        transactionId:
          data[i][0],

        type:
          type,

        amount:
          amount,

        timestamp:
          data[i][6]

      });


      if (
        type === 'PROFIT'
      ) {

        totalProfit +=
          amount;

      }

      else if (
        type === 'LOSS'
      ) {

        totalLoss +=
          amount;
      }
    }
  }


  transactions.sort(
    function(a, b) {

      return (
        new Date(
          b.timestamp
        ) -
        new Date(
          a.timestamp
        )
      );
    }
  );


  return sendSuccess({

    transactions:
      transactions,

    totalProfit:
      totalProfit,

    totalLoss:
      totalLoss,

    netPL:
      totalProfit -
      totalLoss,

    count:
      transactions.length

  });
}


// ============================================================================
// GET TRANSACTIONS FOR JOURNAL
// ============================================================================

function getTransactionsForJournal(
  journalId,
  username
) {

  const transactionsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        TRANSACTIONS_SHEET
      );


  const data =
    transactionsSheet
      .getDataRange()
      .getValues();


  const transactions =
    [];


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (

      data[i][1] ===
        journalId &&

      String(
        data[i][2]
      ).trim() ===
        String(username).trim()

    ) {

      transactions.push({

        transactionId:
          data[i][0],

        journalId:
          data[i][1],

        type:
          String(
            data[i][3]
          ).toUpperCase(),

        amount:
          parseFloat(
            data[i][4]
          ) || 0,

        transactionDate:
          normalizeDateString(
            data[i][5]
          ),

        timestamp:
          data[i][6]

      });
    }
  }


  return transactions;
}


// ============================================================================
// FIND OWNED JOURNAL
// ============================================================================

function findOwnedJournal(
  journalId,
  username
) {

  const journalsSheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        JOURNALS_SHEET
      );


  const data =
    journalsSheet
      .getDataRange()
      .getValues();


  for (
    let i = 1;
    i < data.length;
    i++
  ) {

    if (

      data[i][0] ===
        journalId &&

      String(
        data[i][1]
      ).trim() ===
        String(username).trim()

    ) {

      return {

        journalId:
          data[i][0],

        username:
          data[i][1],

        journalName:
          data[i][2],

        targetAmount:
          parseFloat(
            data[i][3]
          ) || 0,

        startDate:
          normalizeDateString(
            data[i][4]
          ),

        endDate:
          normalizeDateString(
            data[i][5]
          ),

        createdAt:
          data[i][6]

      };
    }
  }


  return null;
}


// ============================================================================
// KOLKATA DATE FUNCTIONS
// ============================================================================

function getKolkataDateString() {

  return Utilities.formatDate(
    new Date(),
    APP_TIMEZONE,
    'yyyy-MM-dd'
  );
}


// ============================================================================
// NORMALIZE DATE
// ============================================================================

function normalizeDateString(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {

    return '';
  }


  // If Google Sheets gives us a Date object
  if (
    Object.prototype.toString
      .call(value) ===
      '[object Date]'
  ) {

    return Utilities.formatDate(
      value,
      APP_TIMEZONE,
      'yyyy-MM-dd'
    );
  }


  const text =
    String(value).trim();


  // Already YYYY-MM-DD
  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );


  if (match) {

    return (
      match[1] +
      '-' +
      match[2] +
      '-' +
      match[3]
    );
  }


  return text;
}


// ============================================================================
// DATE-ONLY PARSER
// ============================================================================
// Parses YYYY-MM-DD without relying on the browser/server timezone.

function parseDateOnly(
  dateString
) {

  const clean =
    normalizeDateString(
      dateString
    );


  const parts =
    clean.split('-');


  if (
    parts.length !== 3
  ) {

    return new Date(
      'invalid'
    );
  }


  return new Date(
    Date.UTC(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    )
  );
}


// ============================================================================
// JSON RESPONSE HELPERS
// ============================================================================

function sendSuccess(
  data
) {

  return ContentService
    .createTextOutput(
      JSON.stringify({

        status:
          'success',

        data:
          data

      })
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


function sendError(
  message
) {

  return ContentService
    .createTextOutput(
      JSON.stringify({

        status:
          'error',

        message:
          message

      })
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}


// ============================================================================
// OPTIONS
// ============================================================================

function doOptions(e) {

  return ContentService
    .createTextOutput('')
    .setMimeType(
      ContentService.MimeType.TEXT
    );
}

function doGet(e) {
  return ContentService
    .createTextOutput(
      JSON.stringify({
        status: "success",
        message: "Profit Journal API is running",
        timezone: "Asia/Kolkata"
      })
    )
    .setMimeType(ContentService.MimeType.JSON);
}
