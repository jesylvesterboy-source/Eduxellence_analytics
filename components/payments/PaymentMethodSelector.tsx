PATCH for components/payments/PaymentMethodSelector.tsx
=========================================================
Two small additions needed. Without these, Paystack/Flutterwave webhooks
for Analytics arrive with EMPTY metadata and the central router will
reject them with "missing platform_key" — nothing will route.

You'll also need to pass `projectId` and `milestoneId` into this
component as new props (from whatever page renders it), since the
component currently doesn't receive them but the metadata needs them.

--- 1. In payWithFlutterwave(), find: ---

    w.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: ref,
      amount: amountUsd,
      currency: "USD",
      payment_options: "card,ussd,banktransfer",
      customer: { email: userEmail },
      customizations: { title: "Eduxellence Analytics" },
      callback: () => {

--- Change to (add "meta" field before "callback"): ---

    w.FlutterwaveCheckout({
      public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: ref,
      amount: amountUsd,
      currency: "USD",
      payment_options: "card,ussd,banktransfer",
      customer: { email: userEmail },
      customizations: { title: "Eduxellence Analytics" },
      meta: {
        platform_key: "analytics",
        project_id: projectId,
        milestone_id: milestoneId ?? null,
        expected_amount: amountUsd,
        expected_currency: "USD",
      },
      callback: () => {


--- 2. In payWithPaystack(), find: ---

    const amountNgn = Math.round(amountUsd * ngnRate * 100);
    const ref = `EDUX-PSK-${Date.now()}`;
    const handler = w.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountNgn,
      currency: "NGN",
      ref,
      callback: () => {

--- Change to (add "metadata" field before "callback" — note expected_amount
uses amountNgn / 100, the SAME value Paystack will actually charge and later
report back via verify, not the raw amountUsd): ---

    const amountNgn = Math.round(amountUsd * ngnRate * 100);
    const ref = `EDUX-PSK-${Date.now()}`;
    const handler = w.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: amountNgn,
      currency: "NGN",
      ref,
      metadata: {
        platform_key: "analytics",
        project_id: projectId,
        milestone_id: milestoneId ?? null,
        expected_amount: amountNgn / 100,
        expected_currency: "NGN",
      },
      callback: () => {


--- 3. Add the two new props to the component signature: ---

Find:
    export default function PaymentMethodSelector({
      amountUsd,
      ngnRate,
      userEmail,
      bankReference,
      existingPayment,
      onSubmitPayment,
    }: {
      amountUsd: number;
      ngnRate: number | null;
      userEmail: string;
      bankReference: string;
      existingPayment: ExistingPayment;
      onSubmitPayment: (...) => Promise<{ error?: string }>;
    }) {

Change to:
    export default function PaymentMethodSelector({
      amountUsd,
      ngnRate,
      userEmail,
      bankReference,
      existingPayment,
      onSubmitPayment,
      projectId,
      milestoneId,
    }: {
      amountUsd: number;
      ngnRate: number | null;
      userEmail: string;
      bankReference: string;
      existingPayment: ExistingPayment;
      onSubmitPayment: (...) => Promise<{ error?: string }>;
      projectId: string;
      milestoneId?: string | null;
    }) {

--- 4. Wherever <PaymentMethodSelector .../> is rendered (the milestone
payment page — not shown to me, so find it yourself), pass the new props: ---

    <PaymentMethodSelector
      ...existing props...
      projectId={projectId}
      milestoneId={milestoneId ?? null}
    />