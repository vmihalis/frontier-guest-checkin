import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-muted to-blue-50/50 dark:from-background dark:to-blue-950/20">
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Logo and Header */}
          <div className="mb-12">
            <div className="mx-auto mb-6 flex justify-center">
              <Logo size="xl" priority className="shadow-lg rounded-2xl" />
            </div>
            <h1 className="text-6xl font-bold text-foreground mb-4">
              Frontier Tower
            </h1>
            <p className="text-2xl text-muted-foreground mb-8">
              Advanced Visitor Management System
            </p>
            <div className="bg-blue-500/10 dark:bg-blue-500/20 border-l-4 border-blue-500 rounded-r-lg p-6 max-w-2xl mx-auto">
              <p className="text-lg text-blue-700 dark:text-blue-400 font-medium">
                Secure, streamlined guest check-in with QR codes, capacity management, and comprehensive audit trails.
              </p>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-card border border-border rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 dark:text-blue-400 text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">QR Code Check-in</h3>
              <p className="text-muted-foreground">
                Multi-camera scanning optimized for iPad Safari with support for multi-guest QR codes.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-500/10 dark:bg-green-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 dark:text-green-400 text-2xl">🛡️</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Security Override</h3>
              <p className="text-muted-foreground">
                Password-protected capacity limit bypasses with complete audit trail for security staff.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 dark:text-purple-400 text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Business Rules</h3>
              <p className="text-muted-foreground">
                Rolling visit limits, blacklist enforcement, and automated discount tracking.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/checkin"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              🔍 Guest Check-in Scanner
            </Link>
            <Link 
              href="/login"
              className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              👥 Host Dashboard
            </Link>
          </div>

          {/* Status Info */}
          <div className="mt-12 bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">12 Hour</div>
                <div className="text-muted-foreground">Visit Expiry</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">3 per Month</div>
                <div className="text-muted-foreground">Guest Limit</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-2">Real-time</div>
                <div className="text-muted-foreground">Email Notifications</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}