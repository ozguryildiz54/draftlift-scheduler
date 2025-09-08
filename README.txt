DraftLift 🚀
DraftLift is an automation tool that enables you to schedule and automatically publish all the software projects you have developed and completed on a specific date via GitHub. With this tool, you can upload your projects as "drafts," manage the publication schedule through a web interface, and, when the time comes, have your project automatically moved to a live environment and sent to a Git repository.

Visual Preview
DraftLift's modern and functional interface allows you to manage the entire publishing process from a single screen.

Main Control Panel | Quick Start Guide | Error Detail Viewing

Main Panel: List your projects, change their schedules, and track their publication statuses in real-time.

Transaction History: Transparently view all successful publications, updates, and potential errors through the "History" panel on the right.

Easy Debugging: In case of a publication error, instantly access technical details showing the source of the problem with "Show Details."

✨ Key Features

📅 Publishing and Scheduling

Automatic Publishing: A scheduler (cron job) running in the background automatically publishes projects when their time comes.

Manual Triggering: You can instantly scan and publish all due projects with the "Trigger Scan" button on the interface.

Flexible Calendar Management: Easily change the publication dates of projects through a modern, web-based interface.

📂 File Management

Project Upload: Easily upload your project folders to the drafts/ folder through the web interface.

Organized Folder Structure: Drafts are kept under drafts/, and published ones are under projects/.

Secure Deletion: Deleted projects are archived in the deleted/ folder for recovery.

🌐 GitHub Integration

Automatic Repository Creation: If a remote repository does not exist for a project, a new one can be automatically created on GitHub.

Flexible Repository Visibility: You can choose whether the created repositories are Public or Private, both from the general settings and on a per-project basis.

Connection Test: You can instantly check the accuracy of your GitHub token and settings with the "Test Git Connection" button in the settings menu.

⚙️ Admin Panel and UX

Transaction History (Audit Log): All publishing, deletion, and error statuses are saved to the storage/audit.jsonl file and can be monitored instantly from the interface.

Maintenance Tools: Reset the entire scheduling calendar or application settings to their default state with a single click.

Secure Configuration: Sensitive information is securely stored in the .env file, while general settings are managed from the data/admin-config.json file.

🛠️ Technology Architecture

Backend: Node.js, Express.js, node-cron, dotenv, Busboy

Frontend: Vanilla JavaScript (ES Modules), SCSS, Flatpickr

Development Environment: Nodemon, Sass, Concurrently

📂 Project Structure

draftlift/
├─ data/ # Core data (schedule.json, admin-config.json)
├─ drafts/ # Draft projects awaiting publication
├─ projects/ # Published and live projects
├─ deleted/ # Archive of projects deleted from the interface
├─ lib/ # Backend helper modules (git.js, publish.js)
├─ routes/ # Express API route definitions
├─ public/ # Frontend files (index.html, js, css)
├─ src/scss/ # Uncompiled SCSS source codes
├─ storage/ # Audit records (audit.jsonl)
├─ middleware/ # Express middleware (error handling, etc.)
├─ .env # Environment variables (sensitive data like GitHub Token)
├─ app.js # Main Express server file
└─ package.json # Project dependencies and scripts
🚀 Installation and Launch

Prerequisites

Node.js (v18 or higher)

The Git command-line tool must be installed on your system.

Cloning the Project

Bash

git clone https://github.com/USERNAME/draftlift.git
cd draftlift
Installing Dependencies

Bash

npm install
Setting Environment Variables
Create a file named .env in the root directory of the project:

Ini, TOML

# .env

# GitHub Personal Access Token (PAT) - must have "repo" permission
GITHUB_TOKEN=ghp_YOUR_PERSONAL_ACCESS_TOKEN

# Your GitHub username that will own the project repositories
GIT_OWNER=your-github-username

# Default branch to push to repositories
GIT_BRANCH=main
🔐 Note: Sensitive information like tokens is only read from the .env file and is never written to files like admin-config.json.

Running the Application

Development Mode: npm run dev

Production Mode: npm start

The application will run by default at http://localhost:3000.

🎮 Usage
It is quite easy to use and user-friendly. You can quickly upload and schedule your project and configure your settings. In addition to automatic publishing, you can also manually trigger tasks that are due, even if they have past dates due to server density or other situations, by using the "Trigger Scan" button on the interface.

🛠️ Developer Notes

API Endpoints

GET /api/schedule: Fetches all scheduling data.

POST /api/schedule: Saves/updates scheduling data.

POST /api/upload: Uploads a new project to the drafts folder.

GET /api/config: Fetches yönetici settings.

POST /api/config: Saves yönetici settings.

POST /api/git/test: Tests the connection with the current Git settings.

DELETE /api/history: Deletes all transaction history.

Sample Audit Record
Every transaction in the storage/audit.jsonl file is recorded in this format:

JSON

{"time":"2025-09-08T16:55:00.123Z","event":"git_push_ok","name":"my-awesome-project","remote":"https://github.com/owner/my-awesome-project.git"}
✅ Conclusion
DraftLift is a lightweight but powerful admin panel developed for scheduled content publication, supported by GitHub. With this tool, you can easily plan your content, automate the publication process, and transparently track all transactions.