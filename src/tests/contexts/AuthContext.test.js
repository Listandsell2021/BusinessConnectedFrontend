import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

jest.mock('axios');
jest.mock('react-hot-toast');

const mockedAxios = axios;

const TestComponent = () => {
  const { 
    user, 
    token, 
    loading, 
    login, 
    register, 
    logout, 
    isAuthenticated,
    hasRole,
    isUser,
    isPartner,
    isSuperAdmin
  } = useAuth();
  
  return (
    <div>
      <span data-testid="user">{user ? user.username : 'null'}</span>
      <span data-testid="token">{token || 'null'}</span>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="is-authenticated">{isAuthenticated().toString()}</span>
      <span data-testid="is-user">{isUser.toString()}</span>
      <span data-testid="is-partner">{isPartner.toString()}</span>
      <span data-testid="is-superadmin">{isSuperAdmin.toString()}</span>
      <button 
        data-testid="login-btn" 
        onClick={() => login('test@example.com', 'password')}
      >
        Login
      </button>
      <button 
        data-testid="logout-btn" 
        onClick={logout}
      >
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedAxios.defaults = { headers: { common: {} } };
  });

  it('should throw error when used outside provider', () => {
    const TestComponentWithoutProvider = () => {
      useAuth();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponentWithoutProvider />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('should initialize with no user and loading false', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('is-user')).toHaveTextContent('false');
    expect(screen.getByTestId('is-partner')).toHaveTextContent('false');
    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('false');
  });

  it('should initialize with stored user and token', async () => {
    const mockUser = { id: '1', username: 'testuser', role: 'user' };
    const mockToken = 'mock-token';

    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('is-user')).toHaveTextContent('true');
  });

  it('should login successfully', async () => {
    const mockUser = { id: '1', username: 'testuser', role: 'user' };
    const mockToken = 'mock-token';

    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('token', mockToken);
    expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(mockedAxios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
    expect(toast.success).toHaveBeenCalledWith('Login successful!');
  });

  it('should handle login failure', async () => {
    const errorMessage = 'Invalid credentials';
    mockedAxios.post.mockRejectedValueOnce({
      response: { data: { message: errorMessage } }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('login-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });

    expect(toast.error).toHaveBeenCalledWith(errorMessage);
  });

  it('should logout successfully', async () => {
    const mockUser = { id: '1', username: 'testuser', role: 'user' };
    const mockToken = 'mock-token';

    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockUser));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    act(() => {
      screen.getByTestId('logout-btn').click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('token')).toHaveTextContent('null');
    expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    expect(toast.success).toHaveBeenCalledWith('Logged out successfully');
  });

  it('should register successfully', async () => {
    const mockUser = { id: '1', username: 'newuser', role: 'user' };
    const mockToken = 'new-token';

    mockedAxios.post.mockResolvedValueOnce({
      data: { user: mockUser, token: mockToken }
    });

    const TestRegisterComponent = () => {
      const { register } = useAuth();
      return (
        <button 
          data-testid="register-btn" 
          onClick={() => register({
            firstName: 'John',
            lastName: 'Doe',
            username: 'johndoe',
            email: 'john@example.com',
            password: 'password123'
          })}
        >
          Register
        </button>
      );
    };

    render(
      <AuthProvider>
        <div>
          <TestComponent />
          <TestRegisterComponent />
        </div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('register-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('newuser');
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    expect(toast.success).toHaveBeenCalledWith('Registration successful!');
  });

  it('should check roles correctly', async () => {
    const mockPartner = { id: '1', username: 'partner', role: 'partner' };
    const mockToken = 'mock-token';

    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockPartner));

    const TestRoleComponent = () => {
      const { hasRole, hasAnyRole } = useAuth();
      return (
        <div>
          <span data-testid="has-partner-role">{hasRole('partner').toString()}</span>
          <span data-testid="has-user-role">{hasRole('user').toString()}</span>
          <span data-testid="has-any-role">{hasAnyRole(['partner', 'superadmin']).toString()}</span>
        </div>
      );
    };

    render(
      <AuthProvider>
        <div>
          <TestComponent />
          <TestRoleComponent />
        </div>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('is-partner')).toHaveTextContent('true');
    expect(screen.getByTestId('is-user')).toHaveTextContent('false');
    expect(screen.getByTestId('has-partner-role')).toHaveTextContent('true');
    expect(screen.getByTestId('has-user-role')).toHaveTextContent('false');
    expect(screen.getByTestId('has-any-role')).toHaveTextContent('true');
  });

  it('should handle superadmin role correctly', async () => {
    const mockSuperAdmin = { id: '1', username: 'admin', role: 'superadmin' };
    const mockToken = 'mock-token';

    localStorage.setItem('token', mockToken);
    localStorage.setItem('user', JSON.stringify(mockSuperAdmin));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('is-superadmin')).toHaveTextContent('true');
    expect(screen.getByTestId('is-user')).toHaveTextContent('false');
    expect(screen.getByTestId('is-partner')).toHaveTextContent('false');
  });
});