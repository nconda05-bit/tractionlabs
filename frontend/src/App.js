import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Services from "@/pages/Services";
import Process from "@/pages/Process";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Login from "@/dashboard/Login";
import ProtectedRoute from "@/dashboard/ProtectedRoute";
import DashboardLayout from "@/dashboard/DashboardLayout";
import DashboardHome from "@/dashboard/DashboardHome";
import Clients from "@/dashboard/Clients";
import ClientDetail from "@/dashboard/ClientDetail";
import Onboarding from "@/dashboard/Onboarding";
import AICoo from "@/dashboard/AICoo";
import Documents from "@/dashboard/Documents";
import CreativeLibrary from "@/dashboard/CreativeLibrary";
import Intelligence from "@/dashboard/Intelligence";
import Portal from "@/dashboard/Portal";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function MarketingLayout() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let raf;
    const loop = (t) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);

  return (
    <>
      <div className="grain" aria-hidden="true" />
      <Navbar />
      <main className="relative z-10"><Outlet /></main>
      <Footer />
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route element={<MarketingLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/process" element={<Process />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
            </Route>

            <Route path="/login" element={<Login />} />
            <Route path="/portal/:token" element={<Portal />} />

            <Route
              path="/dashboard"
              element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
            >
              <Route index element={<DashboardHome />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetail />} />
              <Route path="onboard" element={<Onboarding />} />
              <Route path="coo" element={<AICoo />} />
              <Route path="intelligence" element={<Intelligence />} />
              <Route path="library" element={<CreativeLibrary />} />
              <Route path="documents" element={<Documents />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster
        theme="dark"
        position="top-center"
        offset={88}
        toastOptions={{
          style: { background: "#12182B", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" },
        }}
      />
    </div>
  );
}

export default App;
