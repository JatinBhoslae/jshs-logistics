import { checkIotAlerts } from './iotService.js';

let iotIntervalId = null;

export function startScheduler() {
    console.log('[Scheduler] Starting background tasks...');

    // Check IoT alerts every 30 seconds for the demo
    iotIntervalId = setInterval(async () => {
        try {
            await checkIotAlerts();
        } catch (err) {
            console.error('[Scheduler] Error in iot check:', err);
        }
    }, 30000);
}

export function stopScheduler() {
    if (iotIntervalId) {
        clearInterval(iotIntervalId);
    }
}
