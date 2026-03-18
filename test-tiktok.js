import { WebcastPushConnection } from 'tiktok-live-connector';

const username = '_hieuvt_';

const tiktokConnection = new WebcastPushConnection(username, {
    clientParams: {
        "app_language": "vi-VN",
        "device_platform": "web"
    }
});

function searchKeys(obj, prefix = '') {
    if (typeof obj !== 'object' || obj === null) return;
    for (const key in obj) {
        if (key.toLowerCase().includes('follow') || key.toLowerCase().includes('nick') || key.toLowerCase().includes('owner') || key.toLowerCase().includes('display')) {
            console.log(`Found: ${prefix}.${key}`);
            if (typeof obj[key] !== 'object') {
                console.log(`Value: ${obj[key]}`);
            }
        }
        if (typeof obj[key] === 'object') {
            searchKeys(obj[key], `${prefix}.${key}`);
        }
    }
}

tiktokConnection.connect().then(state => {
    console.log("Connected. Searching for host keys...");
    searchKeys(state, 'state');
    
    // specifically print owner if exists
    if (state.roomInfo.owner) {
        console.log("ROOT OWNER:", JSON.stringify(state.roomInfo.owner, null, 2));
    }
    process.exit(0);
}).catch(err => {
    console.error("Failed", err);
    process.exit(1);
});
