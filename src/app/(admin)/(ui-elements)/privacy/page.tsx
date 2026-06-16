export default function PrivacyPolicy() {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 leading-relaxed">
            <div className="min-h-screen">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                    <div className="max-w-6xl mx-auto px-6 py-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-300"><strong>Last Updated:</strong> July 2025</p>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-6xl mx-auto px-6 py-12">
                    {/* Overview Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-3">Overview</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            This Privacy Policy describes how we, <strong>Mobiloitte</strong> (referred to as &ldquo;Mobiloitte,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;), 
                            acting as a data controller, collect, use, and share your personal information. This Privacy Policy applies to 
                            information that we collect when you visit our website, use our AI Agent development services, or interact with our platform (&ldquo;Services&rdquo;).
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            By accessing or using our Services, you agree to this Privacy Policy.
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-lg">
                            <p className="text-blue-800 dark:text-blue-200">
                                <strong>Note:</strong> This Privacy Policy does not apply to employees or job applicants (see separate Employee Privacy Notice). 
                                Our services are not intended for individuals under the age of 16. We do not knowingly collect personal information from individuals under 16.
                            </p>
                        </div>
                    </section>

                    {/* About Mobiloitte Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-3">About Mobiloitte</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                            Mobiloitte is a technology company specializing in AI development services, including AI agents, machine learning solutions, 
                            and custom software development. Our services are designed to help businesses leverage artificial intelligence for improved efficiency and innovation.
                        </p>
                    </section>

                    {/* Data Subject Categories Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-3">Data Subject Categories</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">We process personal data relating to the following categories of individuals:</p>
                        
                        <div className="overflow-x-auto mb-6">
                            <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <thead className="bg-gradient-to-r from-blue-600 to-purple-600">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                            Category
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                            Description
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                            Data Processing Purpose
                                        </th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
                                            Legal Basis
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Platform Users</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Individuals using our AI development services and platform</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Service delivery, account management, platform optimization</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Contract performance, Legitimate interests</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Website Visitors</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Individuals browsing our website and services</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Website analytics, user experience improvement</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Consent, Legitimate interests</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Marketing Contacts</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Individuals who have subscribed to our communications</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Marketing campaigns, product updates, newsletters</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Consent</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Customer Contacts</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Business contacts at client organizations</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Client relationship management, service delivery</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Contract performance, Legitimate interests</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">AI Development Clients</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Organizations using our AI development services</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Project management, technical support, service delivery</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Contract performance</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">Vendors and Partners</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Contacts at supplier and partner organizations</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Business partnerships, service procurement</td>
                                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">Legitimate interests</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-lg">
                            <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">Data Processing Principles</h3>
                            <p className="text-blue-800 dark:text-blue-200 text-sm mb-3">We adhere to the following principles in all our data processing activities:</p>
                            <ul className="list-disc list-inside text-blue-800 dark:text-blue-200 text-sm space-y-1">
                                <li><strong>Lawfulness:</strong> All processing is based on valid legal grounds</li>
                                <li><strong>Fairness:</strong> Processing is transparent and non-discriminatory</li>
                                <li><strong>Transparency:</strong> Clear information about how data is used</li>
                                <li><strong>Purpose Limitation:</strong> Data is collected for specified, legitimate purposes</li>
                                <li><strong>Data Minimization:</strong> Only necessary data is collected and processed</li>
                                <li><strong>Accuracy:</strong> Data is kept accurate and up-to-date</li>
                                <li><strong>Storage Limitation:</strong> Data is retained only as long as necessary</li>
                                <li><strong>Security:</strong> Appropriate technical and organizational measures are implemented</li>
                            </ul>
                        </div>
                    </section>

                    {/* Your Rights Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-3">Your Rights Under Applicable Law</h2>
                        
                        <div className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">European Data Privacy Rights (GDPR)</h3>
                                <p className="text-blue-800 dark:text-blue-200 mb-4">If you are a resident of the European Economic Area (&ldquo;EEA&rdquo;), the United Kingdom (&ldquo;UK&rdquo;), or Switzerland, you are entitled to:</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Right of Access</h4>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm">Request information about personal data we hold</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Right to Rectification</h4>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm">Correct inaccurate or incomplete information</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Right to Erasure</h4>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm">Request deletion of personal data in certain circumstances</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Right to Data Portability</h4>
                                        <p className="text-gray-600 dark:text-gray-300 text-sm">Receive your data in a structured format</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                                <h3 className="text-lg font-medium text-green-900 dark:text-green-100 mb-4">U.S. State Privacy Rights</h3>
                                <p className="text-green-800 dark:text-green-200 mb-4">Residents of states with data protection laws may have additional rights including:</p>
                                <ul className="list-disc list-inside text-green-800 dark:text-green-200 space-y-2">
                                    <li>Right to know what personal information we collect</li>
                                    <li>Right to access and delete personal information</li>
                                    <li>Right to opt-out of certain data sharing</li>
                                    <li>Right to correct inaccurate information</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Contact Section */}
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-600 pb-3">Contact Information</h2>
                        <p className="text-gray-700 dark:text-gray-300 mb-6">If you have any questions about our privacy practices or wish to exercise your data protection rights, please contact us at:</p>
                        
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                            <div className="space-y-2">
                                <p className="text-gray-900 dark:text-white font-medium">Converiqo.ai</p>
                                <p className="text-gray-700 dark:text-gray-300">Powered by Mobiloitte Group</p>
                                <p className="text-gray-700 dark:text-gray-300">Alharith Hafiz</p>
                                <p className="text-gray-700 dark:text-gray-300">Email: <a href="mailto:connect@mobiloitte.ae" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline">connect@mobiloitte.ae</a></p>
                                <p className="text-gray-700 dark:text-gray-300">MOBILOITTE AI IT SOLUTIONS LLC</p>
                                <p className="text-gray-700 dark:text-gray-300">Trade License No: 1465972</p>
                                <p className="text-gray-700 dark:text-gray-300">AL DANA CENTRE, Plot No. 702-0, Al Muraqabat, Dubai, UAE</p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}
