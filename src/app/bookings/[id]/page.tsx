'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from 'next-auth/react';
import { Booking, Flight, Passenger } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';

export default function BookingDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ ticketData: any; ticketUrl: string | null } | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;

    fetchBookingData();
  }, [id, session?.user?.id]);

  const fetchBookingData = async () => {
    setLoading(true);
    try {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          passengers(*)
        `)
        .eq('id', id)
        .single();

      if (bookingError) throw bookingError;

      if (bookingData.user_id !== session?.user?.id) {
        router.push('/bookings');
        throw new Error('You do not have permission to view this booking');
      }

      setBooking(bookingData);
      setPassengers(bookingData.passengers || []);

      const { data: flightData, error: flightError } = await supabase
        .from('flights')
        .select(`
          *,
          departure:departure_airport(id, name, city, country, iata_code),
          arrival:arrival_airport(id, name, city, country, iata_code)
        `)
        .eq('id', bookingData.flight_id)
        .single();

      if (flightError) throw flightError;
      setFlight(flightData);

      try {
        const { getETicket } = await import('@/lib/ticket');
        const ticketData = await getETicket(bookingData.id);
        setTicket(ticketData);
      } catch (ticketError) {
        console.error('Error retrieving ticket:', ticketError);
      }
    } catch (err) {
      console.error('Error fetching booking data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', booking.id);

      if (error) throw error;

      fetchBookingData();

      alert('Booking cancelled successfully');
    } catch (err) {
      console.error('Error cancelling booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const checkTicketExists = async (bookingId: string) => {
    try {
      const { supabaseClient } = await import('@/lib/auth-helpers');
      const authenticatedSupabase = await supabaseClient();

      const { data: sessionData } = await authenticatedSupabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (userId) {
        const { data: userFiles } = await authenticatedSupabase.storage
          .from('tickets')
          .list(`${userId}/${bookingId}`, { limit: 10 });

        if (userFiles?.some((file: { name: string }) => file.name === 'ticket.json')) {
          return true;
        }
      }

      const { data: standardFiles } = await authenticatedSupabase.storage
        .from('tickets')
        .list(`${bookingId}`, { limit: 10 });

      return standardFiles?.some((file: { name: string }) => file.name === 'ticket.json') || false;
    } catch (err) {
      console.error('Error checking ticket existence:', err);
      return false;
    }
  };

  const downloadTicket = async () => {
    if (!booking || !flight) return;

    try {
      const { supabaseClient } = await import('@/lib/auth-helpers');
      const authenticatedSupabase = await supabaseClient();

      const { data: sessionData } = await authenticatedSupabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      const exists = await checkTicketExists(booking.id);

      if (!exists) {
        setLoading(true);
        try {
          const { generatePdfTicket } = await import('@/lib/ticket');
          const ticketResult = await generatePdfTicket(booking, passengers, flight, authenticatedSupabase);

          if (ticketResult && ticketResult.pdfUrl) {
            window.open(ticketResult.pdfUrl, '_blank');
            setLoading(false);
            return;
          }
        } catch (error) {
          console.error('Error generating ticket:', error);
          alert('Error generating ticket. Please try again.');
          setLoading(false);
          return;
        }
      }

      if (userId) {
        const { data: pdfUrlData } = authenticatedSupabase.storage
          .from('tickets')
          .getPublicUrl(`${userId}/${booking.id}/ticket.pdf`);

        if (pdfUrlData?.publicUrl) {
          window.open(pdfUrlData.publicUrl, '_blank');
          return;
        }

        const { data: htmlUrlData } = authenticatedSupabase.storage
          .from('tickets')
          .getPublicUrl(`${userId}/${booking.id}/ticket.html`);

        if (htmlUrlData?.publicUrl) {
          window.open(htmlUrlData.publicUrl, '_blank');
          return;
        }

        const { data: userUrlData } = authenticatedSupabase.storage
          .from('tickets')
          .getPublicUrl(`${userId}/${booking.id}/ticket.json`);

        if (userUrlData?.publicUrl) {
          try {
            const { data, error } = await authenticatedSupabase.storage
              .from('tickets')
              .download(`${userId}/${booking.id}/ticket.json`);

            if (!error && data) {
              const ticketData = JSON.parse(await data.text());
              const { generateTicketHtml } = await import('@/lib/ticket');
              const html = generateTicketHtml(ticketData);

              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              return;
            }
          } catch (err) {
            console.error('Error rendering HTML ticket:', err);
          }
        }
      }

      alert('Unable to find ticket. Please try regenerating the ticket.');

    } catch (err) {
      console.error('Error downloading ticket:', err);
      alert('Error downloading ticket. Please try regenerating the ticket.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateTicket = async () => {
    if (!booking || !flight) return;

    setLoading(true);
    try {
      const { supabaseClient } = await import('@/lib/auth-helpers');
      const authenticatedSupabase = await supabaseClient();
      const { data: sessionData } = await authenticatedSupabase.auth.getSession();

      if (!sessionData?.session) {
        setError('No active session. Please sign in again to regenerate the ticket.');
        alert('Please sign in again to regenerate the ticket.');
        setLoading(false);
        return;
      }

      const { data: bookingData, error: bookingError } = await authenticatedSupabase
        .from('bookings')
        .select('user_id')
        .eq('id', booking.id)
        .single();

      if (bookingError || !bookingData) {
        setError('Could not verify booking ownership. Please try again.');
        setLoading(false);
        return;
      }

      const currentUser = sessionData.session.user;
      if (bookingData.user_id !== currentUser.id) {
        setError('You do not have permission to generate a ticket for this booking.');
        setLoading(false);
        return;
      }

      const { generatePdfTicket } = await import('@/lib/ticket');
      const ticketResult = await generatePdfTicket(
        booking,
        passengers,
        flight,
        authenticatedSupabase
      );

      setTicket(ticketResult);
      alert('E-ticket regenerated successfully');

      if (ticketResult.ticketUrl) {
        window.open(ticketResult.ticketUrl, '_blank');
      }
    } catch (err) {
      console.error('Error regenerating ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate ticket');
      alert('Failed to generate ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center text-red-600">
          <p>Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!booking || !flight) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <p>Booking not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/bookings" className="text-blue-600 hover:text-blue-800">
            ← Back to All Bookings
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">Booking Details</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Booking ID: {booking.id.substring(0, 8)}...
              </p>
            </div>
            <div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {booking.status}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Flight</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {flight.airline} - {flight.flight_number}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Route</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {flight.departure_airport_details?.iata_code || flight.departure_airport} → {flight.arrival_airport_details?.iata_code || flight.arrival_airport}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Departure</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {format(new Date(flight.departure_time), 'PPP p')}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Arrival</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {format(new Date(flight.arrival_time), 'PPP p')}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Cabin Class</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">
                  {booking.cabin_class}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  ${booking.total_amount.toFixed(2)}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Booking Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {format(new Date(booking.created_at), 'PPP')}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Flight Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    flight.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    flight.status === 'delayed' ? 'bg-yellow-100 text-yellow-800' :
                    flight.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    flight.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {flight.status}
                  </span>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Passengers</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {passengers.length} {passengers.length === 1 ? 'passenger' : 'passengers'} on this booking
            </p>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {passengers.map((passenger) => (
                <li key={passenger.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {passenger.first_name} {passenger.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{passenger.email}</p>
                    </div>
                    {passenger.passport_number && (
                      <p className="text-xs text-gray-500">
                        Passport: {passenger.passport_number}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            onClick={downloadTicket}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Download E-Ticket PDF
          </button>

          <button
            onClick={regenerateTicket}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Regenerate E-Ticket
          </button>

          {booking.status === 'confirmed' && (
            <button
              onClick={handleCancelBooking}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Cancel Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}