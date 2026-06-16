'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { GroupIcon } from '@/icons';
import { contactService } from '@/services/contactService';
import { Contact } from '@/types/contact';
import ContactCard from '@/components/contacts/ContactCard';

export default function ContactProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        const data = await contactService.getContact(id);
        setContact(data);
      } catch {
        setError('Failed to load contact');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchContact();
  }, [id]);

  return (
    <div>
      <PageBreadcrumb
        pageTitle="Contact Profile"
        description="View and manage this contact's details."
        icon={<GroupIcon />}
        iconBgColor="bg-blue-600"
        tips={[
          'Use the back button to return to the contacts list',
          'Click edit to update contact information',
          'Use vCard to download and share the contact',
        ]}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contacts', href: '/contacts' }, { label: 'Profile' }]}
      />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Back action */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M11.7803 3.96967C12.0732 4.26256 12.0732 4.73744 11.7803 5.03033L7.81066 9L11.7803 12.9697C12.0732 13.2626 12.0732 13.7374 11.7803 14.0303C11.4874 14.3232 11.0126 14.3232 10.7197 14.0303L6.21967 9.53033C5.92678 9.23744 5.92678 8.76256 6.21967 8.46967L10.7197 3.96967C11.0126 3.67678 11.4874 3.67678 11.7803 3.96967Z"
                fill=""
              />
            </svg>
            Back
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : contact ? (
          <ContactCard
            contact={contact}
            onEdit={() => router.push(`/contacts/${id}/edit`)}
            onDelete={() => router.push('/contacts')}
            isDeleting={false}
            initialExpanded
          />
        ) : null}
      </div>
    </div>
  );
}


