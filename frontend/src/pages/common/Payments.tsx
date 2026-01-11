import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import type { Invoice, Payout } from '../../types'

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Payments() {
  const { user } = useAuth()
  const q = useQuery<Invoice[]>({
    queryKey: ['payments', 'invoices'],
    queryFn: () => api.get('/payments/invoices').then((res) => res.data.invoices),
  })

  const payoutsQ = useQuery<Payout[]>({
    queryKey: ['payments', 'payouts'],
    queryFn: () => api.get('/payments/payouts').then((res) => res.data.payouts),
    enabled: user?.role === 'MANAGER',
  })

  if (q.isError) return (
    <div className="p-8 text-center bg-red-50 border border-red-200 rounded-3xl">
      <h2 className="text-xl font-bold text-red-900">Billing Sync Error</h2>
      <p className="text-red-700 mt-2">{q.error instanceof Error ? q.error.message : 'Failed to fetch invoices'}</p>
      <button onClick={() => q.refetch()} className="btn-primary mt-6">Retry Sync</button>
    </div>
  )

  if (q.isLoading || (user?.role === 'MANAGER' && payoutsQ.isLoading)) return <div className="p-12 text-center text-slate-500">Loading payment records...</div>

  async function issue(id: string) {
    await api.post(`/payments/invoices/${id}/issue`)
    await q.refetch()
  }

  async function pay(id: string) {
    // legacy flow (kept): pay only after POD verification
    try {
      await api.post(`/payments/invoices/${id}/pay`, { method: 'MOCK' })
      alert('Payment success (mock)')
      await q.refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      alert(msg ?? 'Payment failed')
    }
  }

  async function payWithRazorpay(invoice: Invoice) {
    try {
      const { data: order } = await api.post('/payments/razorpay/order', { invoiceId: invoice._id });

      const options = {
        key: 'rzp_test_placeholder', // Should come from env or config
        amount: order.amount,
        currency: order.currency,
        name: 'JSHS Logistics',
        description: `Payment for Invoice ${invoice._id.slice(-6)}`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            await api.post('/payments/razorpay/verify', {
              ...response,
              invoiceId: invoice._id
            });
            alert('Payment Successful!');
            await q.refetch();
          } catch (err) {
            console.error('Verification failed', err);
            alert('Payment verification failed');
          }
        },
        prefill: {
          name: user?.name,
          email: user?.email,
        },
        theme: {
          color: '#34d399',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Razorpay Error:', err);
      alert('Failed to initialize payment');
    }
  }

  async function releaseEscrow(id: string) {
    try {
      await api.post(`/payments/invoices/${id}/release`, { method: 'MANUAL_RELEASE' })
      alert('Escrow released (mock)')
      await q.refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      alert(msg ?? 'Release failed')
    }
  }

  async function raiseDispute(id: string) {
    const reason = prompt('Dispute reason (min 5 chars):')
    if (!reason) return

    try {
      await api.post(`/payments/invoices/${id}/dispute`, { reason })
      alert('Dispute opened')
      await q.refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      alert(msg ?? 'Dispute failed')
    }
  }

  async function resolve(disputeId: string, outcome: 'RELEASE' | 'REFUND') {
    const note = prompt('Resolution note (optional):') ?? undefined

    try {
      await api.post(`/payments/disputes/${disputeId}/resolve`, { outcome, note })
      alert(`Dispute resolved: ${outcome}`)
      await q.refetch()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
      alert(msg ?? 'Resolve failed')
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-slate-600 dark:text-white/70">Secure payments via Stripe Connect. Funds are held in escrow until Proof of Delivery (POD) is verified.</p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block table-glass">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-3">Invoice</th>
              <th className="p-3">Shipment</th>
              <th className="p-3">Amount</th>
              <th className="p-3">POD</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {(q.data || []).map((i) => {
              const canIssue = user?.role === 'MANAGER' && i.status === 'DRAFT'

              // New main flow: customer funds escrow early; manager verifies POD; escrow auto-releases.
              const canFundEscrow = user?.role === 'CUSTOMER' && i.status === 'ISSUED'
              const canReleaseEscrow = user?.role === 'MANAGER' && i.status === 'FUNDED' && !!i.podVerified

              const canRaiseDispute =
                user?.role === 'CUSTOMER' &&
                i.status === 'FUNDED' &&
                i.shipmentStatus === 'DELIVERED' &&
                !i.openDisputeId

              const canResolveDispute = user?.role === 'MANAGER' && i.status === 'DISPUTED' && !!i.openDisputeId

              return (
                <tr key={i._id} className="border-t border-slate-200/60 dark:border-white/10">
                  <td className="p-3 font-medium">{i._id.slice(-6)}</td>
                  <td className="p-3">{i.shipmentRef ?? i.shipmentId.slice(-6)}</td>
                  <td className="p-3">
                    {i.currency} {i.amount}
                  </td>
                  <td className="p-3">
                    {i.podVerified ? (
                      <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs text-green-700 ring-1 ring-green-500/20 dark:text-green-200">
                        VERIFIED
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-500/10 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-500/20 dark:text-white/70">
                        PENDING
                      </span>
                    )}
                  </td>
                  <td className="p-3">{i.status}</td>
                  <td className="p-3">
                    {canIssue ? (
                      <button onClick={() => issue(i._id)} className="btn-primary text-xs">
                        Issue
                      </button>
                    ) : null}

                    {canFundEscrow ? (
                      <button
                        onClick={() => payWithRazorpay(i)}
                        className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-2"
                      >
                        <span>Pay via Razorpay</span>
                        <span className="opacity-70 text-[10px]">(₹1)</span>
                      </button>
                    ) : null}

                    {canReleaseEscrow ? (
                      <button onClick={() => releaseEscrow(i._id)} className="btn-primary text-xs ml-2">
                        Release
                      </button>
                    ) : null}

                    {canRaiseDispute ? (
                      <button onClick={() => raiseDispute(i._id)} className="btn-secondary text-xs ml-2">
                        Raise Dispute
                      </button>
                    ) : null}

                    {canResolveDispute ? (
                      <span className="inline-flex gap-2">
                        <button
                          onClick={() => resolve(i.openDisputeId!, 'RELEASE')}
                          disabled={!i.podVerified}
                          className="btn-primary text-xs ml-2 disabled:opacity-50"
                          title={!i.podVerified ? 'Verify POD before releasing escrow' : 'Release escrow'}
                        >
                          Resolve: Release
                        </button>
                        <button onClick={() => resolve(i.openDisputeId!, 'REFUND')} className="btn-secondary text-xs">
                          Resolve: Refund
                        </button>
                      </span>
                    ) : null}

                    {/* Legacy fallback */}
                    {user?.role === 'CUSTOMER' && i.status === 'ISSUED' && i.podVerified ? (
                      <button onClick={() => pay(i._id)} className="btn-secondary text-xs ml-2" title="Legacy: pay after POD">
                        Pay (Legacy)
                      </button>
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {(q.data || []).map((i) => {
          const canIssue = user?.role === 'MANAGER' && i.status === 'DRAFT'
          const canFundEscrow = user?.role === 'CUSTOMER' && i.status === 'ISSUED'
          const canReleaseEscrow = user?.role === 'MANAGER' && i.status === 'FUNDED' && !!i.podVerified
          const canRaiseDispute = user?.role === 'CUSTOMER' && i.status === 'FUNDED' && i.shipmentStatus === 'DELIVERED' && !i.openDisputeId
          const canResolveDispute = user?.role === 'MANAGER' && i.status === 'DISPUTED' && !!i.openDisputeId

          return (
            <div key={i._id} className="glass-card p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">Inv: {i._id.slice(-6)}</div>
                  <div className="text-xs text-slate-500">Ref: {i.shipmentRef ?? i.shipmentId.slice(-6)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{i.currency} {i.amount}</div>
                  <div className={`text-xs font-medium ${i.status === 'PAID' ? 'text-green-600' :
                      i.status === 'PENDING' ? 'text-orange-500' :
                        'text-slate-500'
                    }`}>{i.status}</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs py-2 border-y border-slate-100 dark:border-white/5">
                <span className="text-slate-500">POD Status</span>
                {i.podVerified ? (
                  <span className="bg-green-500/10 text-green-700 px-2 py-0.5 rounded-full ring-1 ring-green-500/20 dark:text-green-200">VERIFIED</span>
                ) : (
                  <span className="bg-slate-500/10 text-slate-700 px-2 py-0.5 rounded-full ring-1 ring-slate-500/20 dark:text-white/70">PENDING</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {canIssue && (
                  <button onClick={() => issue(i._id)} className="btn-primary text-xs w-full justify-center">
                    Issue Invoice
                  </button>
                )}

                {canFundEscrow && (
                  <button
                    onClick={() => payWithRazorpay(i)}
                    className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 w-full shadow-sm"
                  >
                    <span>Pay via Razorpay</span>
                    <span className="opacity-70 text-[10px]">(₹1)</span>
                  </button>
                )}

                {canReleaseEscrow && (
                  <button onClick={() => releaseEscrow(i._id)} className="btn-primary text-xs flex-1">
                    Release Escrow
                  </button>
                )}

                {canRaiseDispute && (
                  <button onClick={() => raiseDispute(i._id)} className="btn-secondary text-xs w-full">
                    Raise Dispute
                  </button>
                )}

                {canResolveDispute && (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => resolve(i.openDisputeId!, 'RELEASE')}
                      disabled={!i.podVerified}
                      className="btn-primary text-xs flex-1 disabled:opacity-50"
                    >
                      Release
                    </button>
                    <button onClick={() => resolve(i.openDisputeId!, 'REFUND')} className="btn-secondary text-xs flex-1">
                      Refund
                    </button>
                  </div>
                )}

                {/* Legacy fallback */}
                {user?.role === 'CUSTOMER' && i.status === 'ISSUED' && i.podVerified ? (
                  <button onClick={() => pay(i._id)} className="btn-secondary text-xs ml-2 w-full" title="Legacy: pay after POD">
                    Pay (Legacy)
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-xs text-slate-500 dark:text-white/60">
        Escrow flow: Customer funds escrow after invoice is issued → Driver delivers + uploads POD → Manager verifies POD → escrow auto-releases.
        Once the invoice becomes <b>PAID</b>, the system auto-splits payout in realtime: <b>Driver (70%)</b> + <b>Logistics (30%)</b> (mock instant transfer).
      </div>

      {user?.role === 'MANAGER' ? (
        <div className="glass-card">
          <div className="mb-2 text-sm font-medium">Realtime payouts (split settlement)</div>
          <div className="overflow-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500 dark:text-white/60">
                  <th className="py-2">Recipient</th>
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(payoutsQ.data || []).slice(0, 10).map((p) => (
                  <tr key={p._id} className="border-t border-slate-200/60 dark:border-white/10">
                    <td className="py-2">{p.recipientType}</td>
                    <td className="py-2 font-medium">{p.invoiceId.slice(-6)}</td>
                    <td className="py-2">
                      {p.currency} {p.amount}
                    </td>
                    <td className="py-2">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

