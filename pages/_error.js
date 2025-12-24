function CustomError({ statusCode }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#f5f5f5' }}
    >
      <div className="text-center">
        <div className="text-8xl font-bold mb-6" style={{ color: '#333' }}>
          {statusCode || '500'}
        </div>

        <h1 className="text-4xl font-bold mb-4" style={{ color: '#333' }}>
          {statusCode === 404 ? 'Page Not Found' : 'Error'}
        </h1>

        <p className="text-lg" style={{ color: '#666' }}>
          {statusCode === 404
            ? 'The page you are looking for does not exist.'
            : 'An error occurred.'}
        </p>
      </div>
    </div>
  );
}

CustomError.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default CustomError;
