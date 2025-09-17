import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../contexts/ThemeContext';

const TestComponent = () => {
  const { theme, toggleTheme, isDark, isLight, mounted } = useTheme();
  
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-dark">{isDark.toString()}</span>
      <span data-testid="is-light">{isLight.toString()}</span>
      <span data-testid="mounted">{mounted.toString()}</span>
      <button 
        data-testid="toggle-theme" 
        onClick={toggleTheme}
      >
        Toggle Theme
      </button>
    </div>
  );
};

const mockSetProperty = jest.fn();
const mockMatchMedia = jest.fn();

describe('ThemeContext', () => {
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
      value: mockMatchMedia.mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn()
      })
    });
  });

  it('should throw error when used outside provider', () => {
    const TestComponentWithoutProvider = () => {
      useTheme();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponentWithoutProvider />)).toThrow(
      'useTheme must be used within a ThemeProvider'
    );
  });

  it('should initialize with light theme by default', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('is-dark')).toHaveTextContent('false');
    expect(screen.getByTestId('is-light')).toHaveTextContent('true');
  });

  it('should initialize with dark theme when prefers-color-scheme is dark', async () => {
    mockMatchMedia.mockReturnValue({
      matches: true,
      addListener: jest.fn(),
      removeListener: jest.fn()
    });

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('should use saved theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
  });

  it('should toggle theme and save to localStorage', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    act(() => {
      fireEvent.click(screen.getByTestId('toggle-theme'));
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

    act(() => {
      fireEvent.click(screen.getByTestId('toggle-theme'));
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
  });

  it('should apply light theme CSS custom properties', async () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(mockSetProperty).toHaveBeenCalledWith('--theme-bg', '#ffffff');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-text', '#000000');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-button-bg', '#000000');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-button-text', '#ffffff');
  });

  it('should apply dark theme CSS custom properties', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(mockSetProperty).toHaveBeenCalledWith('--theme-bg', '#000000');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-text', '#ffffff');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-button-bg', '#ffffff');
    expect(mockSetProperty).toHaveBeenCalledWith('--theme-button-text', '#000000');
  });

  it('should not be mounted initially', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('mounted')).toHaveTextContent('false');
  });

  it('should ignore invalid theme values in localStorage', async () => {
    localStorage.setItem('theme', 'invalid-theme');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mounted')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
  });
});