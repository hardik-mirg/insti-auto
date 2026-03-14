import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Minimal VAPID-signed web push implementation
async function sendPushNotification(subscription: any, payload: { title: string, body: string, icon?: string }) {
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  const vapidSubject = 'mailto:admin@instiauto.app'

  const endpoint = subscription.endpoint
  const p256dh = subscription.keys.p256dh
  const auth = subscription.keys.auth

  // Build the push payload
  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/' }
  })

  // Use web-push compatible library via esm.sh
  const { default: webpush } = await import('https://esm.sh/web-push@3.6.7')

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  try {
    await webpush.sendNotification(subscription, payloadStr)
    return true
  } catch (e: any) {
    if (e.statusCode === 410 || e.statusCode === 404) {
      // Subscription expired — delete it
      return 'expired'
    }
    throw e
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, title, body, icon } = await req.json()

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get user's push subscription
    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single()

    if (!sub) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const result = await sendPushNotification(sub.subscription, { title, body, icon })

    if (result === 'expired') {
      // Clean up expired subscription
      await supabase.from('push_subscriptions').delete().eq('user_id', user_id)
      return new Response(JSON.stringify({ error: 'Subscription expired' }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e: any) {
    console.error('Push error:', e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})