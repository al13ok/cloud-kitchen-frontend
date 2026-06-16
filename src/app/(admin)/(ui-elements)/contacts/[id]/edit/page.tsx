'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { GroupIcon } from '@/icons';
import { contactService } from '@/services/contactService';
import { Contact } from '@/types/contact';
import ContactForm from '@/components/contacts/ContactForm';

export default function EditContactPage() {
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
        pageTitle="Edit Contact"
        description="Update the contact's information and save changes."
        icon={<GroupIcon />}
        iconBgColor="bg-blue-600"
        tips={[
          'Ensure required fields are filled in',
          'Emails should be valid addresses',
          'Phone numbers can include country codes',
        ]}
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contacts', href: '/contacts' }, { label: 'Edit' }]}
      />
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white px-5 py-7 dark:border-gray-800 dark:bg-white/[0.03] xl:px-10 xl:py-12">
        {/* Back action */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
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
          <ContactForm
            contact={contact}
            onSuccess={() => router.push(`/contacts/${id}`)}
            onCancel={() => router.push(`/contacts/${id}`)}
          />
        ) : null}
      </div>
    </div>
  );
}


