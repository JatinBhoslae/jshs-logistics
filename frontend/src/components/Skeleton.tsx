import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text';
}

const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    variant = 'rectangular'
}) => {
    const baseClasses = 'animate-pulse bg-slate-200 dark:bg-white/5';

    const variantClasses = {
        rectangular: 'rounded-xl',
        circular: 'rounded-full',
        text: 'rounded h-4 w-full'
    };

    return (
        <div
            className={`relative overflow-hidden ${baseClasses} ${variantClasses[variant]} ${className}`}
        >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
    );
};

export default Skeleton;
