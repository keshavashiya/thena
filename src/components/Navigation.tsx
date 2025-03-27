"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { signOutFromSupabase } from "@/lib/auth-helpers";

export default function Navigation() {
  const { data: session, status } = useSession();
  const loading = status === "loading";
  const user = session?.user;

  const handleSignOut = async () => {
    try {
      await signOutFromSupabase();
      await signOut({ redirect: true, callbackUrl: "/" });
    } catch (error) {
      console.error("Error signing out:", error);
      await signOut({ redirect: true, callbackUrl: "/" });
    }
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-blue-600">
                Flight Booking
              </span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {user && (
                <>
                  <Link
                    href="/bookings"
                    className="text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium"
                  >
                    My Bookings
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link
                      href="/profile"
                      className="text-gray-900 inline-flex items-center px-1 pt-1 text-sm font-medium"
                    >
                      {user.email}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="bg-white text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/auth"
                    className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
