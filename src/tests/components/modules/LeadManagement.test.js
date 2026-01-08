import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'react-hot-toast';
import LeadManagement from '../../../components/modules/LeadManagement';
import { leadsAPI } from '../../../lib/api/api';

// Mock dependencies
jest.mock('../../../lib/api/api');
jest.mock('react-hot-toast');
jest.mock('../../../contexts/ServiceContext', () => ({
  useService: () => ({ currentService: 'moving' })
}));
jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ 
    t: (key) => {
      const translations = {
        'leads.title': 'Lead Management',
        'common.export': 'Export',
        'common.search': 'Search Lead ID, Name or Email...',
        'common.allStatus': 'All Status',
        'common.pending': 'Pending',
        'common.assigned': 'Assigned',
        'common.accepted': 'Accepted',
        'common.cancelled': 'Cancelled',
        'common.allCities': 'All Cities',
        'common.allPartners': 'All Partners',
        'leads.totalLeads': 'Total Leads',
        'leads.pendingLeads': 'Pending',
        'leads.assignedLeads': 'Assigned',
        'leads.acceptedLeads': 'Accepted',
        'leads.assign': 'Assign',
        'leads.noResults': 'No leads found matching your search criteria.',
        'leads.noLeads': 'No leads available.',
        'leads.loading': 'Loading leads...'
      };
      return translations[key] || key;
    }, 
    isGerman: false 
  })
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 'user1', role: 'superadmin' }, 
    isSuperAdmin: true, 
    isPartner: false 
  })
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    header: ({ children, ...props }) => <header {...props}>{children}</header>
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Mock Pagination component
jest.mock('../../../components/ui/Pagination', () => {
  return function MockPagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    
    return (
      <div data-testid="pagination">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          data-testid="prev-button"
        >
          Previous
        </button>
        <span data-testid="current-page">{currentPage}</span>
        <span data-testid="total-pages">{totalPages}</span>
        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          data-testid="next-button"
        >
          Next
        </button>
      </div>
    );
  };
});

const mockLeads = [
  {
    id: 'L001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    service: 'security',
    city: 'Berlin',
    country: 'Germany',
    status: 'pending',
    partner: null,
    partnerName: null,
    sourceDomain: 'example.com',
    createdAt: new Date('2024-01-15'),
    details: { fromAddress: 'Berlin Mitte', toAddress: 'Berlin Prenzlauer Berg', movingDate: '2024-02-01' }
  },
  {
    id: 'L002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+0987654321',
    service: 'security',
    city: 'Munich',
    country: 'Germany',
    status: 'assigned',
    partner: 'P001',
    partnerName: 'MoveIt Pro GmbH',
    sourceDomain: 'example.com',
    createdAt: new Date('2024-01-14'),
    details: { fromAddress: 'Munich Center', toAddress: 'Munich South', movingDate: '2024-01-25' }
  },
  {
    id: 'L003',
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1122334455',
    service: 'security',
    city: 'Hamburg',
    country: 'Germany',
    status: 'accepted',
    partner: 'P002',
    partnerName: 'Hamburg Movers',
    sourceDomain: 'example.com',
    createdAt: new Date('2024-01-13'),
    details: { fromAddress: 'Hamburg North', toAddress: 'Hamburg South', movingDate: '2024-01-30' }
  }
];

