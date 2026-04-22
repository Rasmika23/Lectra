const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.connectionState = 'connecting'; // connecting, open, close
  }

  async initialize() {
    this.client = new Client({
      authStrategy: new LocalAuth({ clientId: "lectra-server" }),
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-js/main/dist/wppconnect-wa.js',
      },
      puppeteer: {
          headless: true, // Use standard headless
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
      }
    });

    this.client.on('qr', (qr) => {
        // Render QR in terminal
        qrcode.generate(qr, { small: true });
        console.log("Scan this QR code with WhatsApp to connect.");
    });

    this.client.on('ready', () => {
        console.log('WhatsApp connection opened successfully!');
        this.connectionState = 'open';
    });
    
    this.client.on('disconnected', (reason) => {
        console.log('WhatsApp connection closed due to:', reason);
        this.connectionState = 'close';
    });

    this.client.initialize();
  }

  /**
   * Gracefully close the WhatsApp connection and Chromium browser
   */
  async destroy() {
    if (this.client) {
      try {
        console.log('Closing WhatsApp connection...');
        await this.client.destroy();
        this.connectionState = 'close';
      } catch (err) {
        console.error('Error during WhatsApp logout:', err);
      }
    }
  }

  /**
   * Send a WhatsApp message to a given phone number
   * @param {string} phoneNumber - Phone number with country code (e.g., "94771234567")
   * @param {string} message - The text message to send
   */
  async sendMessage(phoneNumber, message) {
    if (this.connectionState !== 'open' || !this.client) {
      console.warn('WhatsApp is not connected. Cannot send message to', phoneNumber);
      return false;
    }

    try {
      // Format number for whatsapp-web.js (e.g., 94771234567@c.us)
      const formattedNumber = phoneNumber.replace(/[^0-9]/g, '') + '@c.us';
      
      await this.client.sendMessage(formattedNumber, message);
      console.log(`WhatsApp message sent successfully to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error(`Error sending WhatsApp message to ${phoneNumber}:`, error);
      return false;
    }
  }
}

// Export a singleton instance
const whatsappService = new WhatsAppService();
module.exports = whatsappService;
