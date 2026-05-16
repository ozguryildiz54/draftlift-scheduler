"use strict";
const fs = require("fs");
const fsp = require("fs/promises");
const {
  DIR_STORAGE,
  FILE_SCHEDULE,
  FILE_ADMIN_CONFIG,
  DIR_DRAFTS,
  DIR_PROJECTS,
  DIR_DELETED,
} = require("./paths");

async function ensureDefaults() {
  // Create the storage tree and working folders if they don't exist yet.
  await fsp.mkdir(DIR_STORAGE, { recursive: true });
  await fsp.mkdir(DIR_DRAFTS, { recursive: true });
  await fsp.mkdir(DIR_PROJECTS, { recursive: true });
  await fsp.mkdir(DIR_DELETED, { recursive: true });

  if (!fs.existsSync(FILE_SCHEDULE)) {
    await fsp.writeFile(FILE_SCHEDULE, "[]\n");
  }

  if (!fs.existsSync(FILE_ADMIN_CONFIG)) {
    const seed = {
      DEFAULT_TZ: 180,
      GIT: {
        enabled: false,
        userName: "",
        userEmail: "",
        username: "",
        auth: "token",
        token: "",
        password: "",
        branch: "main",
        owner: "",
        remoteTpl: "https://github.com/{owner}/{project}.git",
        autoCreate: true,
        private: true,
      },
    };
    await fsp.writeFile(
      FILE_ADMIN_CONFIG,
      JSON.stringify(seed, null, 2) + "\n"
    );
  }
}

module.exports = { ensureDefaults };
