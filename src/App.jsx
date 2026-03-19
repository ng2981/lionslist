import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import NavBar from "./components/NavBar";
import BottomNav from "./components/BottomNav";
import RegisterPage from "./pages/RegisterPage";
import VerifyPage from "./pages/VerifyPage";
import HomePage from "./pages/HomePage";
import CreateMarketplacePage from "./pages/CreateMarketplacePage";
import MarketplaceDetailPage from "./pages/MarketplaceDetailPage";
import ProfilePage from "./pages/ProfilePage";
import SearchMarketplacePage from "./pages/SearchMarketplacePage";
import PendingPage from "./pages/PendingPage";

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20 md:pb-0">
      <NavBar />
      {children}
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Layout>
                  <HomePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/search"
            element={
              <ProtectedRoute>
                <Layout>
                  <SearchMarketplacePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/create"
            element={
              <ProtectedRoute>
                <Layout>
                  <CreateMarketplacePage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/marketplace/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <MarketplaceDetailPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pending"
            element={
              <ProtectedRoute>
                <Layout>
                  <PendingPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProfilePage />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