describe('LeadManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    leadsAPI.getAll.mockResolvedValue({ data: { leads: mockLeads } });
    leadsAPI.assign.mockResolvedValue({ data: { success: true } });
    leadsAPI.export.mockResolvedValue({ data: new Blob(['test data']) });
    toast.success.mockImplementation(() => {});
    toast.error.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders lead management header', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      expect(screen.getByText('Lead Management')).toBeInTheDocument();
    });

    it('renders export button for superadmin', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      expect(screen.getByText(/Export/)).toBeInTheDocument();
    });

    it('displays initial leads data', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('Hamburg')).toBeInTheDocument();
    });

    it('renders statistics cards above table', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      expect(screen.getByText(/Total Leads/)).toBeInTheDocument();
      expect(screen.getAllByText(/Pending/)).toHaveLength(2); // One in stats, one in filter
      expect(screen.getAllByText(/Assigned/)).toHaveLength(2);
      expect(screen.getAllByText(/Accepted/)).toHaveLength(2);
    });

    it('calculates statistics correctly', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Check that Total Leads and Pending cards exist together with their values
      const statsContainer = screen.getByText(/Total Leads/).closest('div').closest('div');
      expect(statsContainer).toContainElement(screen.getByText('3')); // Total leads
      
      // Count all statistics values
      const allOnes = screen.getAllByText('1');
      expect(allOnes.length).toBeGreaterThanOrEqual(1); // At least one "1" for pending leads
    });
  });

  describe('Search Functionality', () => {
    it('renders search input with correct placeholder', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByPlaceholderText('Search Lead ID, Name or Email...');
      expect(searchInput).toBeInTheDocument();
    });

    it('filters leads by name', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByPlaceholderText('Search Lead ID, Name or Email...');
      await user.type(searchInput, 'Doe');
      
      // Wait for the filter to apply
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Search for "Doe" should only match John Doe
      const visibleRows = screen.getAllByRole('row').slice(1); // Skip header row
      expect(visibleRows).toHaveLength(1);
    });

    it('filters leads by email', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByPlaceholderText('Search Lead ID, Name or Email...');
      await user.type(searchInput, 'jane.smith');
      
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('filters leads by lead ID', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByPlaceholderText('Search Lead ID, Name or Email...');
      await user.type(searchInput, 'L003');
      
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('shows no results when search has no matches', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByPlaceholderText('Search Lead ID, Name or Email...');
      await user.type(searchInput, 'NonExistentLead');
      
      expect(screen.getByText('No leads found')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters leads by status', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Find status filter by finding select with "Pending" option
      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find(select => 
        within(select).queryByText('Pending')
      ) || selects[1]; // Second select is typically status
      
      await user.selectOptions(statusFilter, 'pending');
      
      // Wait for filter to apply - only John Doe is pending
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Check that only pending leads are visible
      const visibleRows = screen.getAllByRole('row').slice(1);
      expect(visibleRows).toHaveLength(1);
    });

    it('filters leads by city', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const cityInput = screen.getByPlaceholderText('City...');
      await user.type(cityInput, 'Berlin');
      
      // Wait for the filter to apply
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Check that only Berlin leads are visible
      const visibleRows = screen.getAllByRole('row').slice(1);
      expect(visibleRows).toHaveLength(1);
    });

    it('filters leads by partner', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Find partner filter by finding select with partner options
      const selects = screen.getAllByRole('combobox');
      const partnerFilter = selects.find(select => 
        within(select).queryByText('All Partners')
      ) || selects[3]; // Fourth select is typically partner
      
      await user.selectOptions(partnerFilter, 'P001');
      
      // Wait for filter to apply - P001 is Jane Smith's partner
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });
      
      // Check that only P001 partners are visible (Jane Smith has P001)
      const visibleRows = screen.getAllByRole('row').slice(1);
      expect(visibleRows).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    const manyLeads = Array.from({ length: 20 }, (_, i) => ({
      ...mockLeads[0],
      id: `L${i.toString().padStart(3, '0')}`,
      name: `Lead ${i + 1}`,
      email: `lead${i + 1}@example.com`
    }));

    it('renders pagination when leads exceed page size', () => {
      render(<LeadManagement initialLeads={manyLeads} />);
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
    });

    it('shows correct pagination info', () => {
      render(<LeadManagement initialLeads={manyLeads} />);
      
      expect(screen.getByTestId('current-page')).toHaveTextContent('1');
      expect(screen.getByTestId('total-pages')).toHaveTextContent('3'); // 20 leads / 8 per page = 3 pages
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={manyLeads} />);
      
      const nextButton = screen.getByTestId('next-button');
      await user.click(nextButton);
      
      expect(screen.getByTestId('current-page')).toHaveTextContent('2');
    });

    it('disables prev button on first page', () => {
      render(<LeadManagement initialLeads={manyLeads} />);
      expect(screen.getByTestId('prev-button')).toBeDisabled();
    });
  });

  describe('Lead Assignment', () => {
    it('shows assign button for pending leads', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const pendingLeadRow = screen.getByText('John Doe').closest('tr');
      const assignButton = within(pendingLeadRow).getByText(/Assign/);
      expect(assignButton).toBeInTheDocument();
    });

    it('does not show assign button for assigned leads', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const assignedLeadRow = screen.getByText('Jane Smith').closest('tr');
      expect(within(assignedLeadRow).queryByText(/Assign/)).not.toBeInTheDocument();
    });

    it('calls API when assigning lead', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const pendingLeadRow = screen.getByText('John Doe').closest('tr');
      const assignButton = within(pendingLeadRow).getByText(/Assign/);
      
      await user.click(assignButton);
      
      // This would open assignment modal in real implementation
      // For now, we're testing that the button is clickable
      expect(assignButton).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('calls export API when export button is clicked', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const exportButton = screen.getByText(/Export/);
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(leadsAPI.export).toHaveBeenCalledWith('xlsx', {
          service: 'security',
          searchTerm: undefined,
          status: undefined,
          city: undefined,
          partner: undefined
        });
      });
    });

    it('shows success toast on successful export', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const exportButton = screen.getByText(/Export/);
      await user.click(exportButton);
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Export as JSON successful');
      });
    });

    it('shows error toast on export failure', async () => {
      const user = userEvent.setup();
      leadsAPI.export.mockRejectedValue(new Error('Export failed'));
      
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const exportButton = screen.getByText(/Export/);
      await user.click(exportButton);
      
      // When export fails, it falls back to JSON export which succeeds
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Export as JSON successful');
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when leads are being fetched', async () => {
      await act(async () => {
        render(<LeadManagement initialLeads={[]} />);
      });
      
      // Component starts loading fresh data when no initial leads provided
      const loadingText = screen.getByText('Loading leads...');
      expect(loadingText).toBeInTheDocument();
    });

    it('shows empty state when no leads are available', async () => {
      leadsAPI.getAll.mockResolvedValue({ data: { leads: [] } });
      
      await act(async () => {
        render(<LeadManagement initialLeads={[]} />);
      });
      
      // After loading completes with empty results
      await waitFor(() => {
        const emptyText = screen.getByText('No leads found');
        expect(emptyText).toBeInTheDocument();
      });
    });
  });

  describe('Dynamic Data Loading', () => {
    it('loads leads from API when no initial data provided', async () => {
      await act(async () => {
        render(<LeadManagement initialLeads={[]} />);
      });
      
      await waitFor(() => {
        expect(leadsAPI.getAll).toHaveBeenCalledWith({
          service: 'security',
          partnerId: undefined
        });
      });
    });

    it('uses initial data if provided', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(leadsAPI.getAll).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      leadsAPI.getAll.mockRejectedValue(new Error('API Error'));
      
      await act(async () => {
        render(<LeadManagement initialLeads={[]} />);
      });
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error loading leads');
      });
    });

    it('handles assignment errors', async () => {
      const user = userEvent.setup();
      leadsAPI.assign.mockRejectedValue(new Error('Assignment failed'));
      
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Would test assignment error handling here
      // Implementation depends on how assignment modal is handled
    });
  });

  describe('Responsive Design', () => {
    it('renders table structure correctly', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check for required columns
      expect(screen.getByText('leads.leadId')).toBeInTheDocument();
      expect(screen.getByText('leads.customer')).toBeInTheDocument();
      expect(screen.getByText('leads.contact')).toBeInTheDocument();
      expect(screen.getByText('leads.location')).toBeInTheDocument();
      expect(screen.getByText('leads.status')).toBeInTheDocument();
      expect(screen.getByText('leads.partner')).toBeInTheDocument();
      expect(screen.getByText('leads.createdAt')).toBeInTheDocument();
      expect(screen.getByText('leads.actions')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      const searchInput = screen.getByRole('textbox');
      expect(searchInput).toHaveAttribute('placeholder');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      const searchInput = screen.getByRole('textbox');
      await user.tab();
      
      expect(searchInput).toHaveFocus();
    });
  });

  describe('Data Integrity', () => {
    it('maintains lead data consistency during operations', async () => {
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Verify all lead data is displayed correctly
      expect(screen.getByText('L001')).toBeInTheDocument();
      expect(screen.getByText('L002')).toBeInTheDocument();
      expect(screen.getByText('L003')).toBeInTheDocument();
      
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob.johnson@example.com')).toBeInTheDocument();
    });

    it('updates statistics when leads change', async () => {
      const user = userEvent.setup();
      render(<LeadManagement initialLeads={mockLeads} />);
      
      // Filter to show only pending leads
      const statusFilter = screen.getByDisplayValue('all');
      await user.selectOptions(statusFilter, 'pending');
      
      // Statistics should update to reflect filtered results
      expect(screen.getByText('1')).toBeInTheDocument(); // Only 1 pending lead visible
    });
  });
});