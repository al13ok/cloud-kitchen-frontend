export default function SubscriptionPage() {
    return <div className="bg-gray-50 text-gray-900 leading-relaxed">
        <div className="min-h-screen">
        {/* <!-- Header --> */}
        <header className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="text-center">
                    <h1 className="text-5xl font-bold mb-6">Enterprise-Grade Data Security and Trust</h1>
                    <p className="text-xl text-blue-100 max-w-4xl mx-auto">At [Your Company Name], we understand that the trust of our enterprise customers is our most valuable asset. Our commitment to data security and privacy is foundational to the design and operation of our Unified AI Chatbot SaaS platform.</p>
                </div>
            </div>
        </header>

        {/* <!-- Main Content --> */}
        <main className="max-w-6xl mx-auto px-6 py-12">
            {/* <!-- Security Philosophy --> */}
            <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-12">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Security Philosophy</h2>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                    <p className="text-blue-800 text-lg">We operate on a &quot;Security First&quot; principle. This means that security is not an afterthought but is built into every layer of our platform, from software development and infrastructure management to our internal corporate policies. We adhere to a <strong>zero-trust</strong> model, ensuring that every user, device, and application is authenticated and authorized before gaining access to data.</p>
                </div>
            </section>

            {/* <!-- Security Features Grid --> */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
                {/* <!-- Data Encryption --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">1. Data Encryption</h2>
                    </div>
                    <p className="text-gray-700 mb-6">Your data is protected by industry-leading encryption methods both in transit and at rest.</p>
                    <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="font-semibold text-green-900 mb-2">Encryption in Transit</h3>
                            <p className="text-green-800 text-sm">All data exchanged between your browsers, APIs, and our servers is secured using Transport Layer Security (TLS 1.2 or higher). This prevents unauthorized interception or tampering of data as it travels across the internet.</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <h3 className="font-semibold text-green-900 mb-2">Encryption at Rest</h3>
                            <p className="text-green-800 text-sm">All customer data stored in our databases and file storage systems is encrypted using the AES-256 algorithm. This ensures that even in the unlikely event of physical access to our infrastructure, your data remains unreadable.</p>
                        </div>
                    </div>
                </section>

                {/* <!-- Access Control --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">2. Access Control and Identity Management</h2>
                    </div>
                    <p className="text-gray-700 mb-6">We enforce strict access controls to ensure that only authorized personnel and systems can access your data.</p>
                    <div className="space-y-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">Role-Based Access Control (RBAC)</h3>
                            <p className="text-blue-800 text-sm">Access to customer data is granted on a strict need-to-know basis. Our internal teams are given the minimum level of access required to perform their duties.</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">Multi-Factor Authentication (MFA)</h3>
                            <p className="text-blue-800 text-sm">MFA is mandatory for all employees and administrators accessing our production environments and sensitive systems.</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">Secure Authentication</h3>
                            <p className="text-blue-800 text-sm">We use robust identity management systems to handle user authentication, ensuring strong password policies and preventing unauthorized access to your account.</p>
                        </div>
                    </div>
                </section>

                {/* <!-- Network Security --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">3. Network and Infrastructure Security</h2>
                    </div>
                    <p className="text-gray-700 mb-6">Our platform is hosted on a world-className, reputable cloud infrastructure provider (e.g., AWS, GCP, Azure), leveraging their inherent security benefits.</p>
                    <div className="space-y-4">
                        <div className="bg-purple-50 rounded-lg p-4">
                            <h3 className="font-semibold text-purple-900 mb-2">Network Segregation</h3>
                            <p className="text-purple-800 text-sm">Customer environments are logically isolated from each other to prevent cross-contamination. This multi-tenant architecture is designed with strict data separation in mind.</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <h3 className="font-semibold text-purple-900 mb-2">Firewalls and Intrusion Detection</h3>
                            <p className="text-purple-800 text-sm">We use advanced firewalls and intrusion detection systems to monitor traffic and block malicious activity.</p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <h3 className="font-semibold text-purple-900 mb-2">Regular Audits and Monitoring</h3>
                            <p className="text-purple-800 text-sm">Our infrastructure is continuously monitored for security vulnerabilities, unauthorized access attempts, and other anomalies.</p>
                        </div>
                    </div>
                </section>

                {/* <!-- Compliance --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 0a1 1 0 100 2h.01a1 1 0 100-2H9zm2 0a1 1 0 100 2h.01a1 1 0 100-2H11z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">4. Compliance and Certifications</h2>
                    </div>
                    <p className="text-gray-700 mb-6">We are committed to meeting and maintaining compliance with global and industry-specific security standards to provide you with the highest level of assurance.</p>
                    <div className="space-y-4">
                        <div className="bg-indigo-50 rounded-lg p-4">
                            <h3 className="font-semibold text-indigo-900 mb-2">ISO 27001</h3>
                            <p className="text-indigo-800 text-sm">We are working towards ISO 27001 certification, demonstrating our commitment to a systematic and continuous approach to managing sensitive company and customer information.</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4">
                            <h3 className="font-semibold text-indigo-900 mb-2">SOC 2</h3>
                            <p className="text-indigo-800 text-sm">We conduct regular SOC 2 (Service Organization Control 2) audits to ensure that our controls related to security, availability, processing integrity, confidentiality, and privacy are robust and effective.</p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-4">
                            <h3 className="font-semibold text-indigo-900 mb-2">Global Privacy Regulations</h3>
                            <p className="text-indigo-800 text-sm">As detailed in our <a href="https://www.google.com/search?q=link-to-privacy-policy" className="text-blue-600 hover:text-blue-800 underline">Privacy Policy</a>, our data handling practices are designed to comply with key regulations such as GDPR, CCPA/CPRA, and India&apos;s DPDPA.</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* <!-- AI-Specific Data Handling --> */}
            <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 mb-8">
                <div className="flex items-center mb-6">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                        <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">5. AI-Specific Data Handling and Privacy</h2>
                </div>
                <p className="text-gray-700 mb-6">We have implemented specific measures to ensure that your proprietary AI Chatbot Data is handled with the utmost care and is not used inappropriately.</p>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-orange-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-orange-900 mb-2">Data Minimization</h3>
                        <p className="text-orange-800 text-sm">We only collect the data necessary to provide and improve the Service. We avoid collecting sensitive personal information unless explicitly required for the chatbot&apos;s functionality.</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-orange-900 mb-2">Anonymization for AI Model Improvement</h3>
                        <p className="text-orange-800 text-sm">Any data used for the general improvement and training of our core AI models is first aggregated and irreversibly anonymized. Your identifiable business data and end-user data are never used to train models in a way that could expose your or your end-users&apos; information to other customers.</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-6 text-center">
                        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-orange-900 mb-2">Customer-Specific Models</h3>
                        <p className="text-orange-800 text-sm">Where you opt for a custom, fine-tuned model for your business, your data is used exclusively for that purpose and is never shared or used to train a public model.</p>
                    </div>
                </div>
            </section>

            {/* <!-- Additional Security Measures --> */}
            <div className="grid lg:grid-cols-2 gap-8 mb-12">
                {/* <!-- Incident Response --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">6. Incident Response and Business Continuity</h2>
                    </div>
                    <p className="text-gray-700 mb-6">We are prepared for the unexpected with a detailed incident response plan and a commitment to business continuity.</p>
                    <div className="space-y-4">
                        <div className="bg-red-50 rounded-lg p-4">
                            <h3 className="font-semibold text-red-900 mb-2">Incident Response Plan</h3>
                            <p className="text-red-800 text-sm">In the event of a security incident, our team is trained to respond immediately to contain the issue, mitigate any damage, and communicate transparently with affected customers.</p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4">
                            <h3 className="font-semibold text-red-900 mb-2">Business Continuity and Disaster Recovery</h3>
                            <p className="text-red-800 text-sm">We maintain redundant systems and regular data backups to ensure the continued availability of our Service, even in the face of a major disaster.</p>
                        </div>
                    </div>
                </section>

                {/* <!-- Employee Security --> */}
                <section className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
                    <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"></path>
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">7. Employee Security and Training</h2>
                    </div>
                    <p className="text-gray-700 mb-6">Our employees are our first line of defense. We ensure they are well-equipped to protect your data.</p>
                    <div className="space-y-4">
                        <div className="bg-teal-50 rounded-lg p-4">
                            <h3 className="font-semibold text-teal-900 mb-2">Background Checks</h3>
                            <p className="text-teal-800 text-sm">All employees undergo a thorough background check before employment.</p>
                        </div>
                        <div className="bg-teal-50 rounded-lg p-4">
                            <h3 className="font-semibold text-teal-900 mb-2">Mandatory Security Training</h3>
                            <p className="text-teal-800 text-sm">Employees receive regular, mandatory security and privacy training to stay informed about the latest threats and best practices.</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* <!-- Commitment to Trust --> */}
            <section className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg p-8 text-white text-center">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold mb-6">Our Commitment to Trust</h2>
                    <p className="text-xl text-blue-100 mb-6">Security is a continuous journey, not a destination. We are dedicated to consistently evaluating and improving our security posture to protect your data. We believe in transparency and partnership, and we are committed to earning and maintaining your trust every day.</p>
                    <p className="text-blue-100">For more information, please contact our support team or refer to our <a href="https://www.google.com/search?q=link-to-privacy-policy" className="text-white underline hover:text-blue-200">Privacy Policy</a>.</p>
                </div>
            </section>
        </main>

        </div>

    </div>;
} 
