import { BrowserRouter, Routes, Route } from "react-router-dom";
import React from "react";
import { ToastProvider } from "./components/Toast";
import { Layout } from "./components/Layout";
import SharedPageView from "./pages/SharedPageView";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route
            path="/shared/:token"
            element={
              <React.Suspense
                fallback={
                  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                }
              >
                <SharedPageView userId={null} />
              </React.Suspense>
            }
          />
          <Route path="/*" element={<Layout />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
