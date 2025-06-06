import React from 'react';

function App() {
  const testFunction = () => {
    console.log('🔥 TEST FUNCTION CALLED!');
    alert('Button clicked!');
  };

  return (
    <div style={{ padding: '50px' }}>
      <h1>SUPER NEW TEST APP 172843</h1>
      
      <button 
        onClick={testFunction}
        style={{
          background: 'red',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          border: 'none',
          margin: '10px'
        }}
      >
        Click Me - Test 1
      </button>

      <button 
        onClick={() => console.log('🔥 INLINE FUNCTION WORKS!')}
        style={{
          background: 'blue',
          color: 'white',
          padding: '20px',
          fontSize: '20px',
          border: 'none',
          margin: '10px'
        }}
      >
        Click Me - Test 2
      </button>

      <div
        onClick={() => console.log('🔥 DIV CLICK WORKS!')}
        style={{
          background: 'green',
          color: 'white',
          padding: '20px',
          cursor: 'pointer',
          margin: '10px'
        }}
      >
        Click Me - Test 3 (Div)
      </div>

      <input 
        type="file" 
        onChange={() => console.log('🔥 FILE INPUT WORKS!')}
        style={{ margin: '10px' }}
      />
    </div>
  );
}

export default App;
// Force rebuild 06/06/2025 16:46:21
