'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface OverrideDialogProps {
  open: boolean;
  onConfirm: (reason: string, password: string) => void;
  onCancel: () => void;
  currentCount: number;
  maxCount: number;
  guestName?: string;
  errorMessage?: string;
}

export function OverrideDialog({
  open,
  onConfirm,
  onCancel,
  currentCount,
  maxCount,
  guestName,
  errorMessage
}: OverrideDialogProps) {
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (!reason.trim() || !password) {
      if (!password) {
        setPasswordError('Password is required');
      }
      return;
    }
    setIsSubmitting(true);
    setPasswordError(null);
    onConfirm(reason.trim(), password);
  };

  // Reset submitting state when dialog reopens (password error)
  React.useEffect(() => {
    if (open) {
      setIsSubmitting(false);
    }
  }, [open, errorMessage]);

  const handleCancel = () => {
    setReason('');
    setPassword('');
    setPasswordError(null);
    setIsSubmitting(false);
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-lg bg-white border border-gray-300 rounded-lg shadow-lg p-6 font-sans">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Security Override Required
          </h2>
          
          {/* Capacity Status */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-sm font-medium text-red-800">
                Capacity Limit Exceeded
              </p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Active Guests: <span className="font-mono font-semibold text-gray-800">{currentCount}/{maxCount}</span>
              </span>
              <div className="bg-red-600 text-white px-2 py-1 text-xs font-medium rounded">
                OVER LIMIT
              </div>
            </div>
          </div>

          {/* Guest Name */}
          {guestName && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-1">
                Requesting Guest
              </p>
              <p className="text-sm text-gray-800 font-medium">
                {guestName}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                {errorMessage}
              </p>
            </div>
          )}
        </div>
        
        {/* Form Fields */}
        <div className="space-y-6">
          {/* Reason Field */}
          <div>
            <Label 
              htmlFor="override-reason" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Override Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="override-reason"
              placeholder="Please provide a reason for this override (e.g., VIP guest, special event, emergency situation)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[80px] placeholder:text-gray-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Password Field */}
          <div>
            <Label 
              htmlFor="override-password" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Security Password <span className="text-red-500">*</span>
            </Label>
            <Input
              id="override-password"
              type="password"
              placeholder="Enter security override password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(null);
              }}
              className={`w-full border ${passwordError ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'} rounded-lg p-3 text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500`}
              disabled={isSubmitting}
            />
            {passwordError && (
              <p className="text-xs text-red-600 font-medium mt-1">
                {passwordError}
              </p>
            )}
          </div>

          {/* Audit Notice */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-xs text-blue-800 font-medium">
              Audit Notice: This override will be permanently logged with timestamp and authorization details
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-6 border-t border-gray-200">
          <Button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || !password || isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium disabled:bg-gray-300 disabled:text-gray-500"
          >
            {isSubmitting ? 'Processing...' : 'Override & Check In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}