export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      airports: {
        Row: {
          id: string
          name: string
          city: string
          country: string
          iata_code: string
          latitude?: number
          longitude?: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          city: string
          country: string
          iata_code: string
          latitude?: number
          longitude?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          city?: string
          country?: string
          iata_code?: string
          latitude?: number
          longitude?: number
          created_at?: string
        }
      }
      flights: {
        Row: {
          id: string
          flight_number: string
          airline: string
          departure_airport: string
          arrival_airport: string
          departure_time: string
          arrival_time: string
          price: number
          available_seats: number
          status: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
          created_at: string
        }
        Insert: {
          id?: string
          flight_number: string
          airline: string
          departure_airport: string
          arrival_airport: string
          departure_time: string
          arrival_time: string
          price: number
          available_seats: number
          status?: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
          created_at?: string
        }
        Update: {
          id?: string
          flight_number?: string
          airline?: string
          departure_airport?: string
          arrival_airport?: string
          departure_time?: string
          arrival_time?: string
          price?: number
          available_seats?: number
          status?: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          flight_id: string
          booking_date: string
          status: 'confirmed' | 'cancelled' | 'completed'
          total_amount: number
          cabin_class: 'economy' | 'business' | 'first'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flight_id: string
          booking_date?: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          total_amount: number
          cabin_class: 'economy' | 'business' | 'first'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flight_id?: string
          booking_date?: string
          status?: 'confirmed' | 'cancelled' | 'completed'
          total_amount?: number
          cabin_class?: 'economy' | 'business' | 'first'
          created_at?: string
        }
      }
      passengers: {
        Row: {
          id: string
          booking_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          passport_number?: string
          email: string
          phone?: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          first_name: string
          last_name: string
          date_of_birth?: string
          passport_number?: string
          email: string
          phone?: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          passport_number?: string
          email?: string
          phone?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      cabin_class: 'economy' | 'business' | 'first'
      flight_status: 'scheduled' | 'delayed' | 'cancelled' | 'completed'
      booking_status: 'confirmed' | 'cancelled' | 'completed'
    }
  }
}

export interface User {
  id: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Airport {
  id: string;
  name: string;
  city: string;
  country: string;
  iata_code: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}

export interface Flight {
  id: string;
  flight_number: string;
  airline: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  available_seats: number;
  status: FlightStatus;
  cabin_class?: CabinClass;
  created_at: string;
  departure_airport_details?: Airport;
  arrival_airport_details?: Airport;
}

export interface Booking {
  id: string;
  user_id: string;
  flight_id: string;
  booking_date: string;
  status: BookingStatus;
  total_amount: number;
  cabin_class: CabinClass;
  created_at: string;
  passengers?: Passenger[];
}

export interface Passenger {
  id: string;
  booking_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  passport_number?: string;
  passport_expiry?: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type CabinClass = 'economy' | 'business' | 'first';
export type FlightStatus = 'scheduled' | 'delayed' | 'cancelled' | 'completed';
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass: CabinClass;
  isRoundTrip: boolean;
}