const actual = require("@actual-app/api");
const cron = require("node-cron");
const { exit } = require("process");
const fs = require("fs");
const path = require("path");

const serverConfig = require("../load-config");

const main = async () => {
  if (!envsPresent()) {
    logError("You are missing certain envs!");
    log("This might be fine if this is the first start.");
    log(
      "Once the budget is created set the necessary env variables and restart the container"
    );

    listAvailableBudgets(serverConfig);

    exit(1);
  }

  let config = loadConfig();

  await actual.init({
    config: { dataDir: serverConfig.userFiles },
  });

  await actual.internal.send("load-budget", { id: config.budgetId });
  log("Budget found successfully");

  const accounts = await actual.internal.send("api/accounts-get");
  const account = accounts.filter((account) => account.name == config.accountName);
  if (
    account.length != 1
  ) {
    log(`No account with name ${config.accountName} was found`);
    log(`Found ${accounts.length} account(s)`);
    accounts.forEach((account) => log(`- account name: '${account.name}'`));
    exit(1);
  }
  log("Account found successfully");
  config.accountId = account[0].id;

  await actual.internal.send("close-budget");
  scheduleCron(config);
};

const envsPresent = () => process.env.BUDGET_ID && process.env.ACCOUNT_NAME;

const listAvailableBudgets = (serverConfig) => {
  const userFilesPath = serverConfig.userFiles;

  const budgets = fs.readdirSync(userFilesPath);
  log(`Found ${budgets.length} potential budget(s)`);

  budgets.forEach((budget) => {
    const budgetPath = path.join(userFilesPath, budget);
    const metadataPath = path.join(budgetPath, "metadata.json");

    if (!fs.existsSync(metadataPath)) {
      return;
    }

    const metadataRaw = fs.readFileSync(metadataPath);
    const metadata = JSON.parse(metadataRaw);

    log(
      `- budget directory: ${budget}, name: '${metadata.budgetName}', id: '${metadata.id}'`
    );
  });
};

const loadConfig = () => {
  return {
    budgetId: process.env.BUDGET_ID,
    accountName: process.env.ACCOUNT_NAME,
    importDirectory: process.env.IMPORT_DIRECTORY || "/import",
    schedule: process.env.CRON_SCHEDULE || "* */30 * * *",
    deleteOnSuccess: process.env.DELETE_ON_SUCCESS == undefined ? true : process.env.DELETE_ON_SUCCESS == "TRUE",
  };
};

const scheduleCron = (config) => {
  log(`Scheduling cron job to run ${config.schedule}`);
  cron.schedule(config.schedule, async () => {
    checkNewImport(config);
  });
};

const checkNewImport = async (config) => {
  const importFiles = fs.readdirSync(config.importDirectory);

  if (importFiles.length == 0) {
    log("No new imports!");
    return;
  }

  log(`Found ${importFiles.length} new imports!`);
  await importTransactions(config, importFiles);
  log("Import done");

  if (!config.deleteOnSuccess) {
    return;
  }

  cleanImportDirectoy(config);
};

const importTransactions = async (config, importFiles) => {
  await actual.internal.send("load-budget", { id: config.budgetId });

  importFiles.forEach(async (importFile) => {
    log(`Importing ${importFile}`);

    const importDataRaw = fs.readFileSync(
      path.join(config.importDirectory, importFile)
    );
    const importData = JSON.parse(importDataRaw);

    await actual.internal.send("transactions-import", {
      accountId: config.accountId,
      transactions: importData,
    });
  });
};

const cleanImportDirectoy = (config) => {
  fs.readdirSync(config.importDirectory).forEach(file => {
    fs.rmSync(path.join(config.importDirectory, file))
  })
}

const log = (message) => {
  console.log(`auto-importer| ${message}`);
};

const logError = (message) => {
  console.error(`auto-importer| ${message}`);
};

main();
