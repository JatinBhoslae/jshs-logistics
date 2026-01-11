import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, FileText, Loader2 } from 'lucide-react';
import Modal from './Modal';
import { api } from '../lib/api';
import { useDebounce } from '../hooks/useDebounce';
import toast from 'react-hot-toast';

interface IssueDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DOCUMENT_TYPES = [
    {
        label: 'Universal Documents', options: [
            { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice' },
            { value: 'PACKING_LIST', label: 'Packing List' },
            { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin' },
        ]
    },
    {
        label: 'Sea Freight', options: [
            { value: 'BILL_OF_LADING', label: 'Bill of Lading (B/L)' },
            { value: 'TELEX_RELEASE', label: 'Telex Release' },
            { value: 'SEA_WAYBILL', label: 'Sea Waybill' },
        ]
    },
    {
        label: 'Air Freight', options: [
            { value: 'AIR_WAYBILL', label: 'Air Waybill (AWB)' },
        ]
    },
    {
        label: 'Road Freight', options: [
            { value: 'CMR_ROAD_CONSIGNMENT_NOTE', label: 'CMR / Consignment Note' },
            { value: 'TRIP_SHEET', label: 'Trip Sheet' },
        ]
    },
    {
        label: 'Customs', options: [
            { value: 'SHIPPING_BILL', label: 'Shipping Bill (Export)' },
            { value: 'BILL_OF_ENTRY', label: 'Bill of Entry (Import)' },
        ]
    },
    {
        label: 'Other / Internal', options: [
            { value: 'POD', label: 'Proof of Delivery (POD)' },
            { value: 'GST_INVOICE', label: 'GST Invoice' },
            { value: 'VEHICLE_INSPECTION', label: 'Vehicle Inspection Report' },
        ]
    }
];

export default function IssueDocumentModal({ isOpen, onClose }: IssueDocumentModalProps) {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShipment, setSelectedShipment] = useState<any>(null);
    const [selectedType, setSelectedType] = useState('COMMERCIAL_INVOICE');

    const debouncedSearch = useDebounce(searchTerm, 300);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setSelectedShipment(null);
            setSelectedType('COMMERCIAL_INVOICE');
        }
    }, [isOpen]);

    // Search Shipments
    const { data: searchResults, isLoading: isSearching } = useQuery({
        queryKey: ['shipment-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return [];
            const res = await api.get('/shipments', {
                params: { search: debouncedSearch, limit: 5 }
            });
            return res.data.shipments || [];
        },
        enabled: isOpen && debouncedSearch.length > 2,
    });

    const issueMutation = useMutation({
        mutationFn: async () => {
            if (!selectedShipment) throw new Error("Please select a shipment");
            const res = await api.post(`/docs/shipments/${selectedShipment._id}/generate`, {
                type: selectedType
            });
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-docs'] });
            toast.success('Document issued successfully');
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.error?.message || 'Failed to issue document');
        }
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Issue New Document">
            <div className="space-y-6">
                {/* 1. Select Shipment */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Target Shipment</label>
                    <div className="relative">
                        <div className="flex items-center input-glass px-3 py-2 gap-2 focus-within:ring-2 ring-blue-500/20">
                            <Search className="h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                className="bg-transparent flex-1 text-sm font-medium focus:outline-none"
                                placeholder="Search by Ref ID, Customer, or City..."
                                value={selectedShipment ? `${selectedShipment.referenceId} - ${selectedShipment.origin?.name} to ${selectedShipment.destination?.name}` : searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setSelectedShipment(null); // Clear selection on edit
                                }}
                                autoFocus
                            />
                            {isSearching && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
                        </div>

                        {/* Dropdown Results */}
                        {!selectedShipment && searchResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/10 shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                                {searchResults.map((shipment: any) => (
                                    <button
                                        key={shipment._id}
                                        onClick={() => {
                                            setSelectedShipment(shipment);
                                            setSearchTerm('');
                                        }}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 dark:text-white text-sm">{shipment.referenceId}</span>
                                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">{shipment.status}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                            <span className="truncate max-w-[100px]">{shipment.origin?.name || 'N/A'}</span>
                                            <span>→</span>
                                            <span className="truncate max-w-[100px]">{shipment.destination?.name || 'N/A'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Select Document Type */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Document Type</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="input-glass w-full px-4 py-3 text-sm font-bold"
                    >
                        {DOCUMENT_TYPES.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                                {group.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>

                {/* Action Button */}
                <button
                    disabled={!selectedShipment || issueMutation.isPending}
                    onClick={() => issueMutation.mutate()}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {issueMutation.isPending ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Issuing Document...
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" />
                            Issue Document Now
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
}
