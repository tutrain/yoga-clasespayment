"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Plan = "1month" | "3months" | "6months" | "12months" | null;

export default function Home() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(null);
  const [loading, setLoading] = useState(false);
  const [trialLoading, setTrialLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = {
    "1month":  { label: "1 Month",  price: 999,  save: "" },
    "3months": { label: "3 Months", price: 1999, save: "Save 34%" },
    "6months": { label: "6 Months", price: 2999, save: "Save 50%" },
    "12months":{ label: "12 Months",price: 3999, save: "Save 67%" },
  };

  const validatePhone = (phone: string) => /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ""));

  const validateForm = (): boolean => {
    setError("");
    if (!fullName.trim()) { setError("Please enter your full name"); return false; }
    if (!validatePhone(whatsapp)) { setError("Please enter a valid 10-digit WhatsApp number"); return false; }
    return true;
  };

  const handlePaidPlan = async (plan: Plan) => {
    if (!validateForm() || !plan) return;
    setSelectedPlan(plan); setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), whatsapp: whatsapp.replace(/\s+/g, ""), plan, amount: plans[plan].price }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); setLoading(false); return; }
      if (data.paytmUrl && data.params) {
        const form = document.createElement("form");
        form.method = "POST"; form.action = data.paytmUrl;
        Object.entries(data.params).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden"; input.name = key; input.value = value as string;
          form.appendChild(input);
        });
        document.body.appendChild(form); form.submit();
      } else { setError("Payment initialization failed. Please try again."); setLoading(false); }
    } catch { setError("Network error. Please check your connection and try again."); setLoading(false); }
  };

  const handleFreeTrial = async () => {
    if (!validateForm()) return;
    setTrialLoading(true); setError("");
    try {
      const checkRes = await fetch("/api/check-member", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsapp.replace(/\s+/g, "") }),
      });
      const checkData = await checkRes.json();
      if (checkData.exists) { setError(checkData.message); setTrialLoading(false); return; }
      const res = await fetch("/api/free-trial", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim(), whatsapp: whatsapp.replace(/\s+/g, "") }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); setTrialLoading(false); return; }
      router.push("/trial-success");
    } catch { setError("Network error. Please check your connection and try again."); setTrialLoading(false); }
  };

  const isAnyLoading = loading || trialLoading;

  return (
    <div className="min-h-screen flex items-start justify-center" style={{ background: "#f0f4f8" }}>
      <div className="w-full max-w-sm bg-white shadow-xl flex flex-col" style={{ minHeight: "100vh" }}>

        {/* ── POSTER ── clean, no text on top */}
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <Image
            src="/posters/7 Day Free.jpeg"
            alt="7-Day Free Yoga Trial"
            fill
            style={{ objectFit: "cover", objectPosition: "center" }}
            priority
          />
        </div>

        {/* ── BRAND HEADER ── below the poster, no overlap */}
        <div className="px-5 pt-4 pb-2 text-center border-b border-gray-100">
          <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "#1a1a2e" }}>
            🧘 Yoga with{" "}
            <span style={{
              background: "linear-gradient(90deg, #f59e0b, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Renu Tayal
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Register for premium yoga sessions
          </p>
        </div>

        {/* ── FORM AREA ── */}
        <div className="px-5 pt-4 pb-6 flex flex-col gap-3 flex-1">

          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-lg text-xs text-center font-medium"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              placeholder="Enter your full name..."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isAnyLoading}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">WhatsApp Number</label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span className="text-gray-400 text-xs font-semibold">+91</span>
              </div>
              <input
                type="tel"
                placeholder="98765 43210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/[^0-9\s]/g, ""))}
                maxLength={14}
                disabled={isAnyLoading}
                className="w-full pl-16 pr-3.5 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all"
              />
            </div>
          </div>

          {/* Free Trial Button */}
          <button
            onClick={handleFreeTrial}
            disabled={isAnyLoading}
            className="w-full py-3 rounded-xl font-extrabold text-sm text-white tracking-widest uppercase transition-all active:scale-95 shadow-md disabled:opacity-50 cursor-pointer"
            style={{ background: "linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" }}
          >
            {trialLoading ? "Registering..." : "🎁 Start 7-Day FREE Trial"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Or Choose a Plan</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* ══ PLAN CARDS — Highest First ══ */}

          {/* 1. ₹3999 — 12 Months HERO */}
          <button
            onClick={() => handlePaidPlan("12months")}
            disabled={isAnyLoading}
            className="relative w-full rounded-2xl px-4 py-4 text-left flex items-center justify-between transition-all active:scale-95 cursor-pointer disabled:opacity-60 shadow-md"
            style={{
              background: "linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)",
              boxShadow: "0 6px 20px rgba(109,40,217,0.35)",
            }}
          >
            {/* Badge */}
            <span className="absolute top-0 right-0 text-[9px] font-extrabold px-2 py-1 rounded-bl-xl rounded-tr-2xl tracking-wider"
              style={{ background: "#fbbf24", color: "#1e1b4b" }}>
              ⭐ BEST VALUE
            </span>

            <div>
              <div className="text-2xl font-black text-white">₹3,999</div>
              <div className="text-white/70 text-[11px] font-semibold mt-0.5 tracking-wider">
                {loading && selectedPlan === "12months" ? "PROCESSING..." : "12 Months — Full Year"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-bold text-purple-200">SAVE 67%</div>
              <div className="text-white/50 text-[10px]">Best Deal</div>
            </div>
          </button>

          {/* 2. ₹2999 — 6 Months */}
          <button
            onClick={() => handlePaidPlan("6months")}
            disabled={isAnyLoading}
            className="relative w-full rounded-2xl px-4 py-3.5 text-left flex items-center justify-between transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
              boxShadow: "0 4px 14px rgba(14,165,233,0.3)",
            }}
          >
            <span className="absolute top-0 right-0 text-[9px] font-extrabold px-2 py-0.5 rounded-bl-xl rounded-tr-2xl"
              style={{ background: "#ef4444", color: "#fff" }}>
              SAVE 50%
            </span>
            <div>
              <div className="text-xl font-black text-white">₹2,999</div>
              <div className="text-white/70 text-[11px] font-semibold tracking-wider">
                {loading && selectedPlan === "6months" ? "PROCESSING..." : "6 Months"}
              </div>
            </div>

          </button>

          {/* 3 & 4 — Side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* ₹1999 — 3 Months */}
            <button
              onClick={() => handlePaidPlan("3months")}
              disabled={isAnyLoading}
              className="relative rounded-xl px-3 py-3 text-center transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                boxShadow: "0 3px 10px rgba(5,150,105,0.25)",
              }}
            >
              <span className="absolute top-0 right-0 text-[8px] font-extrabold px-1.5 py-0.5 rounded-bl-lg rounded-tr-xl"
                style={{ background: "#ef4444", color: "#fff" }}>
                SAVE 34%
              </span>
              <div className="text-lg font-black text-white">₹1,999</div>
              <div className="text-white/70 text-[10px] font-semibold mt-0.5">
                {loading && selectedPlan === "3months" ? "..." : "3 Months"}
              </div>
            </button>

            {/* ₹999 — 1 Month */}
            <button
              onClick={() => handlePaidPlan("1month")}
              disabled={isAnyLoading}
              className="relative rounded-xl px-3 py-3 text-center transition-all active:scale-95 cursor-pointer disabled:opacity-60 border-2"
              style={{
                background: "#f8fafc",
                border: "2px solid #e2e8f0",
              }}
            >
              <div className="text-lg font-black text-gray-700">₹999</div>
              <div className="text-gray-400 text-[10px] font-semibold mt-0.5">
                {loading && selectedPlan === "1month" ? "..." : "1 Month"}
              </div>
            </button>
          </div>

          {/* SSL */}
          <div className="flex items-center justify-center gap-1.5 text-green-600 text-[11px] font-medium mt-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Secure Encryption via SSL
          </div>

          <div className="h-px bg-gray-100" />

          <p className="text-center text-[10px] text-gray-400">
            By proceeding, you agree to our{" "}
            <a href="#" className="text-amber-500 underline">Terms of Service</a> and{" "}
            <a href="#" className="text-amber-500 underline">Privacy Policy</a>.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-300 py-3">
          Powered by Yoga with Renu Tayal
        </p>
      </div>
    </div>
  );
}
