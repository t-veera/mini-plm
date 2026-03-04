content = open('mpp_frontend/src/components/viewers/StepViewer.js','r',encoding='utf-8').read()
old = '''        setStatus('Parsing STEP file...');
        const result = occt.ReadStepFile(fileBuffer, null);
        console.log('STEP parse result:', JSON.stringify({
          hasResult: !!result,
          success: result?.success,
          meshCount: result?.meshes?.length,
          keys: result ? Object.keys(result) : []
        }));'''
new = '''        setStatus('Parsing STEP file...');
        console.log('STEP file size:', fileBuffer.length, 'bytes');
        console.log('STEP file starts with:', new TextDecoder().decode(fileBuffer.slice(0, 100)));
        
        const result = occt.ReadStepFile(fileBuffer);
        console.log('STEP parse full result keys:', result ? Object.keys(result) : 'null');
        console.log('STEP parse meshes:', result?.meshes?.length);
        if (result?.meshes?.length > 0) {
          const m = result.meshes[0];
          console.log('First mesh keys:', Object.keys(m));
          console.log('First mesh attributes:', m.attributes ? Object.keys(m.attributes) : 'none');
        }
        if (result?.error) console.log('STEP parse error:', result.error);'''
content = content.replace(old, new)
open('mpp_frontend/src/components/viewers/StepViewer.js','w',encoding='utf-8').write(content)
print('Done')
