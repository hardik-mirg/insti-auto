// InstiAuto Service Worker
// Handles push notifications and caches app shell

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'InstiAuto', body: event.data.text() }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: data.vibrate || [200, 100, 200],
    data: data.data || { url: '/' },
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || []
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})