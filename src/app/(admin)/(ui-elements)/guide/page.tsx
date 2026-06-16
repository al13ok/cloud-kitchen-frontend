export default function DocumentPage() {
    return <div className="bg-gray-50 text-gray-900 leading-relaxed">
        <div className="min-h-screen">
        {/* <!-- Header --> */}
        <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-6 py-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
                <p className="text-lg text-gray-600"><strong>Effective Date:</strong> August 1, 2025</p>
            </div>
        </header>

        {/* <!-- Main Content --> */}
        <main className="max-w-4xl mx-auto px-6 py-12">
            {/* <!-- Introduction --> */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <p className="text-lg text-gray-700 mb-6">Welcome to [Your Company Name]! These Terms and Conditions (&quot;Terms&quot;) govern your use of our Unified AI Chatbot SaaS platform and any related services (the &quot;Service&quot;).</p>
                <p className="text-lg text-gray-700">By accessing or using the Service, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Service.</p>
            </div>

            {/* <!-- Section 1: Acceptance of Terms --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">1. Acceptance of Terms</h2>
                <p className="text-gray-700">By creating an account, clicking &quot;I Agree,&quot; or otherwise using the Service, you represent that you have read, understood, and agree to be bound by these Terms, as well as our <a href="https://www.google.com/search?q=link-to-privacy-policy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a>. You must be at least 18 years of age to use our Service.</p>
            </section>

            {/* <!-- Section 2: Description of Service --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">2. Description of Service</h2>
                <p className="text-gray-700">[Your Company Name] provides a web-based, Unified AI Chatbot as a Service (&quot;SaaS&quot;) platform that allows enterprise customers to deploy and manage AI chatbots for various applications. The Service includes access to our software, documentation, and support services.</p>
            </section>

            {/* <!-- Section 3: Your Account and Responsibilities --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">3. Your Account and Responsibilities</h2>
                <div className="space-y-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                        <h3 className="text-lg font-medium text-blue-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                            </svg>
                            Account Creation
                        </h3>
                        <p className="text-blue-800">You must provide accurate and complete information to create and maintain your account. You are responsible for all activities that occur under your account.</p>
                    </div>
                    <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                        <h3 className="text-lg font-medium text-green-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                            </svg>
                            Security
                        </h3>
                        <p className="text-green-800">You are responsible for safeguarding your password and for any activities or actions under your password. You must notify us immediately of any breach of security or unauthorized use of your account.</p>
                    </div>
                    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                        <h3 className="text-lg font-medium text-red-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd"></path>
                            </svg>
                            Prohibited Use
                        </h3>
                        <p className="text-red-800">You agree not to use the Service for any unlawful, illegal, or unauthorized purpose. This includes, but is not limited to, using the Service to generate or process content that is defamatory, obscene, or infringing on the intellectual property rights of others.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Section 4: User-Generated Content --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">4. User-Generated Content</h2>
                <div className="space-y-6">
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Ownership</h3>
                        <p className="text-gray-700">You retain all intellectual property rights to the data, text, images, and other content that you or your end-users submit to the Service (&quot;User-Generated Content&quot;).</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">License to [Your Company Name]</h3>
                        <p className="text-gray-700">By submitting User-Generated Content to the Service, you grant us a worldwide, non-exclusive, royalty-free, perpetual, and transferable license to use, reproduce, modify, and process the content to the extent necessary to provide, maintain, and improve the Service. This includes using anonymized and aggregated data for the purpose of improving our AI models.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Representations and Warranties</h3>
                        <p className="text-gray-700">You represent and warrant that you own or have the necessary licenses, rights, and consents to grant us the license mentioned above, and that your User-Generated Content and its use do not violate any applicable laws or infringe upon the rights of any third party.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Section 5: Intellectual Property --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">5. Intellectual Property</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-purple-900 mb-3">Our Intellectual Property</h3>
                        <p className="text-purple-800">The Service, including all software, technology, and content, is and will remain the exclusive property of [Your Company Name] and its licensors. The Service is protected by copyright, trademark, and other intellectual property laws.</p>
                    </div>
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                        <h3 className="text-lg font-medium text-indigo-900 mb-3">Customer&apos;s Intellectual Property</h3>
                        <p className="text-indigo-800">You retain all intellectual property rights to any content that you upload or create on the platform.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Section 6: Confidentiality --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">6. Confidentiality</h2>
                <div className="space-y-6">
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
                        <h3 className="text-lg font-medium text-yellow-900 mb-3">Our Confidential Information</h3>
                        <p className="text-yellow-800">You agree to maintain the confidentiality of our confidential information, including, but not limited to, our software, technology, and business methods.</p>
                    </div>
                    <div className="bg-teal-50 border-l-4 border-teal-500 p-6 rounded-r-lg">
                        <h3 className="text-lg font-medium text-teal-900 mb-3">Your Confidential Information</h3>
                        <p className="text-teal-800">We agree to maintain the confidentiality of your confidential information in accordance with our <a href="https://www.google.com/search?q=link-to-privacy-policy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a> and any separate data processing agreements. We will not use or disclose your confidential information except as necessary to provide the Service or as required by law.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Section 7: Fees and Payment --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">7. Fees and Payment</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-green-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-green-900 mb-2">Billing</h3>
                        <p className="text-green-800 text-sm">You agree to pay all fees and charges associated with your use of the Service as described on our pricing page or in a separate agreement.</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-blue-900 mb-2">Automatic Renewal</h3>
                        <p className="text-blue-800 text-sm">Your subscription may automatically renew at the end of each subscription period unless you cancel it.</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 0a1 1 0 100 2h.01a1 1 0 100-2H9zm2 0a1 1 0 100 2h.01a1 1 0 100-2H11z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-purple-900 mb-2">Taxes</h3>
                        <p className="text-purple-800 text-sm">All fees are exclusive of applicable taxes, which will be charged as required by law.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Section 8: Termination --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">8. Termination</h2>
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <p className="text-red-800">We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason whatsoever, including, without limitation, if you breach these Terms. Upon termination, your right to use the Service will immediately cease.</p>
                </div>
            </section>

            {/* <!-- Section 9: Disclaimer of Warranties --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">9. Disclaimer of Warranties</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                                            <p className="text-orange-800">The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no representations or warranties of any kind, express or implied, as to the operation of the Service or the information, content, or materials included therein. To the full extent permissible by applicable law, we disclaim all warranties, express or implied, including, but not limited to, implied warranties of merchantability and fitness for a particular purpose.</p>
                </div>
            </section>

            {/* <!-- Section 10: Limitation of Liability --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">10. Limitation of Liability</h2>
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-6">
                    <p className="text-gray-800">In no event shall [Your Company Name], nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of, or inability to access or use, the Service.</p>
                </div>
            </section>

            {/* <!-- Section 11: Indemnification --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">11. Indemnification</h2>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-blue-800">You agree to defend, indemnify, and hold harmless [Your Company Name] and its employees, agents, and affiliates from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney&apos;s fees) arising from your use of the Service or your violation of these Terms.</p>
                </div>
            </section>

            {/* <!-- Section 12: Governing Law and Jurisdiction --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">12. Governing Law and Jurisdiction</h2>
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                    <p className="text-indigo-800">These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any dispute arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in [City, State], India.</p>
                </div>
            </section>

            {/* <!-- Section 13: Changes to Terms --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">13. Changes to Terms</h2>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <p className="text-yellow-800">We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide at least 30 days&apos; notice before any new terms take effect. By continuing to access or use our Service after those revisions become effective, you agree to be bound by the revised terms.</p>
                    </div>
            </section>

            {/* <!-- Section 14: Contact Information --> */}
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 border-b border-gray-200 pb-3">14. Contact Information</h2>
                <p className="text-gray-700 mb-6">If you have any questions about these Terms, please contact us at:</p>
                
                <div className="bg-gray-50 rounded-lg p-6">
                    <div className="space-y-2">
                        <p className="text-gray-900 font-medium">Converiqo.ai</p>
                        <p className="text-gray-700">Powered by Mobiloitte Group</p>
                        <p className="text-gray-700">Alharith Hafiz</p>
                        <p className="text-gray-700">Email: <a href="mailto:connect@mobiloitte.ae" className="text-blue-600 hover:text-blue-800 underline">connect@mobiloitte.ae</a></p>
                        <p className="text-gray-700">MOBILOITTE AI IT SOLUTIONS LLC</p>
                        <p className="text-gray-700">Trade License No: 1465972</p>
                        <p className="text-gray-700">AL DANA CENTRE, Plot No. 702-0, Al Muraqabat, Dubai, UAE</p>
                    </div>
                </div>
            </section>
        </main>
        
    </div>
        </div>;
} 
