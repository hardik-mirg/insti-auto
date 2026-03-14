import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Round coordinates to ~11m precision to maximize cache hits
function round(n: number) {
  return Math.round(n * 10000) / 10000
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng } = await req.json()

    if (!origin_lat || !origin_lng || !dest_lat || !dest_lng) {
      return new Response(JSON.stringify({ error: 'Missing coordinates' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const oLat = round(origin_lat)
    const oLng = round(origin_lng)
    const dLat = round(dest_lat)
    const dLng = round(dest_lng)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check cache first
    const { data: cached } = await supabase
      .from('route_cache')
      .select('distance_km, geometry')
      .eq('origin_lat', oLat).eq('origin_lng', oLng)
      .eq('dest_lat', dLat).eq('dest_lng', dLng)
      .single()

    if (cached) {
      console.log('Cache hit!')
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Not cached — fetch from ORS
    console.log('Cache miss — fetching from ORS')
    const orsKey = Deno.env.get('ORS_API_KEY')
    const orsRes = await fetch(
      `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${oLng},${oLat}&end=${dLng},${dLat}`
    )
    const orsData = await orsRes.json()

    const feature = orsData.features?.[0]
    if (!feature) {
      return new Response(JSON.stringify({ error: 'No route found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const distance_km = feature.properties.segments[0].distance / 1000
    const geometry = feature.geometry

    // Cache it
    await supabase.from('route_cache').insert({
      origin_lat: oLat, origin_lng: oLng,
      dest_lat: dLat, dest_lng: dLng,
      distance_km, geometry
    })

    return new Response(JSON.stringify({ distance_km, geometry }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})