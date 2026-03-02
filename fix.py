content = open('mpp_frontend/src/App.js','r',encoding='utf-8').read()
content = content.replace("overflowX: 'hidden',\n          padding: '0.75rem',\n          width: 'auto',\n          maxWidth: '60%'", "overflowX: 'auto',\n          padding: '0.75rem',\n          width: 'auto',\n          maxWidth: '60%'")
open('mpp_frontend/src/App.js','w',encoding='utf-8').write(content)
print('Done')
