import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import type { Shipment } from '../../types';
import type { User } from '../../auth/AuthContext';
import {
  Star,
  Award,
  Shield,
  MapPin,
  Truck,
  Phone,
  Mail,
  ChevronLeft,
  CheckCircle,
  Clock,
  User as UserIcon,
  CreditCard
} from 'lucide-react';
import { motion } from 'framer-motion';

type Review = {
  _id: string;
  customerId: { _id: string; name: string; email: string };
  rating: number;
  comment: string;
  createdAt: string;
};

export default function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const driverQuery = useQuery({
    queryKey: ['driver', id],
    queryFn: async () => {
      const res = await api.get(`/fleet/drivers/${id}`);
      return res.data.driver as User;
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ['driverReviews', id],
    queryFn: async () => {
      const res = await api.get(`/reviews/driver/${id}`);
      return res.data.reviews as Review[];
    },
  });

  const shipmentsQuery = useQuery({
    queryKey: ['driverShipments', id],
    queryFn: async () => {
      const res = await api.get(`/shipments`);
      const allShipments = res.data.shipments as Shipment[];
      return allShipments.filter(s => s.assignedDriverId === id);
    },
  });

  const driver = driverQuery.data;

  if (driverQuery.isLoading) return <div className="p-8 text-center">Loading driver profile...</div>;
  if (!driver) return <div className="p-8 text-center text-red-500">Driver not found.</div>;

  const completedShipments = shipmentsQuery.data?.filter(s => s.status === 'DELIVERED') || [];

  return (
    <div className="space-y-8 pb-12">
      {/* Premium Header/Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-900/40 to-slate-900 p-10 text-white shadow-2xl border border-white/5">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-80 w-80 rounded-full bg-indigo-500/10 blur-[100px]" />

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div className="relative h-32 w-32 rounded-full border-4 border-white/10 bg-slate-800 flex items-center justify-center overflow-hidden">
              <UserIcon className="h-16 w-16 text-slate-500" />
            </div>
            <div className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-green-500 border-4 border-slate-900 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-4xl font-black tracking-tight">{driver.name}</h1>
              <div className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                {driver.driverApprovalStatus}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-300 mt-4">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                <span className="font-bold text-xl">{driver.performanceRating?.toFixed(1) || '0.0'}</span>
                <span className="text-sm opacity-60">({reviewsQuery.data?.length || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-cyan-400" />
                <span className="font-bold">{driver.awards?.length || 0} Badges Earned</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                <span>Member since {new Date(driver.createdAt || '').toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => nav(-1)}
            className="btn-ghost bg-white/5 border-white/10 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Back to Fleet
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Awards */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Trips" value={completedShipments.length} icon={Truck} color="blue" />
            <StatCard label="Success Rate" value="98%" icon={Shield} color="green" />
            <StatCard label="Avg. Rating" value={driver.performanceRating?.toFixed(1) || 'N/A'} icon={Star} color="amber" />
          </div>

          {/* Contact & Professional Info */}
          <div className="glass-card p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              Professional Credentials
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <InfoRow icon={UserIcon} label="Full Name" value={driver.name} />
              <InfoRow icon={Mail} label="Email Address" value={driver.email} />
              <InfoRow icon={Phone} label="Phone Number" value={driver.phone} />
              <InfoRow icon={CreditCard} label="License Number" value={driver.licenseNumber || 'Not Provided'} />
            </div>

            {driver.bankDetails && (
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                <h3 className="font-bold mb-4 opacity-70">Payment Settlement Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Bank Name</div>
                    <div className="font-bold text-sm">{driver.bankDetails.bankName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Holder Name</div>
                    <div className="font-bold text-sm">{driver.bankDetails.holderName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Account Number</div>
                    <div className="font-bold text-sm font-mono tracking-tighter">
                      {driver.bankDetails.accountNumber ? `•••• ${driver.bankDetails.accountNumber.slice(-4)}` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">IFSC Code</div>
                    <div className="font-bold text-sm font-mono uppercase">{driver.bankDetails.ifscCode || 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Awards Section */}
          {driver.awards && driver.awards.length > 0 && (
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Earned Recognitions
              </h2>
              <div className="flex flex-wrap gap-4">
                {driver.awards.map((award, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-900/30 p-4 rounded-2xl">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="font-black text-amber-900 dark:text-amber-200 text-sm leading-tight">{award}</div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 opacity-60 uppercase font-black mt-0.5">Verified Badge</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer Reviews */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Star className="h-6 w-6 text-amber-500" />
              Customer Trust
            </h2>
            <div className="text-sm font-bold text-slate-500">
              {reviewsQuery.data?.length || 0} reviews
            </div>
          </div>

          <div className="space-y-4">
            {reviewsQuery.data && reviewsQuery.data.length > 0 ? (
              reviewsQuery.data.map((review) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-5 glass-card border-none bg-white dark:bg-white/5 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold">
                        {review.customerId.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold">{review.customerId.name}</div>
                        <div className="text-[10px] text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    "{review.comment}"
                  </p>
                </motion.div>
              ))
            ) : (
              <div className="text-center p-12 glass-card border-dashed">
                <Star className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No customer reviews yet.</p>
              </div>
            )}
          </div>

          <div className="glass-card mt-8 bg-blue-600 text-white p-6 border-none shadow-xl shadow-blue-500/20">
            <h3 className="font-bold flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4" /> Transit Overview
            </h3>
            <p className="text-xs opacity-80 mb-4">Tracking active shipments assigned to this driver.</p>
            <div className="space-y-3">
              <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs">Active Shipments</span>
                <span className="font-bold">{shipmentsQuery.data?.filter(s => s.status !== 'DELIVERED').length || 0}</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs">Total Mileage</span>
                <span className="font-bold">12,402 km</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10'
  };

  return (
    <div className="glass-card p-6 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mb-0.5">{label}</div>
        <div className="text-2xl font-black">{value}</div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <div>
        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-0.5">{label}</div>
        <div className="font-bold text-slate-700 dark:text-slate-200">{value}</div>
      </div>
    </div>
  );
}
