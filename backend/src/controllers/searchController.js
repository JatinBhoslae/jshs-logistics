import { Shipment } from '../models/Shipment.js'
import { User } from '../models/User.js'
import { Vehicle } from '../models/Vehicle.js'
import { Document } from '../models/Document.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const globalSearch = asyncHandler(async (req, res) => {
    const { q } = req.query
    if (!q || q.length < 2) {
        return res.json({ results: [] })
    }

    const regex = new RegExp(q, 'i')

    // Search Shipments
    const shipments = await Shipment.find({
        $or: [
            { referenceId: regex },
            { 'origin.name': regex },
            { 'destination.name': regex },
            { 'consignee.name': regex }
        ]
    })
        .select('referenceId status origin destination')
        .limit(5)
        .lean()

    // Search Users (Drivers and Customers)
    const users = await User.find({
        $and: [
            { role: { $in: ['DRIVER', 'CUSTOMER'] } },
            {
                $or: [
                    { name: regex },
                    { email: regex },
                    { phone: regex }
                ]
            }
        ]
    })
        .select('name email phone role')
        .limit(5)
        .lean()

    // Search Vehicles
    const vehicles = await Vehicle.find({
        $or: [
            { plateNumber: regex },
            { model: regex }
        ]
    })
        .select('plateNumber model status')
        .limit(5)
        .lean()

    // Search Documents
    const documents = await Document.find({
        $or: [
            { fileName: regex },
            { type: regex }
        ]
    })
        .select('fileName type shipmentId filePath')
        .limit(5)
        .lean()

    // Formulate the results
    const results = [
        ...shipments.map(s => ({
            id: s._id,
            type: 'shipment',
            title: s.referenceId,
            subtitle: `${s.origin.name} → ${s.destination.name}`,
            status: s.status,
            link: `/app/shipments/${s._id}`
        })),
        ...users.map(u => ({
            id: u._id,
            type: u.role.toLowerCase(),
            title: u.name,
            subtitle: u.email,
            link: u.role === 'DRIVER' ? `/app/fleet/drivers` : `/app/customers`
        })),
        ...vehicles.map(v => ({
            id: v._id,
            type: 'vehicle',
            title: v.plateNumber,
            subtitle: v.model,
            status: v.status,
            link: `/app/fleet/vehicles`
        })),
        ...documents.map(d => ({
            id: d._id,
            type: 'document',
            title: d.fileName,
            subtitle: d.type.replace(/_/g, ' '),
            link: `/app/shipments/${d.shipmentId?._id || d.shipmentId}`
        }))
    ]

    res.json({ results })
})
