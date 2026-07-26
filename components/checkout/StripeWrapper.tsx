'use client';
// xd

import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import StripePaymentForm from './StripePaymentForm';

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_for_build';
const stripePromise = loadStripe(publishableKey);

interface StripeWrapperProps {
  clientSecret: string;
  amount: number;
}

export default function StripeWrapper({ clientSecret, amount }: StripeWrapperProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#2563EB',
          },
        },
      }}
    >
      <StripePaymentForm amount={amount} />
    </Elements>
  );
}
