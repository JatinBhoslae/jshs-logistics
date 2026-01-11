import Skeleton from '../Skeleton';

export default function ShipmentsSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
    return (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
            {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-frame p-6 h-48 flex flex-col justify-between">
                    <div className="flex justify-between">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                    <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex justify-between">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>
            ))}
        </div>
    )
}
