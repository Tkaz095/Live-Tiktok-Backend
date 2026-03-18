import { WebcastPushConnection } from 'tiktok-live-connector';

const username = 'vanlaigaming';

const tiktokConnection = new WebcastPushConnection(username, {
    clientParams: {
        "app_language": "vi-VN",
        "device_platform": "android"
    }
});

function searchKeys(obj, prefix = '') {
    if (typeof obj !== 'object' || obj === null) return;
    for (const key in obj) {
        if (key.toLowerCase().includes('like') || key.toLowerCase().includes('heart') || key.toLowerCase().includes('digg')) {
            console.log(`Found: ${prefix}.${key} = ${obj[key]}`);
        }
        if (typeof obj[key] === 'object') {
            searchKeys(obj[key], `${prefix}.${key}`);
        }
    }
}

tiktokConnection.connect().then(state => {
    console.log("Connected. Searching for like keys...");
    searchKeys(state, 'state');
    process.exit(0);
}).catch(err => {
    console.error("Failed", err);
    process.exit(1);
});
