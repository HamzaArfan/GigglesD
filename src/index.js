require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { initializeSupabase } = require('./database/supabase');
const eventHandler = require('./events/eventHandler');
const sendStaticAnnouncement = require('./utils/announcement');

// Initialize Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers, // Enabled - Server Members Intent should be enabled in Discord Portal
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent // Added for detecting URLs in messages
    ]
});

// Initialize Supabase connection
const supabase = initializeSupabase();

// Make supabase available globally on the client
client.supabase = supabase;

// Load event handlers
eventHandler(client);

// Bot ready event
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} is online and ready!`);
    console.log(`📊 Serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users`);
    
    // Set bot activity
    client.user.setActivity('for new members! 👋', { type: 'WATCHING' });

    // Send static announcement in each guild (only once per guild)
    for (const guild of client.guilds.cache.values()) {
        await sendStaticAnnouncement(guild);
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN)
    .then(() => {
        console.log('🔑 Successfully logged in to Discord');
    })
    .catch(error => {
        console.error('❌ Failed to login to Discord:', error);
        process.exit(1);
    }); 