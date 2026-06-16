'use client';
import React, { useState } from "react";
import ContactForm from "@/components/contacts/ContactForm";
import ContactList from "@/components/contacts/ContactList";
import { Contact } from "@/types/contact";
import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { BoxIcon, PlusIcon, DownloadIcon, TrashBinIcon } from "@/icons";
import ContactUploadModal from "@/components/popscreen/ContactUploadModal";
import DashboardHeader from '@/components/header/DashboardHeader';
import { Users } from 'lucide-react';

export default function ContactsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);
  const [alert, setAlert] = useState<{variant: 'success'|'error'|'warning'|'info', title: string, message: string} | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleAddContact = () => {
    setEditingContact(undefined);
    setShowForm(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    const wasEditing = !!editingContact;
    setShowForm(false);
    setEditingContact(undefined);
    setRefreshKey(prev => prev + 1);
    // Show success alert
    setAlert({
      variant: 'success',
      title: wasEditing ? 'Contact updated' : 'Contact added',
      message: wasEditing ? 'The contact was updated successfully.' : 'The contact was created successfully.',
    });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingContact(undefined);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNotify = (variant: 'success'|'error'|'warning'|'info', title: string, message: string) => {
    setAlert({ variant, title, message });
    // auto hide after 3s
    setTimeout(() => setAlert(null), 3000);
  };

  // Upload handled via modal

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      const { contactService } = await import('@/services/contactService');
      await Promise.all(selectedIds.map(id => contactService.deleteContact(id)));
      handleNotify('success', 'Deleted', `Deleted ${selectedIds.length} contact(s).`);
      setSelectedIds([]);
      handleRefresh();
    } catch {
      handleNotify('error', 'Bulk delete failed', 'Some items may not have been deleted.');
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsDownloading(true);
      const { contactService } = await import('@/services/contactService');
      const { blob, filename } = await contactService.downloadSelected(selectedIds);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'contacts.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      handleNotify('error', 'Download failed', 'Could not download selected contacts.');
    } finally {
      setIsDownloading(false);
    }
  };

  // share removed per requirement

  return (
    <div>
      {/* Professional Header */}
      <div className="px-6 py-8">
        <DashboardHeader
          variant="default"
          size="lg"
          title="Contacts"
          subtitle="Manage, import, and export your contacts"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Contacts', href: '/contacts' }
          ]}
          icon={() => (
            <div className="relative">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
              </div>
            </div>
          )}
        />
      </div>
      <div className="min-h-screen rounded-2xl border border-gray-200 bg-white/80 backdrop-blur px-5 py-7 shadow-sm dark:border-gray-800 dark:bg-white/[0.04] xl:px-10 xl:py-12">
        {alert && (
          <Alert
            variant={alert.variant}
            title={alert.title}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}
        <div className="space-y-6">
          {/* Action Buttons */}
          {!showForm && (
            <div className="flex gap-2 items-center overflow-x-auto whitespace-nowrap">
              <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <Button size="sm" variant="primary" className="shrink-0 rounded-none" startIcon={<PlusIcon />} onClick={handleAddContact}>
                <span className="hidden sm:inline">Add Contact</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                startIcon={<BoxIcon />}
                className="shrink-0 rounded-none border-l-0"
                onClick={() => setIsUploadOpen(true)}
              >
                <span className="hidden sm:inline">Upload</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                startIcon={<DownloadIcon />}
                className="shrink-0 rounded-none border-l-0"
                onClick={handleDownloadSelected}
                disabled={selectedIds.length === 0 || isDownloading}
              >
                <span className="hidden sm:inline">{isDownloading ? 'Downloading...' : 'Download'}</span>
              </Button>
              </div>

              {/* Share button removed */}

              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  variant="danger"
                  startIcon={<TrashBinIcon />}
                  className="shrink-0"
                  onClick={() => setIsBulkDeleteOpen(true)}
                >
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </div>
          )}

          {/* Inline Contact Form */}
          {showForm && (
            <div className="mb-6">
              <ContactForm
                contact={editingContact}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            </div>
          )}

          {/* Contact List */}
          {!showForm && (
            <>
            <ContactList
              key={refreshKey}
              onEditContact={handleEditContact}
              onRefresh={handleRefresh}
              onNotify={handleNotify}
              onSelectionChange={setSelectedIds}
              onAddFirstContact={handleAddContact}
            />

            {/* Bulk Delete Modal */}
            {isBulkDeleteOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Delete selected contacts?</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">This will delete {selectedIds.length} contact(s). This action cannot be undone.</p>
                  <div className="mt-6 flex justify-end gap-3">
                    <Button size="sm" variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>Cancel</Button>
                    <button
                      type="button"
                      onClick={async () => { await handleBulkDelete(); setIsBulkDeleteOpen(false); }}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
          {isUploadOpen && (
            <ContactUploadModal
              isOpen={isUploadOpen}
              onClose={() => { setIsUploadOpen(false); handleRefresh(); }}
              onSuccess={(m) => handleNotify('success', 'Success', m)}
              onError={(m) => handleNotify('error', 'Error', m)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
