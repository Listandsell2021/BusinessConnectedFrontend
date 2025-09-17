import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThemeToggle from '../../../components/ui/ThemeToggle';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { LanguageProvider } from '../../../contexts/LanguageContext';

const TestWrapper = ({ children }) => (
  <LanguageProvider>
    <ThemeProvider>
      {children}
    </ThemeProvider>
  </LanguageProvider>
);

const mockSetProperty = jest.fn();

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    Object.defineProperty(document, 'documentElement', {
      value: {
        style: {
          setProperty: mockSetProperty
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

  it('should render loading state when not mounted', () => {
    const MockThemeContext = React.createContext({
      theme: 'light',
      toggleTheme: jest.fn(),
      isDark: false,
      isLight: true,
      mounted: false
    });

    const MockThemeProvider = ({ children }) => (
      <MockThemeContext.Provider value={{
        theme: 'light',
        toggleTheme: jest.fn(),
        isDark: false,
        isLight: true,
        mounted: false
      }}>
        {children}
      </MockThemeContext.Provider>
    );

    jest.doMock('../../../contexts/ThemeContext', () => ({
      useTheme: () => React.useContext(MockThemeContext)
    }));

    render(
      <LanguageProvider>
        <MockThemeProvider>
          <ThemeToggle />
        </MockThemeProvider>
      </LanguageProvider>
    );

    const loadingElement = screen.getByRole('button');
    expect(loadingElement).toBeInTheDocument();
  });

  it('should render light theme toggle correctly', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    
    const lightIcon = screen.getByText('☀');
    const darkIcon = screen.getByText('●');
    
    expect(lightIcon).toBeInTheDocument();
    expect(darkIcon).toBeInTheDocument();
  });

  it('should toggle theme when clicked', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    
    fireEvent.click(button);

    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should have correct accessibility attributes', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
  });

  it('should apply correct styles for light theme', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    expect(button).toHaveStyle({
      backgroundColor: 'var(--theme-bg)',
      borderColor: 'var(--theme-border)',
      color: 'var(--theme-text)'
    });
  });

  it('should show correct icon opacity for light theme', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const lightIcon = screen.getByText('☀');
    const darkIcon = screen.getByText('●');
    
    expect(lightIcon.parentElement).toHaveClass('opacity-100');
    expect(darkIcon.parentElement).toHaveClass('opacity-30');
  });

  it('should handle keyboard navigation', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    
    button.focus();
    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should handle space key press', async () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    const button = screen.getByRole('button');
    
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });
});