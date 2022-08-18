module.exports = {
  accountName: process.env.ACCOUNT_NAME,
  budgetId: process.env.BUDGET_ID,
  deleteOnSuccess:
    process.env.DELETE_ON_SUCCESS == undefined
      ? true
      : process.env.DELETE_ON_SUCCESS == "TRUE",
  importDirectory: process.env.IMPORT_DIRECTORY || "/import",
  logLevel: process.env.LOG_LEVEL || 0,
  schedule: process.env.CRON_SCHEDULE || "* */30 * * *",
};
