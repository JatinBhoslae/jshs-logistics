import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'

import Landing from './pages/common/Landing'
import Login from './pages/common/Login'
import Register from './pages/common/Register'
import ForgotPassword from './pages/common/ForgotPassword'
import Dashboard from './pages/common/Dashboard'
import Shipments from './pages/common/Shipments'
import ShipmentDetail from './pages/common/ShipmentDetail'
import Fleet from './pages/manager/Fleet'
import FleetPerformance from './pages/manager/FleetPerformance'
import Payments from './pages/common/Payments'
import Analytics from './pages/manager/Analytics'
import Driver from './pages/driver/Driver'
import Drivers from './pages/manager/Drivers'
import DriverDetail from './pages/manager/DriverDetail'
import Notifications from './pages/common/Notifications'
import AuditLogs from './pages/manager/AuditLogs'
import DriverEarnings from './pages/driver/DriverEarnings'
import CustomerCreateShipment from './pages/customer/CustomerCreateShipment'
import PendingApprovals from './pages/manager/PendingApprovals'
import Documents from './pages/manager/Documents'
import IotMonitor from './pages/manager/IotMonitor'
import Profile from './pages/common/Profile'
import OnboardingHub from './pages/manager/onboarding/OnboardingHub'
import VehicleOnboarding from './pages/manager/onboarding/VehicleOnboarding'
import DriverOnboarding from './pages/manager/onboarding/DriverOnboarding'
import { getAppType } from './utils/subdomainUtils'
import VapiWidget from './components/VapiWidget'

export default function App() {
  const appType = getAppType()
  const isCustomer = appType === 'CUSTOMER'
  const isManager = appType === 'MANAGER'

  const vapiApiKey = import.meta.env.VITE_VAPI_PUBLIC_API_KEY
  const vapiAssistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID

  return (
    <>
      <Toaster />
      {vapiApiKey && vapiAssistantId && (
        <VapiWidget apiKey={vapiApiKey} assistantId={vapiAssistantId} />
      )}
      <Routes>
        <Route
          path="/"
          element={isCustomer ? <Landing /> : <Navigate to="/app/dashboard" replace />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        {/* Direct Manager Access Route */}
        <Route path="/manager" element={<Login managerMode={true} />} />
        
        {/* Managers cannot register; they must be seeded/created by admins */}
        <Route
          path="/register"
          element={!isManager ? <Register /> : <Navigate to="/login" replace />}
        />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="shipments" element={<Shipments />} />
          <Route path="shipment/:id" element={<ShipmentDetail />} />

          {/* Customer Specific */}
          <Route
            path="create-shipment"
            element={
              <ProtectedRoute roles={['CUSTOMER']}>
                <CustomerCreateShipment />
              </ProtectedRoute>
            }
          />

          <Route
            path="fleet"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <Fleet />
              </ProtectedRoute>
            }
          />
          <Route
            path="fleet-performance"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <FleetPerformance />
              </ProtectedRoute>
            }
          />
          <Route
            path="iot-monitor"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <IotMonitor />
              </ProtectedRoute>
            }
          />
          <Route
            path="drivers"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <Drivers />
              </ProtectedRoute>
            }
          />

          {/* Onboarding */}
          <Route
            path="onboarding"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <OnboardingHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="onboarding/vehicle"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <VehicleOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="onboarding/driver"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <DriverOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Manager Approvals & Documents */}
          <Route
            path="approvals"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <PendingApprovals />
              </ProtectedRoute>
            }
          />
          <Route
            path="documents"
            element={
              <ProtectedRoute roles={['MANAGER', 'DRIVER', 'CUSTOMER']}>
                <Documents />
              </ProtectedRoute>
            }
          />
          <Route
            path="documents/:category"
            element={
              <ProtectedRoute roles={['MANAGER', 'DRIVER', 'CUSTOMER']}>
                <Documents />
              </ProtectedRoute>
            }
          />

          <Route path="payments" element={<Payments />} />

          {/* Driver Earnings */}
          <Route
            path="earnings"
            element={
              <ProtectedRoute roles={['DRIVER']}>
                <DriverEarnings />
              </ProtectedRoute>
            }
          />

          <Route
            path="analytics"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="audit"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />
          <Route
            path="driver"
            element={
              <ProtectedRoute roles={['DRIVER']}>
                <Driver />
              </ProtectedRoute>
            }
          />
          <Route
            path="driver/:id"
            element={
              <ProtectedRoute roles={['MANAGER']}>
                <DriverDetail />
              </ProtectedRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
