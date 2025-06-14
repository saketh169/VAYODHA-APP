self.addEventListener('push', function(event) {
    const options = {
        body: event.data.text(),
        icon: '/images/logo.svg',
        badge: '/images/logo.svg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'view',
                title: 'View Details',
                icon: '/images/icons/view.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/images/icons/dismiss.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Vayodha Healthcare', options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'view') {
        // Handle view action
        event.waitUntil(
            clients.openWindow('/patient-dashboard.html')
        );
    }
});

// Handle background sync for offline functionality
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-health-data') {
        event.waitUntil(syncHealthData());
    }
});

async function syncHealthData() {
    try {
        const cache = await caches.open('health-data');
        const requests = await cache.keys();
        
        for (const request of requests) {
            const response = await cache.match(request);
            const data = await response.json();
            
            // Send cached data to server
            await fetch(request, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            // Remove from cache after successful sync
            await cache.delete(request);
        }
    } catch (error) {
        console.error('Error syncing health data:', error);
    }
}

// Cache static assets for offline access
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('static-v1').then(function(cache) {
            return cache.addAll([
                '/',
                '/css/styles.css',
                '/js/patient-dashboard.js',
                '/images/logo.svg',
                '/images/icons/view.png',
                '/images/icons/dismiss.png'
            ]);
        })
    );
}); 