'use client';

import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GuestData } from '@/lib/qr-token';

interface GuestSelectionProps {
  guests: GuestData[];
  onSelectGuest: (guest: GuestData) => void;
  onCancel: () => void;
}

export function GuestSelection({ guests, onSelectGuest, onCancel }: GuestSelectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="text-center mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
          Select Guest to Check In
        </h2>
        <p className="text-sm text-gray-600">
          Choose which guest you&apos;d like to check in from the QR code
        </p>
      </div>

      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
        {guests.map((guest, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {guest.n.split(' ').map(name => name[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-800">{guest.n}</h3>
                    <p className="text-sm text-gray-600">{guest.e}</p>
                  </div>
                </div>
                <Button 
                  onClick={() => onSelectGuest(guest)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                >
                  Select
                </Button>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1"
        >
          Cancel & Scan Again
        </Button>
      </div>
    </div>
  );
}