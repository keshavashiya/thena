-- Insert airports data
INSERT INTO airports (id, name, city, country, iata_code, latitude, longitude)
VALUES
  ('JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 'JFK', 40.6413, -73.7781),
  ('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 'LAX', 33.9416, -118.4085),
  ('ORD', 'O''Hare International Airport', 'Chicago', 'United States', 'ORD', 41.9742, -87.9073),
  ('LHR', 'Heathrow Airport', 'London', 'United Kingdom', 'LHR', 51.4700, -0.4543),
  ('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', 'CDG', 49.0097, 2.5479),
  ('HND', 'Tokyo Haneda Airport', 'Tokyo', 'Japan', 'HND', 35.5494, 139.7798),
  ('SYD', 'Sydney Airport', 'Sydney', 'Australia', 'SYD', -33.9399, 151.1753),
  ('DXB', 'Dubai International Airport', 'Dubai', 'United Arab Emirates', 'DXB', 25.2532, 55.3657),
  ('SFO', 'San Francisco International Airport', 'San Francisco', 'United States', 'SFO', 37.6213, -122.3790),
  ('ATL', 'Hartsfield-Jackson Atlanta International Airport', 'Atlanta', 'United States', 'ATL', 33.6407, -84.4277)
ON CONFLICT (id) DO NOTHING;

-- Insert flights data
INSERT INTO flights (flight_number, departure_airport, arrival_airport, departure_time, arrival_time, price, airline, available_seats, status)
VALUES
  ('AA100', 'JFK', 'LAX', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 6 hours', 299.99, 'American Airlines', 120, 'scheduled'),
  ('DL200', 'LAX', 'JFK', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 5 hours', 329.99, 'Delta Airlines', 150, 'scheduled'),
  ('UA300', 'ORD', 'SFO', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 4 hours', 249.99, 'United Airlines', 180, 'scheduled'),
  ('BA400', 'LHR', 'JFK', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 8 hours', 599.99, 'British Airways', 200, 'scheduled'),
  ('AF500', 'CDG', 'LAX', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 12 hours', 699.99, 'Air France', 170, 'scheduled'),
  ('JAL600', 'HND', 'SFO', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 10 hours', 899.99, 'Japan Airlines', 200, 'scheduled'),
  ('QF700', 'SYD', 'LAX', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days 14 hours', 999.99, 'Qantas', 220, 'scheduled'),
  ('EK800', 'DXB', 'LHR', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 7 hours', 649.99, 'Emirates', 250, 'scheduled'),
  ('DL900', 'ATL', 'LAX', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 5 hours', 279.99, 'Delta Airlines', 140, 'scheduled'),
  ('AA1000', 'SFO', 'JFK', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days 6 hours', 359.99, 'American Airlines', 130, 'scheduled');
