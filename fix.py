content = open('mpp_frontend/src/components/viewers/StepViewer.js','r',encoding='utf-8').read()
old = "        // Initialize OpenCascade WASM\n        const occt = await occtimportjs();"
new = """        // Initialize OpenCascade WASM
        const occt = await occtimportjs({
          locateFile: (name) => {
            if (name.endsWith('.wasm')) {
              return '/occt-import-js.wasm';
            }
            return name;
          }
        });"""
content = content.replace(old, new)
open('mpp_frontend/src/components/viewers/StepViewer.js','w',encoding='utf-8').write(content)
print('Done')
