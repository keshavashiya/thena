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
          code: string
          name: string
          city: string
          country: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          city: string
          country: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          city?: string
          country?: string
          created_at?: string
          updated_at?: string
        }
      }
      flights: {
        Row: {
          id: string
          flight_number: string
          airline: string
          origin_airport_id: string
          destination_airport_id: string
          departure_time: string
          arrival_time: string
          price: number
          available_seats: number
          cabin_class: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
          status: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'COMPLETED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          flight_number: string
          airline: string
          origin_airport_id: string
          destination_airport_id: string
          departure_time: string
          arrival_time: string
          price: number
          available_seats: number
          cabin_class: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
          status?: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'COMPLETED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          flight_number?: string
          airline?: string
          origin_airport_id?: string
          destination_airport_id?: string
          departure_time?: string
          arrival_time?: string
          price?: number
          available_seats?: number
          cabin_class?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
          status?: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'COMPLETED'
          created_at?: string
          updated_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          user_id: string
          flight_id: string
          passenger_count: number
          total_price: number
          status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flight_id: string
          passenger_count: number
          total_price: number
          status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flight_id?: string
          passenger_count?: number
          total_price?: number
          status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
          created_at?: string
          updated_at?: string
        }
      }
      passengers: {
        Row: {
          id: string
          booking_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          passport_number: string | null
          passport_expiry: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          passport_number?: string | null
          passport_expiry?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          passport_number?: string | null
          passport_expiry?: string | null
          created_at?: string
          updated_at?: string
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
      cabin_class: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'
      flight_status: 'SCHEDULED' | 'DELAYED' | 'CANCELLED' | 'COMPLETED'
      booking_status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
    }
  }
}