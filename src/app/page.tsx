"use client";

import { useState } from "react";

type Plan = "1month" | "3months" | null;

export default function Home() {
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<Plan>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const plans = {
    "1month": { label: "1 MONTH", price: 999, duration: "1 Month Subscription" },
    "3months": { label: "3 MONTHS", price: 1999, duration: "3 Months Subscription" },
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "");
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleSubmit = async (plan: Plan) => {
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (!validatePhone(whatsapp)) {
      setError("Please enter a valid 10-digit WhatsApp number");
      return;
    }
    if (!plan) return;

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

      // Redirect to Paytm payment page
      if (data.paytmUrl && data.params) {
        // Create a form and submit it to Paytm
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #5eead4 0%, #2dd4bf 50%, #14b8a6 100%)" }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="pt-8 pb-4 px-6 text-center">
            {/* Yoga Icon */}
            <div className="mx-auto w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Tayal Yoga Class</h1>
            <p className="text-sm text-gray-500">Register for our premium yoga sessions</p>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-all text-gray-700 placeholder-gray-400"
                disabled={loading}
              />
            </div>

            {/* WhatsApp Number */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">WhatsApp Number</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-gray-500 text-sm font-medium">+91</span>
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
                  disabled={loading}
                />
              </div>
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {/* 1 Month Plan */}
              <button
                onClick={() => handleSubmit("1month")}
                disabled={loading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${
                  selectedPlan === "1month" && loading
                    ? "border-teal-500 bg-teal-50 plan-card-selected"
                    : "border-teal-400 bg-teal-500 hover:bg-teal-600 hover:shadow-lg"
                }`}
              >
                <div className="text-white">
                  <div className="text-2xl font-bold">₹999</div>
                  <div className="text-xs font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "1month" ? "PROCESSING..." : "1 MONTH SUBSCRIPTION"}
                  </div>
                </div>
              </button>

              {/* 3 Months Plan */}
              <button
                onClick={() => handleSubmit("3months")}
                disabled={loading}
                className={`relative rounded-xl p-4 text-center transition-all duration-200 cursor-pointer border-2 ${
                  selectedPlan === "3months" && loading
                    ? "border-amber-500 bg-amber-50 plan-card-selected"
                    : "border-amber-400 bg-amber-500 hover:bg-amber-600 hover:shadow-lg"
                }`}
              >
                {/* Best Value Badge */}
                <div className="absolute -top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                  BEST VALUE
                </div>
                <div className="text-white">
                  <div className="text-2xl font-bold">₹1999</div>
                  <div className="text-xs font-semibold tracking-wider mt-1 opacity-90">
                    {loading && selectedPlan === "3months" ? "PROCESSING..." : "3 MONTHS SUBSCRIPTION"}
                  </div>
                </div>
              </button>
            </div>

            {/* SSL Badge */}
            <div className="flex items-center justify-center gap-1.5 text-green-600 text-sm mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Secure Encryption via SSL</span>
            </div>

            {/* Divider */}
            <hr className="border-gray-100 mb-4" />

            {/* Terms */}
            <p className="text-center text-xs text-gray-400">
              By proceeding, you agree to our{" "}
              <a href="#" className="text-teal-600 hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="text-teal-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>

        {/* Footer branding */}
        <p className="text-center text-xs text-teal-800 opacity-60 mt-4">
          Powered by Tayal Yoga Class
        </p>
      </div>
    </div>
  );
}
