"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    "1month": { label: "1 MONTH", price: 999, save: "" },
    "3months": { label: "3 MONTHS", price: 1999, save: "Save 34%" },
    "6months": { label: "6 MONTHS", price: 2999, save: "Save 50%" },
    "12months": { label: "12 MONTHS", price: 3999, save: "Save 67%" },
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const validateForm = (): boolean => {
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return false;
    }
    if (!validatePhone(whatsapp)) {
      setError("Please enter a valid 10-digit WhatsApp number");
      return false;
    }
    return true;
  };

  // Handle paid plan purchase
  const handlePaidPlan = async (plan: Plan) => {
    if (!validateForm() || !plan) return;

    setSelectedPlan(plan);
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          whatsapp: whatsapp.replace(/\s+/g, ""),
          plan,
          amount: plans[plan].price,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.paytmUrl && data.params) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.paytmUrl;

        Object.entries(data.params).forEach(([key, value]) => {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        setError("Payment initialization failed. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  // Handle free trial registration
  const handleFreeTrial = async () => {
    if (!validateForm()) return;

    setTrialLoading(true);
    setError("");

    try {
      // First check if already registered
      const checkRes = await fetch("/api/check-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsapp.replace(/\s+/g, "") }),
      });

      const checkData = await checkRes.json();

      if (checkData.exists) {
        setError(checkData.message);
        setTrialLoading(false);
        return;
      }

      // Register for free trial
      const res = await fetch("/api/free-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          whatsapp: whatsapp.replace(/\s+/g, ""),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setTrialLoading(false);
        return;
      }

      // Redirect to trial success page
      router.push("/trial-success");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setTrialLoading(false);
    }
  };

  const isAnyLoading = loading || trialLoading;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)",
      }}
    >
      <div className="w-full max-w-md animate-fade-in">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="pt-8 pb-4 px-6 text-center">
            <div className="mx-auto w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Yoga with Renu Tayal
            </h1>
            <p className="text-sm text-gray-500">
              Register for our premium yoga sessions
            </p>
          </div>

          {/* Form */}
          <div className="px-6 pb-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
                disabled={isAnyLoading}
              />
            </div>

            {/* WhatsApp Number */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <svg
                    className="w-5 h-5 text-green-500"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-gray-500 text-sm font-medium">
                    +91
                  </span>
                </div>
                <input
                  type="tel"
                  placeholder="98765 43210"
                  value={whatsapp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9\s]/g, "");
                    setWhatsapp(val);
                  }}
                  maxLength={14}
                  className="w-full pl-20 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
                  disabled={isAnyLoading}
                />
              </div>
            </div>

            {/* Free Trial Button */}
            <button
              onClick={handleFreeTrial}
              disabled={isAnyLoading}
              className="w-full py-3 mb-4 bg-gradient-to-r from-orange-400 to-amber-500 text-white font-bold rounded-xl hover:from-orange-500 hover:to-amber-600 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50"
            >
              {trialLoading ? "Registering..." : "🎁 START 7-DAY FREE TRIAL"}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">
                OR CHOOSE A PLAN
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Plan Cards — 2x2 Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* 1 Month */}
              <button
                onClick={() => handlePaidPlan("1month")}
                disabled={isAnyLoading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${selectedPlan === "1month" && loading
                    ? "border-teal-500 bg-teal-50 plan-card-selected"
                    : "border-teal-400 bg-teal-500 hover:bg-teal-600 hover:shadow-lg"
                  }`}
              >
                <div className="text-white">
                  <div className="text-xl font-bold">₹999</div>
                  <div className="text-[10px] font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "1month"
                      ? "PROCESSING..."
                      : "1 MONTH"}
                  </div>
                </div>
              </button>

              {/* 3 Months */}
              <button
                onClick={() => handlePaidPlan("3months")}
                disabled={isAnyLoading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${selectedPlan === "3months" && loading
                    ? "border-emerald-500 bg-emerald-50 plan-card-selected"
                    : "border-emerald-400 bg-emerald-500 hover:bg-emerald-600 hover:shadow-lg"
                  }`}
              >
                <div className="absolute -top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-xl">
                  SAVE 34%
                </div>
                <div className="text-white">
                  <div className="text-xl font-bold">₹1999</div>
                  <div className="text-[10px] font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "3months"
                      ? "PROCESSING..."
                      : "3 MONTHS"}
                  </div>
                </div>
              </button>

              {/* 6 Months */}
              <button
                onClick={() => handlePaidPlan("6months")}
                disabled={isAnyLoading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${selectedPlan === "6months" && loading
                    ? "border-blue-500 bg-blue-50 plan-card-selected"
                    : "border-blue-400 bg-blue-500 hover:bg-blue-600 hover:shadow-lg"
                  }`}
              >
                <div className="absolute -top-0 right-0 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-xl">
                  SAVE 50%
                </div>
                <div className="text-white">
                  <div className="text-xl font-bold">₹2999</div>
                  <div className="text-[10px] font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "6months"
                      ? "PROCESSING..."
                      : "6 MONTHS"}
                  </div>
                </div>
              </button>

              {/* 12 Months — Most Recommended */}
              <button
                onClick={() => handlePaidPlan("12months")}
                disabled={isAnyLoading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${selectedPlan === "12months" && loading
                    ? "border-purple-500 bg-purple-50 plan-card-selected"
                    : "border-purple-400 bg-purple-500 hover:bg-purple-600 hover:shadow-lg"
                  }`}
              >
                <div className="absolute -top-0 right-0 bg-yellow-400 text-gray-900 text-[8px] font-bold px-1.5 py-0.5 rounded-bl-lg rounded-tr-xl">
                  ⭐ BEST VALUE
                </div>
                <div className="text-white">
                  <div className="text-xl font-bold">₹3999</div>
                  <div className="text-[10px] font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "12months"
                      ? "PROCESSING..."
                      : "12 MONTHS"}
                  </div>
                </div>
              </button>
            </div>

            {/* SSL Badge */}
            <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-medium">Secure Encryption via SSL</span>
            </div>

            <hr className="border-gray-100 mb-4" />

            {/* Terms */}
            <p className="text-center text-xs text-gray-400">
              By proceeding, you agree to our{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
          Powered by Yoga with Renu Tayal
        </p>
      </div>
    </div>
  );
}
