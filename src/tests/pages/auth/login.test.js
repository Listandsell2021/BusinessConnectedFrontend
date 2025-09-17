import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import Login from '../../../pages/auth/login';
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

describe('Login Page', () => {
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

  it('should render login form correctly', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/business portal/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText('📋 Leadform CRM')).toBeInTheDocument();
  });

  it('should display validation errors for empty fields', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
      expect(screen.getByText(/password.*required/i)).toBeInTheDocument();
    });
  });

  it('should display validation error for invalid email', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid.*email/i)).toBeInTheDocument();
    });
  });

  it('should clear validation errors when user types', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email.*required/i)).toBeInTheDocument();
    });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText(/email.*required/i)).not.toBeInTheDocument();
    });
  });

  it('should fill form fields correctly', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should show loading state when submitting', async () => {
    const mockLogin = jest.fn(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    const MockAuthContext = React.createContext({
      login: mockLogin,
      isAuthenticated: () => false,
      loading: false
    });

    const MockAuthProvider = ({ children }) => (
      <MockAuthContext.Provider value={{
        login: mockLogin,
        isAuthenticated: () => false,
        loading: false
      }}>
        {children}
      </MockAuthContext.Provider>
    );

    jest.doMock('../../../contexts/AuthContext', () => ({
      useAuth: () => React.useContext(MockAuthContext)
    }));

    render(
      <LanguageProvider>
        <ThemeProvider>
          <MockAuthProvider>
            <Login />
          </MockAuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    fireEvent.click(submitButton);

    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('should contain theme toggle and language toggle', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/business portal/i)).toBeInTheDocument();
    });

    expect(screen.getByText('🇩🇪 DE')).toBeInTheDocument();
    expect(screen.getByText('🇺🇸 EN')).toBeInTheDocument();
  });

  it('should have link to register page', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
    });

    const registerLink = screen.getByRole('link', { name: /sign up/i });
    expect(registerLink).toHaveAttribute('href', '/auth/register');
  });

  it('should have link to forgot password', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
    });

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('should redirect to dashboard when already authenticated', () => {
    const mockAuthenticatedContext = React.createContext({
      login: jest.fn(),
      isAuthenticated: () => true,
      loading: false
    });

    const MockAuthProvider = ({ children }) => (
      <mockAuthenticatedContext.Provider value={{
        login: jest.fn(),
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
            <Login />
          </MockAuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    );

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should contain branding and statistics on desktop', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('📋 Leadform CRM')).toBeInTheDocument();
    });

    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('2.5K+')).toBeInTheDocument();
    expect(screen.getByText('150K+')).toBeInTheDocument();
    expect(screen.getByText('€8M+')).toBeInTheDocument();
  });

  it('should handle form submission with Enter key', async () => {
    render(
      <TestWrapper>
        <Login />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    });

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' });
    
    await waitFor(() => {
      expect(screen.queryByText(/email.*required/i)).not.toBeInTheDocument();
    });
  });
});