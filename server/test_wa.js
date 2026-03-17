const { Client, LocalAuth } = require('./services/WhatsAppService');
const wa = require('./services/WhatsAppService');

(async () => {
    try {
        await wa.initialize();
        console.log("Initialization triggered");
    } catch (e) {
        console.error("Failed to initialize:", e);
        process.exit(1);
    }
})();
