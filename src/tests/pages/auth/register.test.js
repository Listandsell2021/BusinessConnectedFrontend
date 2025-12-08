import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import PartnerRequest from '../../../../pages/register';
import { AuthProvider } from '../../../contexts/AuthContext';
import { LanguageProvider } from '../../../contexts/LanguageContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPush = jest.fn();
useRouter.mockReturnValue({
  push: mockPush,
});

const TestWrapper = ({ children }) => (
  <LanguageProvider>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </LanguageProvider>
);

describe('Partner Request Form', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    Object.defineProperty(document, 'documentElement', {
      value: {
        style: {
          setProperty: jest.fn()
        }
      },
      writable: true
    });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn()
      })
    });
  });

  it('should render partner request form correctly', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/partner werden/i)).toBeInTheDocument();
    });

    expect(screen.getByAltText('Umzug Anbieter Vergleich')).toBeInTheDocument();
    expect(screen.getByLabelText(/vorname|first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nachname|last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rufnummer|phone number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unternehmen|company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse|address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/postleitzahl|postal code/i)).toBeInTheDocument();
  });

  it('should have back button to login page', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /zurück zur anmeldung|back to login/i })).toBeInTheDocument();
    });

    const backButton = screen.getByRole('link', { name: /zurück zur anmeldung|back to login/i });
    expect(backButton).toHaveAttribute('href', '/partner-login');
  });

  it('should display validation errors for required fields', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/vorname.*erforderlich|first name.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/nachname.*erforderlich|last name.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/e-mail.*erforderlich|email.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/telefonnummer.*erforderlich|phone number.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/unternehmen.*erforderlich|company.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/adresse.*erforderlich|address.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/postleitzahl.*erforderlich|postal code.*required/i)).toBeInTheDocument();
    });
  });

  it('should display validation error for invalid email', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });

    await user.type(emailInput, 'invalid-email');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/ungültige e-mail|invalid email/i)).toBeInTheDocument();
    });
  });

  it('should clear validation errors when user types', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i })).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/vorname|first name/i);
    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });

    // Trigger validation error
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/vorname.*erforderlich|first name.*required/i)).toBeInTheDocument();
    });

    // Clear error by typing
    await user.type(firstNameInput, 'John');

    await waitFor(() => {
      expect(screen.queryByText(/vorname.*erforderlich|first name.*required/i)).not.toBeInTheDocument();
    });
  });

  it('should fill all form fields correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/vorname|first name/i)).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText(/vorname|first name/i);
    const lastNameInput = screen.getByLabelText(/nachname|last name/i);
    const emailInput = screen.getByLabelText(/e-mail/i);
    const phoneInput = screen.getByLabelText(/rufnummer|phone number/i);
    const companyInput = screen.getByLabelText(/unternehmen|company/i);
    const addressInput = screen.getByLabelText(/adresse|address/i);
    const postalInput = screen.getByLabelText(/postleitzahl|postal code/i);

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john.doe@example.com');
    await user.type(phoneInput, '+49 30 12345678');
    await user.type(companyInput, 'Test Company GmbH');
    await user.type(addressInput, 'Teststraße 123');
    await user.type(postalInput, '10115 Berlin');

    expect(firstNameInput).toHaveValue('John');
    expect(lastNameInput).toHaveValue('Doe');
    expect(emailInput).toHaveValue('john.doe@example.com');
    expect(phoneInput).toHaveValue('+49 30 12345678');
    expect(companyInput).toHaveValue('Test Company GmbH');
    expect(addressInput).toHaveValue('Teststraße 123');
    expect(postalInput).toHaveValue('10115 Berlin');
  });

  it('should require terms and conditions checkbox', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i })).toBeInTheDocument();
    });

    // Fill all required fields except terms
    const firstNameInput = screen.getByLabelText(/vorname|first name/i);
    const lastNameInput = screen.getByLabelText(/nachname|last name/i);
    const emailInput = screen.getByLabelText(/e-mail/i);
    const phoneInput = screen.getByLabelText(/rufnummer|phone number/i);
    const companyInput = screen.getByLabelText(/unternehmen|company/i);
    const addressInput = screen.getByLabelText(/adresse|address/i);
    const postalInput = screen.getByLabelText(/postleitzahl|postal code/i);
    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john.doe@example.com');
    await user.type(phoneInput, '+49 30 12345678');
    await user.type(companyInput, 'Test Company GmbH');
    await user.type(addressInput, 'Teststraße 123');
    await user.type(postalInput, '10115 Berlin');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/datenschutzbestimmungen.*zustimmen|agree.*privacy policy/i)).toBeInTheDocument();
    });
  });

  it('should handle terms and marketing checkboxes correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/datenschutzerklärung.*agb|privacy policy.*terms/i)).toBeInTheDocument();
    });

    const termsCheckbox = screen.getByLabelText(/datenschutzerklärung.*agb|privacy policy.*terms/i);
    const marketingCheckbox = screen.getByLabelText(/marketing.*e-mails|marketing.*emails/i);

    expect(termsCheckbox).not.toBeChecked();
    expect(marketingCheckbox).not.toBeChecked();

    await user.click(termsCheckbox);
    await user.click(marketingCheckbox);

    expect(termsCheckbox).toBeChecked();
    expect(marketingCheckbox).toBeChecked();
  });

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/vorname|first name/i)).toBeInTheDocument();
    });

    // Fill all required fields
    const firstNameInput = screen.getByLabelText(/vorname|first name/i);
    const lastNameInput = screen.getByLabelText(/nachname|last name/i);
    const emailInput = screen.getByLabelText(/e-mail/i);
    const phoneInput = screen.getByLabelText(/rufnummer|phone number/i);
    const companyInput = screen.getByLabelText(/unternehmen|company/i);
    const addressInput = screen.getByLabelText(/adresse|address/i);
    const postalInput = screen.getByLabelText(/postleitzahl|postal code/i);
    const termsCheckbox = screen.getByLabelText(/datenschutzerklärung.*agb|privacy policy.*terms/i);
    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john.doe@example.com');
    await user.type(phoneInput, '+49 30 12345678');
    await user.type(companyInput, 'Test Company GmbH');
    await user.type(addressInput, 'Teststraße 123');
    await user.type(postalInput, '10115 Berlin');
    await user.click(termsCheckbox);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/wird gesendet|sending/i)).toBeInTheDocument();
    });

    expect(submitButton).toBeDisabled();
  });

  it('should display success screen after submission', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/vorname|first name/i)).toBeInTheDocument();
    });

    // Fill all required fields
    const firstNameInput = screen.getByLabelText(/vorname|first name/i);
    const lastNameInput = screen.getByLabelText(/nachname|last name/i);
    const emailInput = screen.getByLabelText(/e-mail/i);
    const phoneInput = screen.getByLabelText(/rufnummer|phone number/i);
    const companyInput = screen.getByLabelText(/unternehmen|company/i);
    const addressInput = screen.getByLabelText(/adresse|address/i);
    const postalInput = screen.getByLabelText(/postleitzahl|postal code/i);
    const termsCheckbox = screen.getByLabelText(/datenschutzerklärung.*agb|privacy policy.*terms/i);
    const submitButton = screen.getByRole('button', { name: /partner-anfrage senden|send partner request/i });

    await user.type(firstNameInput, 'John');
    await user.type(lastNameInput, 'Doe');
    await user.type(emailInput, 'john.doe@example.com');
    await user.type(phoneInput, '+49 30 12345678');
    await user.type(companyInput, 'Test Company GmbH');
    await user.type(addressInput, 'Teststraße 123');
    await user.type(postalInput, '10115 Berlin');
    await user.click(termsCheckbox);

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/anfrage gesendet|request sent/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/vielen dank|thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/automatisch weitergeleitet|redirected automatically/i)).toBeInTheDocument();
  });

  it('should contain partner benefits section', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/partner.*vorteile|partner.*benefits/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/qualifizierte leads|qualified leads/i)).toBeInTheDocument();
    expect(screen.getByText(/mehr umsatz|more revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/sofort.*updates|instant.*updates/i)).toBeInTheDocument();
    expect(screen.getByText('27K+')).toBeInTheDocument();
    expect(screen.getByText('86+')).toBeInTheDocument();
    expect(screen.getByText('4.9★')).toBeInTheDocument();
  });

  it('should contain theme toggle and language toggle', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/partner werden/i)).toBeInTheDocument();
    });

    expect(screen.getByText('🇩🇪 DE')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸 EN')).toBeInTheDocument();
  });

  it('should display SSL security information', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/ssl.*verschlüsselte|ssl.*encrypted/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/24 stunden|24 hours/i)).toBeInTheDocument();
  });

  it('should redirect to dashboard when already authenticated', () => {
    const mockAuthenticatedContext = React.createContext({
      isAuthenticated: () => true,
      loading: false
    });

    const MockAuthProvider = ({ children }) => (
      <mockAuthenticatedContext.Provider value={{
        isAuthenticated: () => true,
        loading: false
      }}>
        {children}
      </mockAuthenticatedContext.Provider>
    );

    jest.doMock('../../../contexts/AuthContext', () => ({
      useAuth: () => React.useContext(mockAuthenticatedContext)
    }));

    render(
      <LanguageProvider>
        <ThemeProvider>
          <MockAuthProvider>
            <PartnerRequest />
          </MockAuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    );

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should handle form field icons and animations', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByAltText('Umzug Anbieter Vergleich')).toBeInTheDocument();
    });

    expect(screen.getByText('👤')).toBeInTheDocument(); // First name icon
    expect(screen.getByText('📧')).toBeInTheDocument(); // Email icon
    expect(screen.getByText('📞')).toBeInTheDocument(); // Phone icon
    expect(screen.getByText('🏢')).toBeInTheDocument(); // Company icon
    expect(screen.getByText('📍')).toBeInTheDocument(); // Address icon
    expect(screen.getByText('🏙️')).toBeInTheDocument(); // City icon
  });

  it('should show proper German placeholders', async () => {
    render(
      <TestWrapper>
        <PartnerRequest />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ihr vorname/i)).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText(/ihr nachname/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ihre e-mail-adresse/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ihre telefonnummer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ihr unternehmensname/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/straße und hausnummer/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/10115 berlin/i)).toBeInTheDocument();
  });
});