# System Workflows

## 1. Shipment Lifecycle (Event-Driven)

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> ASSIGNED: Assign Vehicle/Driver
    ASSIGNED --> PICKED_UP: Driver Collects Cargo
    PICKED_UP --> IN_TRANSIT: Driver En Route
    IN_TRANSIT --> DELAYED: GPS/Traffic Exception
    DELAYED --> IN_TRANSIT: Issue Resolved
    IN_TRANSIT --> OUT_FOR_DELIVERY: Near Destination
    OUT_FOR_DELIVERY --> DELIVERED: Proof of Delivery Uploaded
    DELIVERED --> CLOSED: Payment Settled
    CREATED --> CANCELLED: User Cancels
    ASSIGNED --> CANCELLED
```

## 2. Order to Payment Flow

```mermaid
sequenceDiagram
    participant Customer
    participant System
    participant Driver
    participant Billing
    participant Bank

    Customer->>System: Create Shipment (with Pricing)
    System-->>Customer: Shipment ID (Status: CREATED)
    System->>Driver: Assign Shipment
    Driver->>System: Accept & Pick Up (Status: PICKED_UP)
    
    loop Tracking
        System->>System: GPS Updates
        opt Delay Detected
           System->>Customer: Send Notification
        end
    end

    Driver->>System: Mark Delivered (Upload POD)
    System->>Billing: Trigger Invoice Generation
    Billing->>System: Invoice Created (Status: PENDING)
    
    System->>Customer: Request Payment
    Customer->>Bank: Pay Invoice
    Bank-->>System: Webhook (Payment Success)
    System->>Billing: Mark Paid
    System->>System: Close Shipment (Status: CLOSED)
```

## 3. Real-time Auto-Assignment

```mermaid
flowchart TD
    A[New Shipment Created] --> B{Manager Assign?}
    B -- Yes --> C[Manual Selection]
    B -- No --> D[Auto-Assign Engine]
    D --> E[Search Nearby Drivers (Radius 10km)]
    E --> F[Filter: Vehicle Type & Capacity]
    F --> G[Sort by: Rating & Utilization]
    G --> H{Found Candidate?}
    H -- Yes --> I[Send Request to Driver]
    I --> J{Driver Accept?}
    J -- Yes --> K[Assign & Notify Customer]
    J -- No --> L[Try Next Candidate]
    H -- No --> M[Alert Manager (Manual Intervention)]
```
