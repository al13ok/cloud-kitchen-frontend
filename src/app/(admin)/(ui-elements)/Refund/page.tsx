import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function RefundPage() {
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <PageBreadcrumb pageTitle="Refund Policy" />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 border border-gray-100 dark:border-gray-700">
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Refund & Cancellation Policy</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-8 text-gray-700 dark:text-gray-200">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Overview</h2>
              <p>
                We strive to provide a great experience. If something isn’t working as expected, you may be
                eligible for a refund according to the terms below. This policy applies to purchases made
                directly through our platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Eligibility</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>Requests must be made within 14 days of the original purchase.</li>
                <li>No material breach of our Terms of Service has occurred.</li>
                <li>You have attempted reasonable troubleshooting with our support team.</li>
                <li>For subscriptions, only the current billing period is eligible (unused time will be prorated).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Non‑refundable</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>One‑time setup/implementation fees after work has started.</li>
                <li>Usage‑based charges that have already been incurred.</li>
                <li>Third‑party fees or add‑ons billed through us on your behalf.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">How to request a refund</h2>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Collect your order ID and a brief description of the issue.</li>
                <li>Contact support at <a href="mailto:connect@mobiloitte.ae" className="text-blue-600 dark:text-blue-400 underline">connect@mobiloitte.ae</a>.</li>
                <li>Our team will review your request within 3–5 business days and follow up via email.</li>
              </ol>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Processing time</h2>
              <p>
                Approved refunds are typically processed within 5–10 business days. Depending on your bank or payment
                provider, it may take additional time for the credit to appear on your statement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Cancellation</h2>
              <p>
                You can cancel a subscription at any time from your account settings. Your plan will remain active until
                the end of the current billing period. Cancelling a subscription does not automatically initiate a refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">FAQ</h2>
              <div className="space-y-4">
                <div>
                  <p className="font-medium">Can I get a refund after 14 days?</p>
                  <p className="text-gray-600 dark:text-gray-300">In most cases, no. However, contact support and we will review exceptional circumstances.</p>
                </div>
                <div>
                  <p className="font-medium">How will I receive my refund?</p>
                  <p className="text-gray-600 dark:text-gray-300">Refunds are issued to the original payment method used for the purchase.</p>
                </div>
                <div>
                  <p className="font-medium">Can I reverse a chargeback?</p>
                  <p className="text-gray-600 dark:text-gray-300">If a chargeback is initiated, we may suspend services while the payment provider investigates.</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}


