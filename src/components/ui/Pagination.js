import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from './Button';

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
        <Button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          variant="secondary"
          size="sm"
        >
          {isGerman ? 'Zurück' : 'Previous'}
        </Button>

        {/* Show page numbers */}
        {[...Array(totalPages)].map((_, i) => i + 1).map((page) => {
          // Show first page, last page, current page and pages around current page
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <Button
                key={page}
                onClick={() => goToPage(page)}
                variant={currentPage === page ? 'primary' : 'ghost'}
                size="sm"
              >
                {page}
              </Button>
            );
          }
          // Show ellipsis for gaps
          if (page === currentPage - 2 || page === currentPage + 2) {
            return <span key={page} className="px-2 text-sm" style={{ color: 'var(--theme-muted)' }}>...</span>;
          }
          return null;
        })}

        <Button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="secondary"
          size="sm"
        >
          {isGerman ? 'Weiter' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default Pagination;