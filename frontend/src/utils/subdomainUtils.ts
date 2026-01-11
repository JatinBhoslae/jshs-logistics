
export type AppType = 'MANAGER' | 'DRIVER' | 'CUSTOMER';

export const getAppType = (): AppType => {
    const hostname = window.location.hostname;

    // Subdomain detection
    if (hostname.startsWith('manager.')) return 'MANAGER';
    if (hostname.startsWith('driver.')) return 'DRIVER';

    // Local development overrides via query param ?app=manager | ?app=driver
    // This allows testing without messing with /etc/hosts
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const appParam = urlParams.get('app');
        if (appParam?.toLowerCase() === 'manager') return 'MANAGER';
        if (appParam?.toLowerCase() === 'driver') return 'DRIVER';
    }

    // Default to CUSTOMER (jshs.app main domain)
    return 'CUSTOMER';
};
