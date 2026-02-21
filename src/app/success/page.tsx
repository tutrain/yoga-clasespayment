"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const txnId = searchParams.get("txnId") || "";
  const amount = searchParams.get("amount") || "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)" }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 mb-6">
            Welcome to Tayal Yoga Class! Your registration is confirmed.
          </p>

          {/* Transaction Details */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            {orderId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <span className="text-gray-700 font-medium text-xs">{orderId}</span>
              </div>
            )}
            {txnId && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Transaction ID</span>
                <span className="text-gray-700 font-medium text-xs">{txnId}</span>
              </div>
            )}
            {amount && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Paid</span>
                <span className="text-green-600 font-bold">₹{amount}</span>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-400 mb-6">
            You will receive class details on your WhatsApp number shortly.
          </p>

          <Link
            href="/"
            className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
          Powered by Tayal Yoga Class
        </p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)" }}>
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
