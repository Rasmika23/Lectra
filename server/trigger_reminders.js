require('dotenv').config();
const whatsappService = require('./services/WhatsAppService');
const reminderScheduler = require('./services/ReminderScheduler');

async function run() {
    console.log("=== REMINDER TRIGGER UTILITY ===");
    console.log("Note: Please ensure the main server is NOT running to avoid Puppeteer locks.");
    
    try {
        console.log("Initializing WhatsApp...");
        await whatsappService.initialize();
        
        console.log("Waiting 5s for connection status...");
        await new Promise(r => setTimeout(r, 5000));

        console.log("Triggering reminder check...");
        await reminderScheduler.checkAndSendReminders();
        
        console.log("Done! Closing in 2s...");
        await new Promise(r => setTimeout(r, 2000));
        process.exit(0);
    } catch (e) {
        console.error("Error running reminders:", e);
        process.exit(1);
    }
}

run();
