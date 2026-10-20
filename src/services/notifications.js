/**
 * Browser Notification Service
 * Handles explicit permission requests, platform checks,
 * and best-effort local notifications via Service Worker or Notification API.
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionStatus() {
  if (!isNotificationSupported()) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    return {
      status: 'unsupported',
      message: 'Browser notifications are not supported on this browser or platform.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    return {
      status: permission,
      granted: permission === 'granted',
      message:
        permission === 'granted'
          ? 'Notifications enabled successfully.'
          : permission === 'denied'
          ? 'Notification permission was denied. You can re-enable it in browser site settings.'
          : 'Notification permission was dismissed.',
    };
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return {
      status: 'error',
      granted: false,
      message: error.message || 'Failed to request notification permission.',
    };
  }
}

/**
 * Display a notification using Service Worker registration or direct Notification constructor
 */
export async function sendLocalNotification(title, options = {}) {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body: options.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: options.tag || `bizcrm-${Date.now()}`,
    renotify: true,
    data: options.data || {},
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // Fallback to desktop Notification constructor
    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.warn('Could not display browser notification:', err);
    return false;
  }
}
