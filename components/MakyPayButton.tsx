"use client";

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

interface MakyPayButtonProps {
  amount: number;
  description: string;
  subscriptionPlan: string;
  subscriptionDuration: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * MakyPay Payment Button Component
 * 
 * A reusable component for initiating MakyPay payments
 * Supports both mobile money and card payments
 * 
 * @example
 * <MakyPayButton
 *   amount={10000}
 *   description="Premium Subscription"
 *   subscriptionPlan="premium"
 *   subscriptionDuration={30}
 *   onSuccess={() => console.log('Payment successful!')}
 *   onError={(error) => console.error(error)}
 * />
 */
export default function MakyPayButton({
  amount,
  description,
  subscriptionPlan,
  subscriptionDuration,
  onSuccess,
  onError,
}: MakyPayButtonProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [detectedProvider, setDetectedProvider] = useState('');

  const detectProvider = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length >= 10) {
      const prefix = cleaned.startsWith('256') ? cleaned.substring(3, 5) : cleaned.substring(1, 3);
      
      if (['77', '78', '76', '39', '31', '79'].includes(prefix)) {
        setDetectedProvider('MTN Mobile Money');
      } else if (['70', '73', '74', '75'].includes(prefix)) {
        setDetectedProvider('Airtel Money');
      } else {
        setDetectedProvider('Unknown Network');
      }
    } else {
      setDetectedProvider('');
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setPhoneNumber(cleaned);
    detectProvider(cleaned);
  };

  const handlePayment = async () => {
    if (!user) {
      onError?.('Please sign in to continue');
      return;
    }

    if (paymentMethod === 'mobile_money' && !phoneNumber) {
      onError?.('Please enter your phone number');
      return;
    }

    setIsProcessing(true);

    try {
      // Get session token
      const { data: sessionData } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Initiate payment
      const initiateResponse = await fetch('/api/makypay/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          phoneNumber: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
          amount,
          description,
          paymentMethod,
          accessToken,
        }),
      });

      const initiateData = await initiateResponse.json();

      if (!initiateResponse.ok) {
        throw new Error(initiateData.error || 'Payment initiation failed');
      }

      // For card payments, redirect to payment gateway
      if (paymentMethod === 'card' && initiateData.transaction.redirectUrl) {
        window.location.href = initiateData.transaction.redirectUrl;
        return;
      }

      // For mobile money, poll for status
      const statusResponse = await fetch('/api/makypay/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: initiateData.transaction.uuid,
        }),
      });

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(statusData.error || 'Failed to check payment status');
      }

      if (statusData.transaction.isCompleted) {
        // Complete subscription
        const completeResponse = await fetch('/api/makypay/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            transactionId: initiateData.transaction.uuid,
            subscriptionPlan,
            subscriptionDuration,
            accessToken,
          }),
        });

        if (!completeResponse.ok) {
          const completeData = await completeResponse.json();
          throw new Error(completeData.error || 'Failed to complete subscription');
        }

        setShowModal(false);
        onSuccess?.();
      } else {
        throw new Error(statusData.transaction.displayStatus || 'Payment failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span>Pay with MakyPay</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full">
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">MakyPay Payment</h3>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isProcessing}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Amount Display */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-300 mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-white">UGX {amount.toLocaleString()}</p>
                <p className="text-sm text-gray-400 mt-1">{description}</p>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-white">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPaymentMethod('mobile_money')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'mobile_money'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm font-medium text-white">Mobile Money</p>
                      <p className="text-xs text-gray-400 mt-1">MTN / Airtel</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <p className="text-sm font-medium text-white">Card</p>
                      <p className="text-xs text-gray-400 mt-1">Visa / Mastercard</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Phone Number Input (Mobile Money Only) */}
              {paymentMethod === 'mobile_money' && (
                <div className="mb-6">
                  <label htmlFor="phone" className="block text-sm font-medium mb-2 text-white">
                    Mobile Money Number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="0771234567"
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                    maxLength={12}
                    disabled={isProcessing}
                  />
                  {detectedProvider && (
                    <p className={`text-xs mt-2 ${
                      detectedProvider === 'Unknown Network' ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {detectedProvider === 'Unknown Network' ? '⚠️' : '✓'} {detectedProvider}
                    </p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={
                    isProcessing ||
                    (paymentMethod === 'mobile_money' && (!phoneNumber || phoneNumber.length < 10))
                  }
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Pay Now</span>
                    </>
                  )}
                </button>
              </div>

              {/* Info */}
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <p className="text-xs text-blue-300">
                  💡 {paymentMethod === 'mobile_money' 
                    ? "You'll receive a payment prompt on your phone to confirm the transaction."
                    : "You'll be redirected to a secure payment gateway to complete your card payment."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
