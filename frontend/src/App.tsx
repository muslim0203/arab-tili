import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Login } from "@/pages/Login";
import { Register } from "@/pages/Register";
import { ForgotPassword } from "@/pages/ForgotPassword";
import { ResetPassword } from "@/pages/ResetPassword";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy load sahifalar – dastlabki yuklanish tezroq
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));

const AITutor = lazy(() => import("@/pages/AITutor").then((m) => ({ default: m.AITutor })));
const Pricing = lazy(() => import("@/pages/Pricing").then((m) => ({ default: m.Pricing })));
const PaymentReturn = lazy(() => import("@/pages/PaymentReturn").then((m) => ({ default: m.PaymentReturn })));
const AdminLayout = lazy(() => import("@/pages/admin/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments").then((m) => ({ default: m.AdminPayments })));
const AdminQuestionBank = lazy(() => import("@/pages/admin/AdminQuestionBank").then((m) => ({ default: m.AdminQuestionBank })));
const AdminGrammar = lazy(() => import("@/pages/admin/AdminGrammar").then((m) => ({ default: m.AdminGrammar })));
const AdminReading = lazy(() => import("@/pages/admin/AdminReading").then((m) => ({ default: m.AdminReading })));
const AdminListening = lazy(() => import("@/pages/admin/AdminListening").then((m) => ({ default: m.AdminListening })));
const AdminWriting = lazy(() => import("@/pages/admin/AdminWriting").then((m) => ({ default: m.AdminWriting })));
const AdminSpeaking = lazy(() => import("@/pages/admin/AdminSpeaking").then((m) => ({ default: m.AdminSpeaking })));
// Info / yordam sahifalari (suratdagi navigatsiya)
const TizimHaqida = lazy(() => import("@/pages/info/TizimHaqida").then((m) => ({ default: m.TizimHaqida })));
const Foydalanuvchilarga = lazy(() => import("@/pages/info/Foydalanuvchilarga").then((m) => ({ default: m.Foydalanuvchilarga })));
const Tashkilotlarga = lazy(() => import("@/pages/info/Tashkilotlarga").then((m) => ({ default: m.Tashkilotlarga })));
const YordamIndex = lazy(() => import("@/pages/info/YordamIndex").then((m) => ({ default: m.YordamIndex })));
const Boglanish = lazy(() => import("@/pages/info/Boglanish").then((m) => ({ default: m.Boglanish })));
const Qollanmalar = lazy(() => import("@/pages/info/Qollanmalar").then((m) => ({ default: m.Qollanmalar })));
const VideoQollanmalar = lazy(() => import("@/pages/info/VideoQollanmalar").then((m) => ({ default: m.VideoQollanmalar })));
const Landing = lazy(() => import("@/pages/Landing").then((m) => ({ default: m.Landing })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const AtTaanalExam = lazy(() => import("@/pages/AtTaanalExam").then((m) => ({ default: m.AtTaanalExam })));
const AttemptHistory = lazy(() => import("@/pages/AttemptHistory").then((m) => ({ default: m.AttemptHistory })));
const AttemptResults = lazy(() => import("@/pages/AttemptResults").then((m) => ({ default: m.AttemptResults })));
const ExamPage = lazy(() => import("@/pages/ExamPage").then((m) => ({ default: m.ExamPage })));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/exams" element={<AtTaanalExam />} />
            <Route path="/at-taanal" element={<AtTaanalExam />} />
            <Route path="/ai-tutor" element={<ProtectedRoute><AITutor /></ProtectedRoute>} />
            <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
            <Route path="/payment/return" element={<ProtectedRoute><PaymentReturn /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/attempts/history" element={<ProtectedRoute><AttemptHistory /></ProtectedRoute>} />
            <Route path="/attempts/:attemptId/results" element={<ProtectedRoute><AttemptResults /></ProtectedRoute>} />
            <Route path="/exam/:attemptId" element={<ProtectedRoute><ExamPage /></ProtectedRoute>} />
            {/* Tizim haqida, Foydalanuvchilarga, Tashkilotlarga, Yordam (dropdown: Bog'lanish, Qo'llanmalar, Video) */}
            <Route path="/tizim-haqida" element={<TizimHaqida />} />
            <Route path="/foydalanuvchilarga" element={<Foydalanuvchilarga />} />
            <Route path="/tashkilotlarga" element={<Tashkilotlarga />} />
            <Route path="/yordam" element={<YordamIndex />} />
            <Route path="/yordam/boglanish" element={<Boglanish />} />
            <Route path="/yordam/qollanmalar" element={<Qollanmalar />} />
            <Route path="/yordam/video" element={<VideoQollanmalar />} />
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="question-bank" element={<AdminQuestionBank />} />
              <Route path="grammar" element={<AdminGrammar />} />
              <Route path="reading" element={<AdminReading />} />
              <Route path="listening" element={<AdminListening />} />
              <Route path="writing" element={<AdminWriting />} />
              <Route path="speaking" element={<AdminSpeaking />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
