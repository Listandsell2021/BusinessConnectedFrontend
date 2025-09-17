import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = ''
}) => {
  const { isGerman } = useLanguage();
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  if (totalPages <= 1) return null;

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t ${className}`} style={{ 
      backgroundColor: 'var(--theme-bg-secondary)', 
      borderColor: 'var(--theme-border)' 
    }}>
      <div className="flex items-center space-x-2">
        <span className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          {isGerman ? 'Zeige' : 'Showing'} {startIndex + 1} - {endIndex} {isGerman ? 'von' : 'of'} {totalItems}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}`}
          style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
        >
          {isGerman ? 'Zurück' : 'Previous'}
        </button>
        
        {/* Show page numbers */}
        {[...Array(totalPages)].map((_, i) => i + 1).map((page) => {
          // Show first page, last page, current page and pages around current page
          if (
            page === 1 || 
            page === totalPages || 
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <button
                key={page}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 rounded text-sm ${
                  currentPage === page 
                    ? 'font-bold' 
                    : 'hover:opacity-75'
                }`}
                style={{ 
                  backgroundColor: currentPage === page ? 'var(--theme-button-bg)' : 'var(--theme-bg-secondary)',
                  color: currentPage === page ? 'var(--theme-button-text)' : 'var(--theme-text)'
                }}
              >
                {page}
              </button>
            );
          }
          // Show ellipsis for gaps
          if (page === currentPage - 2 || page === currentPage + 2) {
            return <span key={page} className="px-2 text-sm" style={{ color: 'var(--theme-muted)' }}>...</span>;
          }
          return null;
        })}
        
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded text-sm ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}`}
          style={{ backgroundColor: 'var(--theme-button-bg)', color: 'var(--theme-button-text)' }}
        >
          {isGerman ? 'Weiter' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Pagination;