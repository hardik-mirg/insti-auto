-- InstiAuto Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- for location queries

-- Profiles table (for both students and drivers)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('student', 'driver')),
  avatar_url TEXT,
  otp_pin TEXT(4), -- 4-digit fixed OTP for students
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver details (additional info for drivers)
CREATE TABLE driver_details (
  id UUID REFERENCES profiles(id) PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  is_available BOOLEAN DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  last_location_update TIMESTAMPTZ,
  total_rides INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.0
);

-- Rides table
CREATE TABLE rides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  driver_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN (
    'searching', 'driver_assigned', 'otp_verified', 'in_progress', 'completed', 'cancelled'
  )),
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_address TEXT NOT NULL,
  drop_lat DOUBLE PRECISION NOT NULL,
  drop_lng DOUBLE PRECISION NOT NULL,
  drop_address TEXT NOT NULL,
  distance_km DECIMAL(10,3),
  fare DECIMAL(10,2),
  otp_verified BOOLEAN DEFAULT false,
  driver_entered_otp TEXT,
  search_radius_km DECIMAL(5,1) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Ride requests (tracks which drivers were notified)
CREATE TABLE ride_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ride_id UUID REFERENCES rides(id) NOT NULL,
  driver_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Drivers visible to all auth users" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Driver details visible to auth users" ON driver_details FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Driver can update own details" ON driver_details FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Students can create rides" ON rides FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Ride parties can view ride" ON rides FOR SELECT USING (auth.uid() = student_id OR auth.uid() = driver_id);
CREATE POLICY "Drivers can update assigned rides" ON rides FOR UPDATE USING (auth.uid() = driver_id OR auth.uid() = student_id);

CREATE POLICY "Drivers can view own requests" ON ride_requests FOR SELECT USING (auth.uid() = driver_id);
CREATE POLICY "System can insert requests" ON ride_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Drivers can update own requests" ON ride_requests FOR UPDATE USING (auth.uid() = driver_id);

-- Function to generate 4-digit OTP on user creation
CREATE OR REPLACE FUNCTION generate_student_otp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'student' THEN
    NEW.otp_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_student_otp
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION generate_student_otp();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE rides;
ALTER PUBLICATION supabase_realtime ADD TABLE ride_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE driver_details;
