"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
    const params = useParams();
    const userId = params.userId as string;
    const [status, setStatus] = useState<"loading" | "redirecting" | "expired" | "denied" | "error">("loading");
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        async function checkAccess() {
            try {
                const res = await fetch(`/api/join/${userId}`);
                const data = await res.json();

                if (data.redirect && data.url) {
                    setStatus("redirecting");
                    setName(data.name || "");
                    // Redirect to Zoom after a brief delay
                    setTimeout(() => {
                        window.location.href = data.url;
                    }, 1500);
                } else if (data.reason === "expired") {
                    setStatus("expired");
                    setName(data.name || "");
                } else if (data.reason === "no_zoom_link") {
                    setStatus("error");
                    setMessage(data.message || "Session link not configured.");
                } else {
                    setStatus("denied");
                }
            } catch {
                setStatus("error");
                setMessage("Something went wrong. Please try again.");
            }
        }

        if (userId) {
            checkAccess();
        }
    }, [userId]);

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
                    {/* Loading State */}
                    {status === "loading" && (
                        <>
                            <div className="mx-auto w-16 h-16 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mb-6" />
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Verifying your access...
                            </h1>
                            <p className="text-gray-500 text-sm">Please wait a moment</p>
                        </>
                    )}

                    {/* Redirecting State */}
                    {status === "redirecting" && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Welcome, {name}! 🧘‍♀️
                            </h1>
                            <p className="text-teal-600 font-medium mb-2">
                                Joining your yoga session...
                            </p>
                            <p className="text-gray-400 text-sm">
                                Redirecting to the live session now
                            </p>
                        </>
                    )}

                    {/* Expired State */}
                    {status === "expired" && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Access Expired
                            </h1>
                            <p className="text-gray-500 mb-6">
                                {name ? `Hi ${name}, your` : "Your"} subscription has ended.
                                Purchase a plan to continue your yoga journey.
                            </p>
                            <Link
                                href="/"
                                className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
                            >
                                Purchase a Plan
                            </Link>
                        </>
                    )}

                    {/* Access Denied State */}
                    {status === "denied" && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">
                                Personal Link
                            </h1>
                            <p className="text-gray-500 mb-6">
                                This is a personal session link. Please register for your own access to join yoga sessions.
                            </p>
                            <Link
                                href="/"
                                className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
                            >
                                Register Now — Free Trial Available
                            </Link>
                        </>
                    )}

                    {/* Error State */}
                    {status === "error" && (
                        <>
                            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-gray-800 mb-2">Oops!</h1>
                            <p className="text-gray-500 mb-6">
                                {message || "Something went wrong. Please try again."}
                            </p>
                            <Link
                                href="/"
                                className="inline-block w-full py-3 bg-teal-500 text-white font-semibold rounded-xl hover:bg-teal-600 transition-colors"
                            >
                                Go to Registration
                            </Link>
                        </>
                    )}
                </div>

                <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
                    Powered by Yoga with Renu Tayal
                </p>
            </div>
        </div>
    );
}
