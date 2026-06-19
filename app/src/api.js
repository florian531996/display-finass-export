const BASE = '/api';

async function get(path) {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  searchCustomers: (search = '') =>
    get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id) => get(`/customers/${id}`),
  getCustomerContracts: (id) => get(`/customers/${id}/contracts`),
  getCustomerContacts: (id) => get(`/customers/${id}/contacts`),
  getContract: (id) => get(`/contracts/${id}`),
  getContractDocuments: (id) => get(`/contracts/${id}/documents`),
  getCustomerDocuments: (id) => get(`/customers/${id}/documents`),
  getParsedEmail: (id) => get(`/documents/${id}/parsed`),
};
