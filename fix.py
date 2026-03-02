content = open('mpp_frontend/src/App.js','r',encoding='utf-8').read()
old = "maxWidth: '100%', overflow: 'hidden'"
new = "maxWidth: '100%', overflow: 'auto'"
content = content.replace(old, new, 1)
open('mpp_frontend/src/App.js','w',encoding='utf-8').write(content)
print('Done')
