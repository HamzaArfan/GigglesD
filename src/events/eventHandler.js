const guildMemberAdd = require('./guildMemberAdd');
const guildCreate = require('./guildCreate');
const guildDelete = require('./guildDelete');
const messageUpdate = require('./messageUpdate');

/**
 * Register all event handlers for the Discord client
 * @param {Client} client - Discord client instance
 */
function eventHandler(client) {
    console.log('📡 Loading event handlers...');

    // Guild member events
    client.on('guildMemberAdd', (member) => guildMemberAdd(client, member));
    
    // Guild events
    client.on('guildCreate', (guild) => guildCreate(client, guild));
    client.on('guildDelete', (guild) => guildDelete(client, guild));
    
    // Message events
    client.on('messageUpdate', (oldMessage, newMessage) => messageUpdate(client, oldMessage, newMessage));

    console.log('✅ Event handlers loaded successfully');
}

module.exports = eventHandler; 