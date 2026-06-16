'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Contact } from '@/types/contact';
import { contactService } from '@/services/contactService';
import { toast } from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ui/table';
import Pagination from '@/components/tables/Pagination';
// import ContactCard from './ContactCard';

interface ContactListProps {
  onEditContact: (contact: Contact) => void;
  onRefresh: () => void;
  onNotify?: (variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void;
  onSelectionChange?: (ids: string[]) => void;
  onAddFirstContact?: () => void;
}

export default function ContactList({ onEditContact, onRefresh, onNotify, onSelectionChange, onAddFirstContact }: ContactListProps) {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // Removed card view; always show table
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'company' | 'type' | 'date'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'company' | 'tags'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contactPendingDelete, setContactPendingDelete] = useState<Contact | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await contactService.getContacts();
      setContacts(data);
    } catch (err) {
      setError('Failed to fetch contacts. Please try again.');
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (onSelectionChange) onSelectionChange(selectedIds);
  }, [selectedIds, onSelectionChange]);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await contactService.deleteContact(id);
      setContacts(prev => prev.filter(contact => contact._id !== id));
      onRefresh();
      if (onNotify) {
        onNotify('success', 'Contact deleted', 'The contact was deleted successfully.');
      } else {
        toast.success('Contact deleted');
      }
    } catch (err) {
      setError('Failed to delete contact. Please try again.');
      console.error('Error deleting contact:', err);
      if (onNotify) {
        onNotify('error', 'Delete failed', 'Failed to delete contact. Please try again.');
      } else {
        toast.error('Failed to delete contact');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteModal = (contact: Contact) => {
    setContactPendingDelete(contact);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (contactPendingDelete?._id) {
      await handleDelete(contactPendingDelete._id);
    }
    setIsDeleteOpen(false);
    setContactPendingDelete(null);
  };

  // copy action removed per latest requirement

  const handleVCard = async (id?: string, fullName?: string) => {
    if (!id) return;
    try {
      const { blob, filename } = await contactService.downloadVCard(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename && filename.trim().length > 0 ? filename : `${(fullName || 'contact').replace(/\s+/g, '_')}.vcf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      if (onNotify) {
        onNotify('error', 'Download failed', 'Could not download vCard.');
      } else {
        toast.error('vCard download failed');
      }
    }
  };

  const closeDeleteModal = () => {
    setIsDeleteOpen(false);
    setContactPendingDelete(null);
  };

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contact.first_name?.toLowerCase().includes(searchLower) ||
      contact.last_name?.toLowerCase().includes(searchLower) ||
      contact.company?.toLowerCase().includes(searchLower) ||
      contact.type?.toLowerCase().includes(searchLower) ||
      contact.emails?.some(email => email.toLowerCase().includes(searchLower)) ||
      contact.phones?.some(phone => phone.includes(searchTerm))
    );
  });

  const filteredAndScoped = useMemo(() => {
    if (filterBy === 'recent') {
      // Fallback to significant_date or first email time is not available
      const getDate = (c: Contact) => {
        if (c.significant_date) return new Date(c.significant_date).getTime();
        return 0;
      };
      return [...filteredContacts].sort((a, b) => getDate(b) - getDate(a));
    }
    // company/tags filters could be added later; keep same for now
    return filteredContacts;
  }, [filteredContacts, filterBy]);

  const sortedContacts = useMemo(() => {
    const arr = [...filteredAndScoped];
    arr.sort((a, b) => {
      if (sortBy === 'date') {
        const at = a.significant_date ? new Date(a.significant_date).getTime() : 0;
        const bt = b.significant_date ? new Date(b.significant_date).getTime() : 0;
        if (at < bt) return sortDir === 'asc' ? -1 : 1;
        if (at > bt) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      let aVal = '';
      let bVal = '';
      if (sortBy === 'name') {
        aVal = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        bVal = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      } else if (sortBy === 'company') {
        aVal = (a.company || '').toLowerCase();
        bVal = (b.company || '').toLowerCase();
      } else {
        aVal = (a.type || '').toLowerCase();
        bVal = (b.type || '').toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredAndScoped, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedContacts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedContacts.slice(start, start + pageSize);
  }, [sortedContacts, currentPage, pageSize]);

  const openProfile = (id?: string) => {
    if (!id) return;
    router.push(`/contacts/${id}`);
  };

  const toggleSort = (key: 'name' | 'company' | 'type' | 'date') => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pagedContacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pagedContacts.map(c => c._id!).filter(Boolean));
    }
  };

  const toggleSelectOne = (id?: string) => {
    if (!id) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
        {error}
        <button
          onClick={fetchContacts}
          className="ml-4 text-blue-800 underline hover:text-blue-900"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
              Contacts ({filteredContacts.length})
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your contact list
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, email, or phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            {/* Sort dropdown */}
            <div>
              <select
                value={`${sortBy}:${sortDir}`}
                onChange={(e) => {
                  const [by, dir] = e.target.value.split(':') as ['name'|'company'|'type'|'date', 'asc'|'desc'];
                  setSortBy(by);
                  setSortDir(dir);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="name:asc">Name (A→Z)</option>
                <option value="name:desc">Name (Z→A)</option>
                <option value="company:asc">Company (A→Z)</option>
                <option value="company:desc">Company (Z→A)</option>
                <option value="date:asc">Date (Oldest→Newest)</option>
                <option value="date:desc">Date (Newest→Oldest)</option>
              </select>
            </div>
            {/* Extra filter */}
            <div>
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as typeof filterBy)}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Contacts</option>
                <option value="recent">Recently Added</option>
                <option value="company">Company</option>
                <option value="tags">Tags</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div>
        {filteredContacts.length === 0 ? (
          <div className="text-center py-16">
            <svg className="mx-auto h-14 w-14 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">No contacts found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new contact.'}
            </p>
            {!searchTerm && (
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={onAddFirstContact}>
                  + Add Your First Contact
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
          {/* Table View */}
          <div className="overflow-x-auto">
            <Table className="divide-y divide-gray-200 dark:divide-gray-700">
              <TableHeader className="bg-gray-50 dark:bg-gray-700">
                <TableRow>
                  <TableCell isHeader className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === pagedContacts.length}
                      onChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" className="cursor-pointer" onClick={() => toggleSort('name')}>
                      Name {sortBy === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" className="cursor-pointer" onClick={() => toggleSort('company')}>
                      Company {sortBy === 'company' && (sortDir === 'asc' ? '▲' : '▼')}
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button type="button" className="cursor-pointer" onClick={() => toggleSort('type')}>
                      Type {sortBy === 'type' && (sortDir === 'asc' ? '▲' : '▼')}
                    </button>
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </TableCell>
                  <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pagedContacts.map((contact) => (
                  <tr
                    key={contact._id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => openProfile(contact._id)}
                  >
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(contact._id || '')}
                        onChange={(e) => { e.stopPropagation(); toggleSelectOne(contact._id); }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {contact._id ? (
                          <Link href={`/contacts/${contact._id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                            {contact.first_name} {contact.last_name}
                          </Link>
                        ) : (
                          <span>{contact.first_name} {contact.last_name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-white/90">
                        {contact.company || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-white/90">
                        {contact.type || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-white/90">
                        {contact.emails?.[0] || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-white/90">
                        {contact.phones?.[0] || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          startIcon={(
                            <svg
                              className="w-4 h-4"
                              viewBox="0 0 18 18"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                                fill="currentColor"
                              />
                            </svg>
                          )}
                          onClick={() => onEditContact(contact)}
                        >
                          <span className="sr-only">Edit</span>
                        </Button>
                        {/* Copy action removed */}
                        <Button
                          size="sm"
                          variant="outline"
                          startIcon={(
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z" />
                            </svg>
                          )}
                          onClick={() => handleVCard(contact._id, `${contact.first_name || ''} ${contact.last_name || ''}`)}
                        >
                          <span className="sr-only">vCard</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          startIcon={(
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                          onClick={() => openDeleteModal(contact)}
                          disabled={deletingId === contact._id}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={sortedContacts.length}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            label="contacts"
            className="mt-4"
          />
          </>
        )}
      </div>
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={closeDeleteModal} className="max-w-[520px] m-4">
        <div className="w-full rounded-3xl bg-white p-5 dark:bg-gray-900 sm:p-7">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Delete from contacts?
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {`Are you sure you want to delete ${contactPendingDelete ? (contactPendingDelete.first_name || '') + ' ' + (contactPendingDelete.last_name || '') : 'this contact'}? This action cannot be undone.`}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <Button size="sm" variant="outline" onClick={closeDeleteModal}>Cancel</Button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={!!deletingId}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {deletingId ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
