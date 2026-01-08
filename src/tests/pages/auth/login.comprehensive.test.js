import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/router';
import Login from '../../../../pages/login';
import { AuthProvider, useAuth } from '../../../contexts/AuthContext';
import { LanguageProvider, useLanguage } from '../../../contexts/LanguageContext';
import { ThemeProvider } from '../../../contexts/ThemeContext';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockReplace = jest.fn();
useRouter.mockReturnValue({
  push: mockPush,
  replace: mockReplace,
  query: {},
});

// Test wrapper with all required providers
const TestWrapper = ({ language = 'de', children }) => {
  // Mock localStorage for theme and language
  const mockLocalStorage = {
    getItem: jest.fn((key) => {
      if (key === 'language') return language;
      if (key === 'theme') return 'dark';
      return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  };
  
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
  });

  return (
    <LanguageProvider>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
};

describe('Login Page - Comprehensive Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch.mockClear();
    
    // Mock DOM methods
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
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('German Language Interface', () => {
    it('should display German text when language is set to German', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByAltText('Business Connected')).toBeInTheDocument();
        expect(screen.getByText('Professional Edition')).toBeInTheDocument();
        expect(screen.getByText('Business Portal')).toBeInTheDocument();
        expect(screen.getByText('Anmelden')).toBeInTheDocument(); // Login button
        expect(screen.getByPlaceholderText('E-Mail eingeben')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Passwort eingeben')).toBeInTheDocument();
      });
    });

    it('should show German error messages for invalid credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'invalid@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ungültige Anmeldedaten')).toBeInTheDocument();
      });
    });

    it('should show German validation messages for empty fields', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const loginButton = screen.getByText('Anmelden');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
        expect(screen.getByText('Passwort ist erforderlich')).toBeInTheDocument();
      });
    });
  });

  describe('English Language Interface', () => {
    it('should display English text when language is set to English', async () => {
      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByAltText('Business Connected')).toBeInTheDocument();
        expect(screen.getByText('Professional Edition')).toBeInTheDocument();
        expect(screen.getByText('Business Portal')).toBeInTheDocument();
        expect(screen.getByText('Sign In')).toBeInTheDocument(); // Login button
        expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      });
    });

    it('should show English error messages for invalid credentials', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid credentials' }),
      });

      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const loginButton = screen.getByText('Sign In');

        await user.type(emailInput, 'invalid@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should show English validation messages for empty fields', async () => {
      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const loginButton = screen.getByText('Sign In');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
        expect(screen.getByText('Password is required')).toBeInTheDocument();
      });
    });
  });

  describe('Superadmin Login Scenarios', () => {
    it('should successfully login superadmin and redirect to dashboard', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: 'superadmin123',
            name: 'Super Admin',
            email: 'superadmin@leadform.com',
            role: 'superadmin'
          },
          tokens: {
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token'
          }
        }),
      });

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'superadmin@leadform.com');
        await user.type(passwordInput, 'SecurePass123!');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'superadmin@leadform.com',
          password: 'SecurePass123!'
        }),
      });
    });

    it('should handle superadmin login with inactive account (German)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Account is not active' }),
      });

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'inactive@leadform.com');
        await user.type(passwordInput, 'SecurePass123!');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Konto ist nicht aktiv')).toBeInTheDocument();
      });
    });
  });

  describe('Partner Login Scenarios', () => {
    it('should successfully login partner and redirect to dashboard', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          user: {
            id: 'partner123',
            name: 'Umzug Berlin GmbH',
            email: 'hans@umzug-berlin.de',
            role: 'partner'
          },
          tokens: {
            accessToken: 'mock-partner-access-token',
            refreshToken: 'mock-partner-refresh-token'
          }
        }),
      });

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'hans@umzug-berlin.de');
        await user.type(passwordInput, 'PartnerPass456!');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should handle partner login with pending status (English)', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Account is not active' }),
      });

      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const loginButton = screen.getByText('Sign In');

        await user.type(emailInput, 'pending@partner.de');
        await user.type(passwordInput, 'PartnerPass456!');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Account is not active')).toBeInTheDocument();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility when eye icon is clicked', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
      const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');

      // Click to hide password again
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should show correct eye icons based on password visibility state', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      const toggleButton = screen.getByRole('button', { name: '' });
      
      // Check for eye icon (password hidden)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
      
      // Click to show password
      await user.click(toggleButton);
      
      // Icon should change to eye-slash (password visible)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate email format in German', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'invalid-email');
        await user.type(passwordInput, 'validpassword');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Ungültige E-Mail-Adresse')).toBeInTheDocument();
      });
    });

    it('should validate email format in English', async () => {
      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('Enter your email');
        const passwordInput = screen.getByPlaceholderText('Enter your password');
        const loginButton = screen.getByText('Sign In');

        await user.type(emailInput, 'invalid-email');
        await user.type(passwordInput, 'validpassword');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });
  });

  describe('Security Features', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Anmeldung fehlgeschlagen')).toBeInTheDocument();
      });
    });

    it('should prevent multiple simultaneous login attempts', async () => {
      global.fetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, tokens: { accessToken: 'token' } })
        }), 1000);
      }));

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
      const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
      const loginButton = screen.getByText('Anmelden');

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Click login button multiple times rapidly
      await user.click(loginButton);
      await user.click(loginButton);
      await user.click(loginButton);

      // Should show loading state and disable button
      await waitFor(() => {
        expect(screen.getByText('Wird angemeldet...')).toBeInTheDocument();
        expect(loginButton).toBeDisabled();
      });

      // Should only make one API call
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Theme Integration', () => {
    it('should work properly in both dark and light themes', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <Login />
          </TestWrapper>
        );
      });

      // Theme toggle should be present
      const themeToggle = screen.getByRole('button', { 
        name: /toggle theme/i 
      });
      expect(themeToggle).toBeInTheDocument();

      // Language toggle should be present
      const languageToggle = screen.getByRole('button', { 
        name: /toggle language/i 
      });
      expect(languageToggle).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and form associations', async () => {
      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      // Form inputs should have proper labels
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Form should have proper semantics
      const form = screen.getByRole('form', { name: /login/i });
      expect(form).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      await act(async () => {
        render(
          <TestWrapper language="en">
            <Login />
          </TestWrapper>
        );
      });

      const emailInput = screen.getByPlaceholderText('Enter your email');
      const passwordInput = screen.getByPlaceholderText('Enter your password');
      const loginButton = screen.getByText('Sign In');

      // Tab navigation should work
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(passwordInput).toHaveFocus();

      await user.keyboard('{Tab}');
      // Skip the password toggle button
      await user.keyboard('{Tab}');
      expect(loginButton).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when user starts typing', async () => {
      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      // Trigger validation error
      const loginButton = screen.getByText('Anmelden');
      await user.click(loginButton);

      await waitFor(() => {
        expect(screen.getByText('E-Mail ist erforderlich')).toBeInTheDocument();
      });

      // Start typing in email field
      const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText('E-Mail ist erforderlich')).not.toBeInTheDocument();
      });
    });

    it('should handle 500 server errors with appropriate messages', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      await act(async () => {
        render(
          <TestWrapper language="de">
            <Login />
          </TestWrapper>
        );
      });

      await waitFor(async () => {
        const emailInput = screen.getByPlaceholderText('E-Mail eingeben');
        const passwordInput = screen.getByPlaceholderText('Passwort eingeben');
        const loginButton = screen.getByText('Anmelden');

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(loginButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Anmeldung fehlgeschlagen')).toBeInTheDocument();
      });
    });
  });
});