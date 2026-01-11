import { useState } from 'react';
import { Star, MessageSquare, Camera } from 'lucide-react';
import { api } from '../lib/api';
import { toast } from 'react-hot-toast';
import Modal from './Modal';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    shipmentId: string;
    driverId: string;
    onSuccess: () => void;
}

export default function ReviewModal({ isOpen, onClose, shipmentId, driverId, onSuccess }: ReviewModalProps) {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    const handleSubmit = async () => {
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/reviews', {
                shipmentId,
                driverId,
                rating,
                comment,
                photos
            });
            toast.success('Thank you for your feedback!');
            onSuccess();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rate Professional Service">
            <div className="space-y-8 py-4">
                <div className="text-center space-y-2">
                    <p className="text-slate-500 text-sm">How was your experience with the driver?</p>
                    <div className="flex items-center justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                className="transition-all duration-200 hover:scale-125 focus:outline-none"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                            >
                                <Star
                                    className={`h-10 w-10 ${(hover || rating) >= star
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-slate-200'
                                        }`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-amber-600 font-black text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-1">
                            {rating === 5 ? 'Exceptional' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
                        </p>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <MessageSquare className="h-3 w-3" />
                            Share your thoughts
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us more about the delivery experience..."
                            className="input-glass w-full min-h-[120px] resize-none py-4"
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Camera className="h-3 w-3" />
                            Upload Photos (Optional)
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {photos.map((p, i) => (
                                <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group">
                                    <img src={p} className="h-full w-full object-cover" alt="Review" />
                                    <button
                                        onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    // Simulation: add a placeholder image
                                    setPhotos(prev => [...prev, `https://api.dicebear.com/7.x/shapes/svg?seed=${Date.now()}`]);
                                    toast.success('Photo added!');
                                }}
                                className="h-16 w-16 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-500/50 transition-all"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || rating === 0}
                    className="btn-primary w-full py-4 shadow-2xl shadow-blue-500/20 disabled:opacity-50"
                >
                    {isSubmitting ? 'Processing Submission...' : 'Submit Professional Review'}
                </button>
            </div>
        </Modal>
    );
}

function Plus({ className }: { className?: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
}
