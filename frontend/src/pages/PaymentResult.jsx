import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../services/http.js';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const [paymentStatus, setPaymentStatus] = useState(params.get('status') === 'success' ? 'checking' : params.get('status') || 'failed');
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    const refresh = () => apiRequest(`/api/payments/sslcommerz/status/${orderId}`).then(({ paymentStatus: status }) => {
      if (active) setPaymentStatus(status === 'paid' ? 'paid' : status === 'pending' ? 'checking' : status);
    }).catch(() => {});
    refresh();
    const timer = setInterval(refresh, 2500);
    const stop = setTimeout(() => clearInterval(timer), 15000);
    return () => { active = false; clearInterval(timer); clearTimeout(stop); };
  }, [orderId]);
  const paid = paymentStatus === 'paid';
  const waiting = paymentStatus === 'checking';
  return <main className="order-page"><section className="success-card"><span className="eyebrow">PAYMENT {paid ? 'CONFIRMED' : waiting ? 'PROCESSING' : 'NOT COMPLETED'}</span><h1>{paid ? 'Your order is confirmed.' : waiting ? 'Confirming your payment…' : 'Payment was not completed.'}</h1><p>{paid ? 'We received your payment and sent an order confirmation email.' : waiting ? 'We are checking the gateway response. This page updates automatically.' : 'Your order was not paid. Any reserved stock has been released.'}</p>{orderId && <div className="success-order-number"><span>Order reference</span><strong>{orderId}</strong></div>}<div className="success-actions">{orderId && <Link className="dark-button" to={`/orders/${orderId}`}>View order</Link>}<Link className="text-link" to="/orders">My orders</Link></div></section></main>;
}
