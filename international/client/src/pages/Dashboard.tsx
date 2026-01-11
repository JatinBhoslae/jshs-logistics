import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('international_user') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('international_token');
        localStorage.removeItem('international_user');
        navigate('/login');
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
            <div className="glass-card max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
                        <p className="text-slate-500">Welcome, {user.name || 'Guest'}</p>
                    </div>
                    <button onClick={handleLogout} className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50">Log Out</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card bg-blue-500/5 border-blue-500/20">
                        <h3 className="text-lg font-semibold dark:text-white">Active Shipments</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
                    </div>
                    <div className="glass-card bg-emerald-500/5 border-emerald-500/20">
                        <h3 className="text-lg font-semibold dark:text-white">Pending Quotes</h3>
                        <p className="text-3xl font-bold text-emerald-600 mt-2">0</p>
                    </div>
                    <div className="glass-card bg-purple-500/5 border-purple-500/20">
                        <h3 className="text-lg font-semibold dark:text-white">Total Spent</h3>
                        <p className="text-3xl font-bold text-purple-600 mt-2">$0.00</p>
                    </div>
                </div>

                <div className="mt-12 text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-slate-400">No active shipments found.</p>
                    <button onClick={() => navigate('/quote')} className="mt-4 btn-primary">Create New Shipment</button>
                </div>
            </div>
        </div>
    )
}

export default Dashboard;
