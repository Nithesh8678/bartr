"use client";

import { useState } from "react";

const creditPackages = [
  {
    id: 1,
    credits: 100,
    price: 9.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
  {
    id: 2,
    credits: 250,
    price: 19.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
  {
    id: 3,
    credits: 500,
    price: 34.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
  {
    id: 4,
    credits: 1000,
    price: 59.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
  {
    id: 5,
    credits: 2500,
    price: 129.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
  {
    id: 6,
    credits: 5000,
    price: 249.99,
    priceId: "price_1RCdkHHwUcHOZmZjPrM0aNec",
  },
];

export default function CreditStorePage({
  searchParams,
}: {
  searchParams: { canceled?: string };
}) {
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  return (
    <div className="container mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Credit Store</h1>

      {searchParams.canceled && (
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6"
          role="alert"
        >
          <p>
            Order canceled — continue to shop around and checkout when you're
            ready.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditPackages.map((pkg) => (
          <div
            key={pkg.id}
            className={`border rounded-lg p-6 cursor-pointer transition-all ${
              selectedPackage === pkg.id
                ? "border-blue-500 bg-blue-50 shadow-md"
                : "border-gray-200 hover:border-blue-300 hover:shadow"
            }`}
            onClick={() => setSelectedPackage(pkg.id)}
          >
            <h2 className="text-xl font-semibold mb-2">
              {pkg.credits} Credits
            </h2>
            <p className="text-3xl font-bold text-blue-600 mb-4">
              ${pkg.price}
            </p>
            <p className="text-gray-600 mb-4">
              Unlock premium features and services with our credit packages.
            </p>
            <button
              type="button"
              className={`w-full py-2 px-4 rounded-md ${
                selectedPackage === pkg.id
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              {selectedPackage === pkg.id ? "Selected" : "Select Package"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <form action="/api/checkout_sessions" method="POST">
          <input
            type="hidden"
            name="priceId"
            value={
              selectedPackage
                ? creditPackages.find((pkg) => pkg.id === selectedPackage)
                    ?.priceId
                : ""
            }
          />
          <input
            type="hidden"
            name="credits"
            value={
              selectedPackage
                ? creditPackages
                    .find((pkg) => pkg.id === selectedPackage)
                    ?.credits.toString()
                : ""
            }
          />
          <button
            type="submit"
            disabled={!selectedPackage}
            className={`py-3 px-8 rounded-md text-lg font-medium ${
              selectedPackage
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {selectedPackage ? "Proceed to Checkout" : "Select a Package"}
          </button>
        </form>
      </div>
    </div>
  );
}
