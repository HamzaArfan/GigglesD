#!/usr/bin/env node

/**
 * GigglesD Discord Bot Setup Script
 * Validates environment and tests connections
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 GigglesD Discord Bot Setup\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📝 Please create a .env file with the following variables:');
    console.log(`
DISCORD_BOT_TOKEN=your_discord_bot_token_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
NODE_ENV=development
    `);
    process.exit(1);
}

// Load environment variables
require('dotenv').config();

console.log('✅ .env file found');

// Check required environment variables
const requiredVars = {
    'DISCORD_BOT_TOKEN': process.env.DISCORD_BOT_TOKEN,
    'SUPABASE_URL': process.env.SUPABASE_URL,
    'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY
};

let missingVars = [];

for (const [varName, value] of Object.entries(requiredVars)) {
    if (!value) {
        missingVars.push(varName);
        console.log(`❌ Missing: ${varName}`);
    } else {
        console.log(`✅ Found: ${varName}`);
    }
}

if (missingVars.length > 0) {
    console.log(`\n❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.log('Please add them to your .env file and run setup again.');
    process.exit(1);
}

// Test Supabase connection
async function testSupabase() {
    try {
        console.log('\n🔍 Testing Supabase connection...');
        const { createClient } = require('@supabase/supabase-js');
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY
        );

        // Test connection by trying to query a table
        const { error } = await supabase
            .from('guilds')
            .select('count')
            .limit(1);

        if (error) {
            if (error.message.includes('relation "guilds" does not exist')) {
                console.log('⚠️  Supabase connected, but tables not found');
                console.log('📊 Please create the required database tables:');
                console.log('   - guilds');
                console.log('   - member_joins');
                console.log('📖 Check the README.md for complete SQL schema');
                return false;
            } else {
                console.log('❌ Supabase connection failed:', error.message);
                return false;
            }
        }

        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.log('❌ Supabase test failed:', error.message);
        return false;
    }
}

// Test Discord token format
function testDiscordToken() {
    console.log('\n🔍 Testing Discord token format...');
    const token = process.env.DISCORD_BOT_TOKEN;
    
    // Basic token format validation
    if (token.length < 50) {
        console.log('❌ Discord token appears to be too short');
        return false;
    }
    
    if (!token.includes('.')) {
        console.log('❌ Discord token format appears invalid');
        return false;
    }
    
    console.log('✅ Discord token format looks valid');
    return true;
}

// Check Node.js version
function checkNodeVersion() {
    console.log('\n🔍 Checking Node.js version...');
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    
    if (majorVersion < 16) {
        console.log(`❌ Node.js ${nodeVersion} detected. Please upgrade to Node.js 16 or higher.`);
        return false;
    }
    
    console.log(`✅ Node.js ${nodeVersion} - Compatible`);
    return true;
}

// Check if dependencies are installed
function checkDependencies() {
    console.log('\n🔍 Checking dependencies...');
    
    try {
        require('discord.js');
        console.log('✅ discord.js installed');
    } catch (error) {
        console.log('❌ discord.js not installed - run: npm install');
        return false;
    }
    
    try {
        require('@supabase/supabase-js');
        console.log('✅ @supabase/supabase-js installed');
    } catch (error) {
        console.log('❌ @supabase/supabase-js not installed - run: npm install');
        return false;
    }
    
    try {
        require('dotenv');
        console.log('✅ dotenv installed');
    } catch (error) {
        console.log('❌ dotenv not installed - run: npm install');
        return false;
    }
    
    return true;
}

async function runSetup() {
    let allPassed = true;
    
    // Run all checks
    if (!checkNodeVersion()) allPassed = false;
    if (!checkDependencies()) allPassed = false;
    if (!testDiscordToken()) allPassed = false;
    if (!(await testSupabase())) allPassed = false;
    
    console.log('\n' + '='.repeat(50));
    
    if (allPassed) {
        console.log('🎉 Setup validation passed! Your bot is ready to run.');
        console.log('\n🚀 To start your bot:');
        console.log('   npm start     # Production mode');
        console.log('   npm run dev   # Development mode with auto-restart');
        console.log('\n📚 Need help? Check the README.md for detailed instructions.');
    } else {
        console.log('❌ Setup validation failed. Please fix the issues above and run setup again.');
        console.log('\n🆘 Need help?');
        console.log('   1. Check your .env file');
        console.log('   2. Verify your Discord bot token');
        console.log('   3. Ensure Supabase is configured');
        console.log('   4. Create database tables (see README.md)');
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    runSetup().catch(error => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
}

module.exports = { testSupabase, testDiscordToken, checkNodeVersion, checkDependencies }; 