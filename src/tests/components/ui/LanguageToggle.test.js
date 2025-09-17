import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageToggle from '../../../components/ui/LanguageToggle';
import { LanguageProvider } from '../../../contexts/LanguageContext';

const TestWrapper = ({ children }) => (
  <LanguageProvider>
    {children}
  </LanguageProvider>
);

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'navigator', {
      value: { language: 'en-US' },
      writable: true
    });
  });

  it('should render both language buttons', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');
    const enButton = screen.getByText('🇺🇸 EN');

    expect(deButton).toBeInTheDocument();
    expect(enButton).toBeInTheDocument();
  });

  it('should highlight English button by default when browser is English', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');
    const enButton = screen.getByText('🇺🇸 EN');

    expect(enButton).toHaveStyle({
      backgroundColor: 'var(--theme-button-bg)',
      color: 'var(--theme-button-text)'
    });

    expect(deButton).toHaveStyle({
      backgroundColor: 'var(--theme-bg-secondary)',
      color: 'var(--theme-muted)'
    });
  });

  it('should highlight German button when German is selected', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'de-DE' },
      writable: true
    });

    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');
    const enButton = screen.getByText('🇺🇸 EN');

    expect(deButton).toHaveStyle({
      backgroundColor: 'var(--theme-button-bg)',
      color: 'var(--theme-button-text)'
    });

    expect(enButton).toHaveStyle({
      backgroundColor: 'var(--theme-bg-secondary)',
      color: 'var(--theme-muted)'
    });
  });

  it('should change to German when DE button is clicked', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');

    fireEvent.click(deButton);

    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'de');
  });

  it('should change to English when EN button is clicked', () => {
    localStorage.setItem('language', 'de');

    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const enButton = screen.getByText('🇺🇸 EN');

    fireEvent.click(enButton);

    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'en');
  });

  it('should have correct button styling classes', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');
    const enButton = screen.getByText('🇺🇸 EN');

    expect(deButton).toHaveClass(
      'px-3', 'py-1.5', 'text-sm', 'font-medium', 'rounded-md', 
      'transition-colors', 'duration-200', 'focus:outline-none'
    );

    expect(enButton).toHaveClass(
      'px-3', 'py-1.5', 'text-sm', 'font-medium', 'rounded-md', 
      'transition-colors', 'duration-200', 'focus:outline-none'
    );
  });

  it('should handle keyboard navigation', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');
    const enButton = screen.getByText('🇺🇸 EN');

    deButton.focus();
    expect(deButton).toHaveFocus();

    fireEvent.keyDown(deButton, { key: 'Tab' });
    
    enButton.focus();
    expect(enButton).toHaveFocus();
  });

  it('should trigger language change on Enter key press', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');

    fireEvent.keyDown(deButton, { key: 'Enter' });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'de');
  });

  it('should trigger language change on Space key press', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const deButton = screen.getByText('🇩🇪 DE');

    fireEvent.keyDown(deButton, { key: ' ' });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'de');
  });

  it('should be accessible with proper button roles', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    buttons.forEach(button => {
      expect(button).toHaveAttribute('tabIndex', '0');
    });
  });

  it('should maintain proper flexbox layout', () => {
    render(
      <TestWrapper>
        <LanguageToggle />
      </TestWrapper>
    );

    const container = screen.getByText('🇩🇪 DE').parentElement;
    expect(container).toHaveClass('flex', 'items-center', 'space-x-1');
  });
});