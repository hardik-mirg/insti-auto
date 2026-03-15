import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPush(userId) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // Get the existing SW registration (registered by vite-plugin-pwa)
    const reg = await navigator.serviceWorker.ready

    // Import our push handler into the existing SW
    await reg.active?.postMessage({ type: 'IMPORT_PUSH_SW' })

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscription.toJSON()
    }, { onConflict: 'user_id' })

    if (error) console.error('Failed to save push subscription:', error)
    else console.log('Push subscription saved!')
    return true
  } catch (e) {
    console.error('Push subscription error:', e)
    return false
  }
}

export async function sendPushToUser(userId, title, body) {
  try {
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ user_id: userId, title, body })
    })
  } catch (e) {
    console.error('Send push error:', e)
  }
}

export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId) return
    subscribeToPush(userId)
  }, [userId])
}