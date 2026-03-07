"use client";

import Link from "next/link";

export default function TrialSuccessPage() {
    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{
                background:
                    "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)",
            }}
        >
            <div className="w-full max-w-md animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
                    {/* Success Icon */}
                    <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <svg
                            className="w-10 h-10 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2">
                        Free Trial Activated! 🎉
                    </h1>
                    <p className="text-teal-600 font-medium text-lg mb-2">
                        Welcome to Yoga with Renu Tayal!
                    </p>
                    <p className="text-gray-500 mb-6">
                        Your 7-day free trial has started. Check your WhatsApp for session
                        details and your personal join link.
                    </p>

                    {/* Trial Info */}
                    <div className="bg-teal-50 rounded-xl p-4 mb-6 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm text-teal-700">
                            <span>📅</span>
                            <span className="font-medium">Duration: 7 Days</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-teal-700">
                            <span>🕐</span>
                            <span className="font-medium">Session: 5:00 - 6:00 PM Daily</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-teal-700">
                            <span>📱</span>
                            <span className="font-medium">Join link sent to your WhatsApp</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-6">
                        You will receive daily session reminders on WhatsApp with your
                        personal join link. Don&apos;t share this link — it&apos;s unique to you!
                    </p>

                    <Link
                        href="/"
                        className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
                    >
                        Back to Home
                    </Link>
                </div>

                <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
                    Powered by Yoga with Renu Tayal
                </p>
            </div>
        </div>
    );
}
