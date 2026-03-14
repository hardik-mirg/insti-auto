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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push not supported')
      return false
    }

    // Register our custom SW
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    // Request permission
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Push permission denied')
      return false
    }

    // Subscribe
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // Save to Supabase
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: subscription.toJSON()
    }, { onConflict: 'user_id' })

    if (error) console.error('Failed to save subscription:', error)
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

// Hook — call in App or page components to auto-subscribe
export function usePushNotifications(userId) {
  useEffect(() => {
    if (!userId) return
    // Auto-subscribe when user is logged in
    subscribeToPush(userId)
  }, [userId])
}