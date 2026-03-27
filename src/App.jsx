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
import FeedbackPage from "./pages/FeedbackPage";
import CommunityPage from "./pages/CommunityPage";
import MyMarketplacesPage from "./pages/MyMarketplacesPage";
import ScrollToTop from "./components/ScrollToTop";

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
      <ScrollToTop />
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
            path="/marketplace/mine"
            element={
              <ProtectedRoute>
                <Layout>
                  <MyMarketplacesPage />
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
            path="/marketplace/:code"
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
            path="/community"
            element={
              <ProtectedRoute>
                <Layout>
                  <CommunityPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <Layout>
                  <FeedbackPage />
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
