content = open('mpp_frontend/src/App.js','r',encoding='utf-8').read()
old = """    } else {
      // For STL and other 3D formats"""
new = """    } else if (fileType === 'step') {
      return (
        <Canvas
          key={'step-' + key}
          shadows
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            background: '#222'
          }}
          camera={{ position: [0, 10, 15], fov: 40 }}
        >
          <Suspense fallback={
            <Html center>
              <div style={{ color: 'white', textAlign: 'center' }}>
                <div>Loading STEP viewer...</div>
              </div>
            </Html>
          }>
            <StepModel
              key={'step-viewer-' + key}
              fileUrl={fileUrl}
              brightness={brightness}
              contrast={contrast}
              gridPosition={gridPosition}
              materialColor={materialColor}
            />
          </Suspense>
        </Canvas>
      );
    } else {
      // For STL and other 3D formats"""
content = content.replace(old, new, 1)
open('mpp_frontend/src/App.js','w',encoding='utf-8').write(content)
print('Done')
