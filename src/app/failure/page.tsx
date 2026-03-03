"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";

function FailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const status = searchParams.get("status") || "";
  const reason = searchParams.get("reason") || "";

  const getMessage = () => {
    if (reason === "cancelled") return "Payment is cancelled. Please refresh the page for a new payment.";
    if (reason === "missing_order") return "Order information was missing.";
    if (reason === "server_error") return "A server error occurred while processing your payment.";
    if (status === "PENDING") return "Your payment is still being processed. Please wait a few minutes and check again.";
    return "Your payment could not be completed. Please try again.";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)" }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
          {/* Failure Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {reason === "cancelled" ? "Payment Cancelled" : status === "PENDING" ? "Payment Pending" : "Payment Failed"}
          </h1>
          <p className="text-gray-500 mb-6">{getMessage()}</p>

          {/* Details */}
          {orderId && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order ID</span>
                <span className="text-gray-700 font-medium text-xs">{orderId}</span>
              </div>
              {status && reason !== "cancelled" && (
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${status === "PENDING" ? "text-amber-600" : "text-red-600"}`}>
                    {status}
                  </span>
                </div>
              )}
            </div>
          )}

          <Link
            href="/"
            className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
          >
            Refresh for New Payment
          </Link>

          <p className="text-sm text-gray-400 mt-4">
            {reason === "cancelled"
              ? "Your payment was cancelled. No money was deducted."
              : "If money was deducted, it will be refunded within 5-7 business days."}
          </p>
        </div>

        <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
          Powered by Yoga with Renu Tayal
        </p>
      </div>
    </div>
  );
}

export default function FailurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)" }}>
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <FailureContent />
    </Suspense>
  );
}
